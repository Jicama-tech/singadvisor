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
import { MailService } from '../mail/mail.service';
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
    private readonly mail: MailService,
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

  /**
   * Admin: move a booking between pending, confirmed and cancelled.
   *
   * The write is conditional on the status actually changing, and that is what
   * makes the confirmation email fire on the transition into `confirmed`
   * rather than on every press of a button that already reads that way.
   * Matching on `status: { $ne: status }` instead of reading the row and
   * comparing also settles two admins confirming at once: exactly one of the
   * two writes matches, so exactly one email goes out. Same reason claimPayment
   * below writes conditionally rather than read-then-write.
   *
   * A no-op is a success, not a 404: nothing matched means either no such
   * booking or one already in that state, and only the first of those is an
   * error, so the row is read back to tell them apart.
   */
  async updateStatus(id: string, status: string) {
    const transitioned = await this.model
      .findOneAndUpdate(
        { _id: id, status: { $ne: status } },
        { status },
        { new: true, runValidators: true },
      )
      .exec();
    const doc = transitioned ?? (await this.model.findById(id).exec());
    if (!doc) throw new NotFoundException(`No registration with id "${id}"`);
    if (!transitioned || status !== 'confirmed') return doc;

    const { registration } = await this.sendConfirmation(doc);
    return registration;
  }

  /** The row behind a route that takes an id straight off a URL — the payment
   * steps and the confirmation resend — so anything that is not an ObjectId is
   * a 400 here rather than the 500 Mongoose's cast error would otherwise
   * surface as. */
  private async findOrFail(id: string): Promise<RegistrationDocument> {
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
    const doc = await this.findOrFail(id);
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
    const doc = await this.findOrFail(id);
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
    return this.paymentView(await this.findOrFail(id));
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
   * clicked — and a second verification sends no second confirmation email,
   * because what sends one is winning the conditional write below and not
   * merely reaching it.
   *
   * Two writes rather than one, which is the price of that: the payment is a
   * fact to record every time, while confirming the place is a transition only
   * one caller can make. The brief window between them shows a booking paid
   * but not yet confirmed — a state this flow passes through anyway whenever a
   * transfer lands before an admin gets to it.
   */
  async verifyPayment(id: string) {
    const doc = await this.findOrFail(id);
    if (doc.paymentStatus === 'not-required') {
      throw new BadRequestException('This programme is free — there is nothing to verify.');
    }

    // The money first, and unconditionally: re-verifying has to keep saying
    // the transfer arrived, while `paymentVerifiedAt` keeps the moment it was
    // first confirmed rather than the moment the button was last pressed.
    const paid = await this.model
      .findByIdAndUpdate(
        doc._id,
        {
          paymentStatus: 'paid',
          ...(doc.paymentVerifiedAt ? {} : { paymentVerifiedAt: new Date() }),
        },
        { new: true, runValidators: true },
      )
      .exec();
    if (!paid) throw new NotFoundException(`No registration with id "${id}"`);

    // Then the place, as its own conditional write — the same shape
    // updateStatus uses above, and for the same reason. Reading `status` and
    // then deciding on it would let two admins verifying the same booking at
    // once both see `pending`, both write `confirmed`, and both send the
    // joining details; matching on the status instead means exactly one of the
    // two writes finds a row, so exactly one email goes out.
    //
    // Both excluded states are excluded in the match rather than after it.
    // `confirmed` because the details have already gone (by this route or the
    // status one) and must not go twice, and `cancelled` because recording a
    // transfer against a dropped place is fair but quietly reinstating it is
    // not. Nothing matching is the ordinary outcome, not an error: it means
    // the booking was already in one of those two states, and the row carrying
    // the payment we just wrote is the right thing to answer with.
    const transitioned = await this.model
      .findOneAndUpdate(
        { _id: doc._id, status: { $nin: ['confirmed', 'cancelled'] } },
        { status: 'confirmed' },
        { new: true, runValidators: true },
      )
      .exec();
    if (!transitioned) return paid;

    const { registration } = await this.sendConfirmation(transitioned);
    return registration;
  }

  /**
   * Admin: send the confirmation again.
   *
   * Not a convenience. This deployment has no SMTP_HOST configured, so every
   * confirmation sent at the moment a place is confirmed fails, and without
   * this route those registrants could never be told where to turn up once
   * mail is working. It mirrors TicketsService.resendEmail: same best-effort
   * send, same `{ sent }` answer, no pretending.
   *
   * Only a confirmed booking has a confirmation to send. Mailing "your place
   * is confirmed" to someone still pending, or to someone whose place an admin
   * cancelled, would be a worse failure than not mailing at all.
   */
  async resendConfirmation(id: string) {
    const doc = await this.findOrFail(id);
    if (doc.status !== 'confirmed') {
      throw new BadRequestException('Only a confirmed booking has a confirmation to send.');
    }

    const { sent, registration } = await this.sendConfirmation(doc);
    return {
      sent,
      confirmationEmailAttemptedAt: registration.confirmationEmailAttemptedAt,
      confirmationEmailSentAt: registration.confirmationEmailSentAt,
    };
  }

  /**
   * Where to turn up, chosen by the course's format — the same split the
   * course form offers the admin. Online and Hybrid both carry the Google
   * Classroom link and nothing else: a hybrid course here is run out of the
   * classroom, and whoever chooses to sit in the room does not need an address
   * emailed to them.
   *
   * Neither field is required to save a course, so a place can be confirmed
   * before the classroom is opened or the room is booked. That is ordinary,
   * not an error, and it must not read as one: an unset field becomes a plain
   * promise that the details will follow, never a "join here" pointing at
   * nothing. A course deleted after the booking was taken leaves the same gap
   * — registrations are not swept with it — with no format left to read, so it
   * makes the promise in the most general terms it can.
   */
  private joiningDetails(training: Training | null): string {
    if (!training) {
      return '<p>We will send you the joining details before the course starts.</p>';
    }
    if (training.format === 'In-person') {
      const address = training.venueAddress?.trim();
      return address
        ? `<p><strong>Where:</strong><br />${escapeHtml(address).replace(/\n/g, '<br />')}</p>`
        : '<p>We will send you the venue address before the course starts.</p>';
    }
    const link = training.googleClassroomLink?.trim();
    return link
      ? `<p><strong>Join here:</strong> <a href="${escapeHtml(link)}">${escapeHtml(link)}</a></p>`
      : '<p>We will send you the Google Classroom link before the course starts.</p>';
  }

  /**
   * The confirmation email, and the only place either confirming route or the
   * resend builds one.
   *
   * Best-effort by construction: sendBestEffort never throws, so nothing here
   * can fail a confirmation that has already been written — the same standing
   * the CRM upsert in create() has, and the ticket flow's own mail. What it
   * does do is record the attempt honestly. With no SMTP_HOST configured the
   * expected answer is `false`, and the two dates it writes are what let the
   * admin list say so instead of assuming a delivery that never happened.
   *
   * The Training is re-read rather than taken from the booking: the joining
   * details are whatever they are on the day the place is confirmed, and a
   * classroom link added after the booking was taken is the ordinary case, not
   * the exception. Only the title is used from the snapshot, because that is
   * the course the person actually signed up to.
   */
  private async sendConfirmation(
    registration: RegistrationDocument,
  ): Promise<{ sent: boolean; registration: RegistrationDocument }> {
    const training = await this.trainingModel.findById(registration.trainingId).exec();

    // Worded off `paymentStatus` rather than assumed: verifyPayment always
    // arrives here with the money in, while the status route can confirm a
    // place whose transfer has not turned up yet, and telling that person they
    // have paid would be a lie the booking itself contradicts.
    const amount =
      registration.amountCents > 0
        ? `<p><strong>${registration.paymentStatus === 'paid' ? 'Paid' : 'Amount due'}:</strong> ` +
          `${formatAmount(registration.amountCents, registration.currency)}</p>`
        : '';

    const attemptedAt = new Date();
    const sent = await this.mail.sendBestEffort({
      to: registration.email,
      subject: `Your place on ${registration.trainingTitle} is confirmed`,
      html: `
        <p>Hi ${escapeHtml(registration.name)},</p>
        <p>Your place on <strong>${escapeHtml(registration.trainingTitle)}</strong> is confirmed.</p>
        <p><strong>Seats:</strong> ${registration.seats}</p>
        ${amount}
        ${this.joiningDetails(training)}
        <p>If anything here looks wrong, reply to this email and we will put it right.</p>
      `,
    });

    const updated = await this.model
      .findByIdAndUpdate(
        registration._id,
        {
          confirmationEmailAttemptedAt: attemptedAt,
          ...(sent ? { confirmationEmailSentAt: new Date() } : {}),
        },
        { new: true },
      )
      .exec();
    if (!sent) {
      this.logger.warn(
        `Confirmation email not sent for registration ${String(registration._id)} — see prior warning for why`,
      );
    }
    // The row can only be missing if it was deleted between confirming and
    // this write; the caller still has a document to answer with, just one a
    // moment out of date.
    return { sent, registration: updated ?? registration };
  }
}

/** Escapes a value for use inside an HTML attribute or text node — the same
 * guard ShareService puts on everything it interpolates, and needed for the
 * same reason: a name, a course title and a venue address are all typed by
 * somebody, and this template is HTML. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Minor units → something a reader recognises. SGD gets an explicit "S$" for
 * the reason Frontend-vite's own formatter gives: a bare "$" on a Singapore
 * booking reads as US dollars. Anything else keeps its ISO code, which is
 * plainer but never ambiguous. */
function formatAmount(cents: number, currency: string): string {
  const amount = (cents / 100).toFixed(2);
  return currency === 'SGD' ? `S$${amount}` : `${amount} ${currency}`;
}
