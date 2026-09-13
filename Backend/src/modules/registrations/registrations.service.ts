import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { randomBytes } from 'crypto';
import { Model, Types } from 'mongoose';
import { googleClientId, verifyGoogleCredential } from '../../common/utils/google-identity';
import { Training } from '../trainings/entities/training.entity';
import { Registration, RegistrationDocument } from './entities/registration.entity';
import { CreateRegistrationDto } from './dto/create-registration.dto';
import { ClaimPaymentDto } from './dto/claim-payment.dto';
import { CrmService } from '../crm/crm.service';
import { PaynowService } from '../paynow/paynow.service';

@Injectable()
export class RegistrationsService {
  private readonly logger = new Logger(RegistrationsService.name);

  constructor(
    @InjectModel(Registration.name)
    private readonly model: Model<RegistrationDocument>,
    @InjectModel(Training.name)
    private readonly trainingModel: Model<Training>,
    private readonly configService: ConfigService,
    private readonly crmService: CrmService,
    private readonly paynow: PaynowService,
  ) {}

  findForAdmin() {
    return this.model.find().sort({ createdAt: -1 }).exec();
  }

  /**
   * Who a public enrolment is actually from.
   *
   * The form used to take whatever address was typed into it, which meant
   * anyone could reserve a place — and receive whatever follows it — under
   * anyone's email. The address now comes out of a Google ID token verified
   * server-side (common/utils/google-identity.ts) and is never read from the
   * body: `dto.email` is not consulted at all on a deployment that has sign-in
   * configured. The name still is, because the form lets people correct it and
   * a display name is not an identity claim.
   *
   * The one fork, and it is deliberate rather than a gap: GOOGLE_CLIENT_ID may
   * still be the .env.example placeholder, and Frontend-vite's
   * <GoogleSignInButton> renders nothing at all in that case
   * (`googleSignInConfigured`). Demanding a credential there would leave such a
   * deployment unable to take a single registration, so it keeps the typed
   * address it always accepted — no weaker than before this change, and every
   * row it writes is marked by a null `googleSub`. It is not a way around the
   * check either: the moment a real client id is configured, a missing or
   * invalid credential is a 400 and a typed address is ignored outright. The
   * switch is server-side config, which no request can influence.
   */
  private async identify(
    dto: CreateRegistrationDto,
  ): Promise<{ googleSub: string | null; email: string; name: string }> {
    const clientId = googleClientId(this.configService);

    if (!clientId) {
      if (!dto.email) {
        throw new BadRequestException('Please enter your email address.');
      }
      return { googleSub: null, email: dto.email, name: dto.name };
    }

    if (!dto.credential) {
      throw new BadRequestException('Please sign in with Google to reserve your place.');
    }

    // Verified only: this address becomes the booking's identity and the key
    // the CRM merges the person's history onto, so an address the account
    // holder has never proved they own must not open either.
    const identity = await verifyGoogleCredential(clientId, dto.credential, {
      requireVerifiedEmail: true,
    });
    // The Google name is only what the form was prefilled with: the typed one
    // wins, and the token's stands in for a field cleared to whitespace, which
    // @MinLength(2) lets through. Both empty means a caller went round the form
    // altogether — a 400 here beats Mongoose's required-validator 500 below.
    const name = dto.name.trim() || identity.name.trim();
    if (!name) throw new BadRequestException('Please enter your name.');

    return { googleSub: identity.sub, email: identity.email, name };
  }

  /** Public enrolment — the training must genuinely exist and still be open
   * (the old server action checked `published` at submit time, not render
   * time, for the same stale-page reason), and the person must be who they say
   * they are (see identify). */
  async create(trainingId: string, dto: CreateRegistrationDto) {
    const training = await this.trainingModel.findById(trainingId).exec();
    if (!training || !training.published) {
      throw new BadRequestException('That programme is no longer open.');
    }

    const identity = await this.identify(dto);

    // The only place a registration's price is ever decided. It is read off
    // the Training the server just loaded — the body has no say in it, and
    // could not: CreateRegistrationDto declares no money field, so the global
    // whitelisting ValidationPipe would strip one before this line ran.
    //
    // Seats multiply. The form asks "Number of seats" and reserves that many
    // places, so a booking for three on a $200 course owes $600, not $200 —
    // the same reading the ticket flow takes (price × quantity).
    //
    // Rounded to whole minor units as that flow rounds its own, because
    // SaveTrainingDto validates `priceCents` as @IsNumber rather than @IsInt:
    // a price carrying a fraction of a cent must not become an amount the QR
    // cannot express. The clamp is for legacy rows only — @Min(0) means the
    // admin cannot enter a negative price, and a stored one reads as free
    // rather than as a QR asking for less than nothing.
    const seats = dto.seats ?? 1;
    const amountCents = Math.round(Math.max(training.priceCents, 0) * seats);
    const payable = amountCents > 0;

    const registration = await this.model.create({
      googleSub: identity.googleSub,
      name: identity.name,
      email: identity.email.toLowerCase(),
      phone: dto.phone,
      company: dto.company ?? null,
      seats,
      message: dto.message ?? null,
      // A free programme keeps exactly the behaviour it has always had:
      // not-required, no reference, no payment step anywhere downstream.
      amountCents,
      currency: training.currency,
      paymentStatus: payable ? 'unpaid' : 'not-required',
      // 12 hex characters — comfortably inside the QR reference field's
      // 25-char cap and short enough to read off a bank statement, as
      // TicketsService.createPaynowOrder mints its own.
      paymentRef: payable ? randomBytes(6).toString('hex').toUpperCase() : null,
      trainingId: training._id,
      trainingTitle: training.title,
    });

    // Never let a CRM hiccup affect the registration itself succeeding. The
    // email handed over is the stored one, so wherever sign-in is configured
    // the CRM now merges on a server-verified address — the same standard blog
    // feedback already fed it, and the reason a contact's history can be
    // trusted to be one person's.
    this.crmService
      .upsertContact({
        email: registration.email,
        name: registration.name,
        phone: registration.phone,
        company: registration.company ?? undefined,
        source: {
          type: 'registration',
          refId: registration._id,
          label: `Registered for ${registration.trainingTitle}`,
        },
      })
      .catch((err: unknown) =>
        this.logger.warn(`CRM upsert failed for registration: ${(err as Error)?.message}`),
      );

    return registration;
  }

  async updateStatus(id: string, status: string) {
    const doc = await this.model
      .findByIdAndUpdate(id, { status }, { new: true, runValidators: true })
      .exec();
    if (!doc) throw new NotFoundException(`No registration with id "${id}"`);
    return doc;
  }

  /** The row behind a payment route, by an id that came straight off a URL —
   * so anything that is not an ObjectId is a 400 here rather than the 500
   * Mongoose's cast error would otherwise surface as. */
  private async findForPayment(id: string): Promise<RegistrationDocument> {
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException('Invalid registration id');
    const doc = await this.model.findById(id).exec();
    if (!doc) throw new NotFoundException(`No registration with id "${id}"`);
    return doc;
  }

  /**
   * What the payment step is allowed to see. Its routes are public — the id is
   * the only thing between a caller and the reply — so this carries the
   * booking's money and its state and nothing whatsoever about the person: no
   * name, no email, no phone, no googleSub. The two non-money fields are ones
   * the payer chose themselves, and the page cannot say what is being paid for
   * without them.
   */
  private paymentView(doc: RegistrationDocument) {
    return {
      registrationId: String(doc._id),
      status: doc.status,
      paymentStatus: doc.paymentStatus,
      amountCents: doc.amountCents,
      currency: doc.currency,
      reference: doc.paymentRef,
      seats: doc.seats,
      trainingTitle: doc.trainingTitle,
      paymentClaimedAt: doc.paymentClaimedAt,
      paymentVerifiedAt: doc.paymentVerifiedAt,
    };
  }

  /**
   * The QR the registrant pays against. Public, like the enrolment form that
   * created the row — someone who has just enrolled has no account, which is
   * why the sponsor flow's own GET :id/paynow-qr is public too.
   *
   * Built from the stored `amountCents` and never from the Training: a price
   * edited after this booking was taken must not change what this QR asks
   * for. The amount goes in non-editable (paynow.service.ts, TLV 03/1), so
   * what the payer's banking app offers to send is what was agreed here.
   *
   * Answers for a claimed or already-verified booking as well, rather than
   * refusing — the page can then render "received, nothing further to pay"
   * from `paymentStatus` in the same reply instead of from an error. A free
   * programme is the one refusal: it has no payment step to describe.
   */
  async paynowQr(id: string) {
    const doc = await this.findForPayment(id);
    if (doc.paymentStatus === 'not-required' || doc.amountCents <= 0) {
      throw new BadRequestException('This programme is free — there is nothing to pay.');
    }

    // Cents → dollars, here and nowhere else in this module. Everything stored
    // is minor units, while PaynowService takes a major-unit amount and writes
    // it into the payload as `amount.toFixed(2)` — handing it `amountCents`
    // would encode a hundredfold overcharge.
    const amountMajor = doc.amountCents / 100;
    // Minted alongside `amountCents` in create, so a payable booking always
    // has one; the fallback is the sponsor flow's derivation, which keeps a
    // row edited into a payable state by hand scannable instead of a 500.
    const reference = doc.paymentRef ?? String(doc._id).slice(-12).toUpperCase();
    const { qr, payeeId, payeeName } = await this.paynow.generateQr(
      amountMajor,
      reference,
      doc.currency,
    );

    return { ...this.paymentView(doc), reference, payment: { qr, payeeId, payeeName } };
  }

  /**
   * "I have paid" — a claim, and only ever a claim. It records that the
   * registrant says the transfer is done and when they said it. It marks
   * nothing received, counts as no revenue and leaves `status` exactly where
   * it was; only verifyPayment below, behind the admin guard, does any of
   * that. The entity's `paymentStatus` docblock has the full reasoning, but
   * the short of it is that PayNow gives us nothing to check a claim against.
   *
   * Safe to press twice and safe to press late. A repeat keeps the original
   * `paymentClaimedAt` — when the claim was made is a fact, not a counter —
   * and replaces `payerReference` only when a new one was actually typed. A
   * claim arriving after an admin has verified the payment cannot drag it back
   * to `claimed`: the write is conditional on the row not being `paid`, so the
   * person holding the bank statement always wins that race.
   */
  async claimPayment(id: string, dto: ClaimPaymentDto) {
    const doc = await this.findForPayment(id);
    if (doc.paymentStatus === 'not-required') {
      throw new BadRequestException('This programme is free — there is nothing to pay.');
    }
    if (doc.paymentStatus === 'paid') return this.paymentView(doc);

    const reference = dto.payerReference?.trim();
    const updated = await this.model
      .findOneAndUpdate(
        { _id: doc._id, paymentStatus: { $ne: 'paid' } },
        {
          paymentStatus: 'claimed',
          ...(doc.paymentClaimedAt ? {} : { paymentClaimedAt: new Date() }),
          ...(reference ? { payerReference: reference } : {}),
        },
        { new: true, runValidators: true },
      )
      .exec();
    if (updated) return this.paymentView(updated);

    // Nothing matched, so verifyPayment landed between the read and the write.
    // The claim is moot; report the state that won rather than the stale one
    // this call started from.
    return this.paymentView(await this.findForPayment(id));
  }

  /**
   * Admin: the money arrived. The only route in this module that can say so —
   * someone has found `paymentRef` against `amountCents` on the bank statement
   * and confirmed it. A claim is not a precondition: payments turn up from
   * people who never came back to the page to press the button.
   *
   * It confirms the place as well as the payment, which is what the flow means
   * end to end — a paid booking that has been paid for is complete. One
   * exception: a `cancelled` registration keeps its status. Recording a
   * transfer against one is fair (the money did arrive, and now has to be
   * refunded or applied elsewhere), but quietly reinstating a place an admin
   * deliberately dropped is not.
   *
   * Idempotent: re-verifying keeps the first `paymentVerifiedAt`, so the row
   * says when the money was confirmed rather than when the button was last
   * clicked.
   */
  async verifyPayment(id: string) {
    const doc = await this.findForPayment(id);
    if (doc.paymentStatus === 'not-required') {
      throw new BadRequestException('This programme is free — there is nothing to verify.');
    }

    const updated = await this.model
      .findByIdAndUpdate(
        doc._id,
        {
          paymentStatus: 'paid',
          ...(doc.paymentVerifiedAt ? {} : { paymentVerifiedAt: new Date() }),
          ...(doc.status === 'cancelled' ? {} : { status: 'confirmed' }),
        },
        { new: true, runValidators: true },
      )
      .exec();
    if (!updated) throw new NotFoundException(`No registration with id "${id}"`);
    return updated;
  }
}
