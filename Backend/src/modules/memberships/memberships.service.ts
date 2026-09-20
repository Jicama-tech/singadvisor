import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { randomBytes } from 'crypto';
import { Model, Types } from 'mongoose';
import { googleClientId, verifyGoogleCredential } from '../../common/utils/google-identity';
import { CrmService } from '../crm/crm.service';
import { MailService } from '../mail/mail.service';
import { PaynowService } from '../paynow/paynow.service';
import { SubscribersService } from '../subscribers/subscribers.service';
import { ANONYMOUS, memberViewer, type Viewer } from '../../common/viewer';
import { brandedEmail, bullets, detail, p, strong } from '../../common/email-layout';
import { SaveMembershipPlanDto } from './dto/save-membership-plan.dto';
import { PurchaseMembershipDto } from './dto/purchase-membership.dto';
import { ClaimMembershipPaymentDto } from './dto/claim-membership-payment.dto';
import {
  MEMBERSHIP_PERKS,
  PERK_EMAILS,
  type MembershipPerk,
} from './membership-perks';
import {
  MembershipPlan,
  MembershipPlanDocument,
} from './entities/membership-plan.entity';
import {
  activeMembershipFilter,
  pickMembershipToShow,
  Membership,
  MembershipDocument,
  type MembershipStatus,
} from './entities/membership.entity';

/**
 * A date as a person reads it — "3 March 2027".
 *
 * For the places a date reaches somebody as PROSE rather than as a field the
 * frontend formats: the conflict message when an account already holds a
 * membership, and the welcome email's "runs until".
 *
 * Pinned to Asia/Singapore, which is the point of it. A bare
 * toLocaleDateString formats in the server's timezone, so a term ending at
 * midnight SGT reads as the previous day on a UTC host — and then the email
 * and the admin list disagree by a day about the same membership. `en-GB`
 * rather than the server's locale for the same reason: neither is the
 * reader's, so pick one and be consistent.
 */
function formatMembershipDate(date: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Singapore',
  }).format(date);
}

@Injectable()
export class MembershipsService {
  private readonly logger = new Logger(MembershipsService.name);

  constructor(
    @InjectModel(Membership.name)
    private readonly model: Model<MembershipDocument>,
    @InjectModel(MembershipPlan.name)
    private readonly planModel: Model<MembershipPlanDocument>,
    private readonly configService: ConfigService,
    private readonly crmService: CrmService,
    private readonly mail: MailService,
    private readonly paynow: PaynowService,
    private readonly subscribers: SubscribersService,
  ) {}

  // ── Plans ──────────────────────────────────────────────────────────────

  /** Admin: everything, archived included — the archive is a filter in the UI,
   * not a disappearance. */
  listPlansForAdmin() {
    return this.planModel.find().sort({ priceCents: 1, name: 1 }).exec();
  }

  /** Public: what is actually for sale, cheapest first. A tier the admin has
   * not published cannot be seen and (see purchase) cannot be bought. */
  listPublishedPlans() {
    return this.planModel
      .find({ published: true, archived: { $ne: true } })
      .sort({ priceCents: 1, name: 1 })
      .exec();
  }

  async findPlanOrFail(id: string): Promise<MembershipPlanDocument> {
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException('Invalid plan id');
    const plan = await this.planModel.findById(id).exec();
    if (!plan) throw new NotFoundException(`No membership plan with id "${id}"`);
    return plan;
  }

  async createPlan(dto: SaveMembershipPlanDto) {
    if (!dto.name?.trim()) throw new BadRequestException('A plan needs a name.');
    return this.planModel.create(this.planFields(dto, true));
  }

  /** Writes only the keys the request carried, exactly as TrainingsService.save
   * does — so a PATCH that changes the price cannot blank the perks. */
  async updatePlan(id: string, dto: SaveMembershipPlanDto) {
    const plan = await this.planModel
      .findByIdAndUpdate(id, this.planFields(dto, false), {
        new: true,
        runValidators: true,
      })
      .exec();
    if (!plan) throw new NotFoundException(`No membership plan with id "${id}"`);
    return plan;
  }

  /**
   * Archive, never delete. Memberships sold on this plan keep their own
   * snapshot of it, so deleting would not corrupt them — but it would leave an
   * admin reading last year's sales with no plan to open, and there is no
   * reason to take that away.
   */
  async setPlanArchived(id: string, archived: boolean) {
    const plan = await this.planModel
      .findByIdAndUpdate(id, { archived }, { new: true, runValidators: true })
      .exec();
    if (!plan) throw new NotFoundException(`No membership plan with id "${id}"`);
    return plan;
  }

  /** The plan's shape from a DTO — only the keys the request actually carried,
   * so a PATCH that changes the price cannot blank the perks. */
  private planFields(dto: SaveMembershipPlanDto, creating: boolean) {
    const perks = dto.perks;

    return {
      ...(dto.name !== undefined && { name: dto.name.trim() }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.priceCents !== undefined && {
        priceCents: Math.round(Math.max(dto.priceCents, 0)),
      }),
      ...(dto.currency !== undefined && { currency: dto.currency.toUpperCase() }),
      ...(dto.durationDays !== undefined && { durationDays: dto.durationDays }),
      ...(perks !== undefined && { perks }),
      ...(dto.published !== undefined && { published: dto.published }),
      ...(creating ? { archived: false } : {}),
    };
  }

  // ── Identity ───────────────────────────────────────────────────────────

  /**
   * Who a purchase is from. The same fork, for the same reason, as
   * RegistrationsService.identify — where GOOGLE_CLIENT_ID is configured the
   * address comes out of a verified token and `dto.email` is never read, and
   * where it is not, the typed address is accepted and the row is marked with
   * a null `googleSub`.
   *
   * It matters more here than it does there. A membership is what opens
   * members-only articles and issues, so an unverified address would let
   * anyone read a paying member's content by typing their address — and would
   * attach the purchase itself to an account its buyer may not own.
   */
  private async identify(
    dto: PurchaseMembershipDto,
  ): Promise<{ googleSub: string | null; email: string; name: string }> {
    const clientId = googleClientId(this.configService);

    if (!clientId) {
      if (!dto.email) throw new BadRequestException('Please enter your email address.');
      return { googleSub: null, email: dto.email, name: dto.name };
    }

    if (!dto.credential) {
      throw new BadRequestException('Please sign in with Google to buy a membership.');
    }

    const identity = await verifyGoogleCredential(clientId, dto.credential, {
      requireVerifiedEmail: true,
    });
    const name = dto.name.trim() || identity.name.trim();
    if (!name) throw new BadRequestException('Please enter your name.');

    return { googleSub: identity.sub, email: identity.email, name };
  }

  // ── Buying ─────────────────────────────────────────────────────────────

  /**
   * Public — buy a plan.
   *
   * The plan must be published and unarchived at THIS moment, not when the
   * page rendered: the same stale-page check the enrolment form makes.
   *
   * Everything the plan says is copied onto the membership here and never read
   * from the plan again. A free plan activates immediately and has no payment
   * step at all; a payable one is created `pending`/`unpaid` and waits for an
   * admin to confirm the transfer, exactly as a paid enrolment does.
   */
  async purchase(planId: string, dto: PurchaseMembershipDto) {
    const plan = await this.findPlanOrFail(planId);
    if (!plan.published || plan.archived) {
      throw new BadRequestException('That membership plan is no longer available.');
    }

    const identity = await this.identify(dto);
    const email = identity.email.toLowerCase();

    // Checked here for a clear message rather than left to the partial unique
    // index, which would surface as a duplicate-key 500. The index is still
    // what actually guarantees it — see activate().
    //
    // Matched on `status` alone, deliberately, and NOT through
    // activeMembershipFilter(): the index this stands in for is partial on
    // `status: 'active'` and knows nothing about dates. Letting a row that is
    // still marked active past its end date through here would sell a
    // membership that then failed to activate on a duplicate key — a 500 at
    // the worst moment, after the money.
    const active = await this.model.findOne({ email, status: 'active' }).exec();
    if (active) {
      // ...which leaves the window between a membership's end date and the
      // 2am sweep that retires it. In that window the holder is already not a
      // member — the content gate uses activeMembershipFilter and stopped
      // honouring the row at endDate — and refusing the sale here would tell
      // a paying customer they cannot renew, quoting a date in the past.
      //
      // So the lapsed row is retired on the spot instead. This is exactly the
      // write the sweep would have done, it clears the partial index, and it
      // is conditional on the row still being active, so racing the sweep is
      // harmless. Only then does the purchase carry on.
      const lapsed = active.endDate !== null && active.endDate <= new Date();
      if (lapsed) {
        await this.retireIfLapsed(active);
      } else {
        // Named, because "you already have one" leaves somebody who bought on
        // the wrong account, or forgot entirely, with nothing to act on. The
        // frontend asks before the form is shown; this is when it did not.
        //
        // Named ONLY when the address came out of a verified Google token.
        // Where no client id is configured `identify()` accepts a TYPED
        // address without proving anything (it marks the row googleSub: null),
        // and naming the plan and its expiry would answer, for any address an
        // attacker cared to type, precisely the question myMembership()
        // refuses to answer on that same deployment.
        throw new ConflictException(
          identity.googleSub
            ? `This Google account already holds the ${active.planName} membership` +
              (active.endDate ? `, which runs until ${formatMembershipDate(active.endDate)}` : '') +
              '.'
            : 'That email address already holds an active membership.',
        );
      }
    }

    // The only place a membership's price is decided, read off the plan the
    // server just loaded. PurchaseMembershipDto declares no money field, so the
    // whitelisting ValidationPipe would have stripped one before this line.
    const amountCents = Math.round(Math.max(plan.priceCents, 0));
    const payable = amountCents > 0;

    const membership = await this.model.create({
      googleSub: identity.googleSub,
      email,
      name: identity.name,
      phone: dto.phone,
      company: dto.company ?? null,
      planId: plan._id,
      planName: plan.name,
      perks: plan.perks,
      durationDays: plan.durationDays,
      status: 'pending',
      amountCents,
      currency: plan.currency,
      paymentStatus: payable ? 'unpaid' : 'not-required',
      // 12 hex characters, as RegistrationsService mints its own — inside the
      // QR reference field's 25-char cap and readable off a bank statement.
      paymentRef: payable ? randomBytes(6).toString('hex').toUpperCase() : null,
      history: [{ action: 'purchase', at: new Date(), by: 'member', note: null }],
    });

    this.recordInCrm(membership);

    // Nothing to pay means nothing to wait for. A free tier is live the moment
    // it is taken, which is also the only path on which a member is activated
    // without an admin ever touching it.
    if (!payable) {
      const activated = await this.activate(membership, 'system');
      return this.membershipView(activated);
    }

    return this.membershipView(membership);
  }

  // ── Payment ────────────────────────────────────────────────────────────

  private async findOrFail(id: string): Promise<MembershipDocument> {
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException('Invalid membership id');
    const doc = await this.model.findById(id).exec();
    if (!doc) throw new NotFoundException(`No membership with id "${id}"`);
    return doc;
  }

  /**
   * What the payment step is allowed to see. Its routes are public — the id is
   * the only thing between a caller and the reply — so this carries the money
   * and the state and nothing about the person: no name, no email, no phone,
   * no googleSub. Same cut RegistrationsService.paymentView makes.
   */
  private paymentView(doc: MembershipDocument) {
    return {
      membershipId: String(doc._id),
      status: doc.status,
      paymentStatus: doc.paymentStatus,
      amountCents: doc.amountCents,
      currency: doc.currency,
      reference: doc.paymentRef,
      planName: doc.planName,
      startDate: doc.startDate,
      endDate: doc.endDate,
      paymentClaimedAt: doc.paymentClaimedAt,
      paymentVerifiedAt: doc.paymentVerifiedAt,
    };
  }

  /**
   * What a buyer gets back from the public purchase route.
   *
   * `purchase()` and `activate()` both work in whole documents, because the
   * admin screens and the perk machinery need the whole thing. The route in
   * front of purchase() is public, so what leaves it is cut down to the same
   * fields the payment step already reads — `googleSub`, `phone`, `company`
   * and the `history` array have no reader on the buyer's side and no business
   * crossing the wire.
   *
   * `perks` rides along because the success state lists what was just bought,
   * and it is the plan's promise rather than anything about the person.
   */
  private membershipView(doc: MembershipDocument) {
    return { ...this.paymentView(doc), perks: doc.perks };
  }

  /** Public, like the form that created the row. Built from the stored
   * `amountCents` and never from the plan: a price edited after this was
   * bought must not change what the QR asks for. */
  async paynowQr(id: string) {
    const doc = await this.findOrFail(id);
    if (doc.paymentStatus === 'not-required' || doc.amountCents <= 0) {
      throw new BadRequestException('This membership is free — there is nothing to pay.');
    }

    // Cents → dollars, here and nowhere else: PaynowService takes a major-unit
    // amount, so handing it `amountCents` would encode a hundredfold overcharge.
    const amountMajor = doc.amountCents / 100;
    const reference = doc.paymentRef ?? String(doc._id).slice(-12).toUpperCase();
    const { qr, payeeId, payeeName } = await this.paynow.generateQr(
      amountMajor,
      reference,
      doc.currency,
    );

    return { ...this.paymentView(doc), reference, payment: { qr, payeeId, payeeName } };
  }

  /**
   * "I have paid" — a claim and only ever a claim, recorded so the admin knows
   * to go looking. Idempotent, and a claim arriving after verification cannot
   * drag the row back: the write is conditional on not being `paid`.
   *
   * The history entry is appended on the FIRST claim only.
   *
   * This route is public and keyed on nothing but the membership id, which the
   * enrolment flow's own payment-claimed route has always been too. An id is
   * not meaningfully guessable, but it does not have to be: an id that leaked
   * once could otherwise be posted to repeatedly, and each call would append
   * another entry to an array inside the document. There is no rate limiter in
   * front of it. Nothing about a second claim is worth recording anyway — the
   * admin is already looking — so the array is bounded here instead, and
   * `paymentClaimedAt` keeps the timestamp of the claim that counted.
   *
   * A repeat claim still updates `payerReference`, because somebody correcting
   * the name they paid under is the one repeat worth honouring.
   */
  async claimPayment(id: string, dto: ClaimMembershipPaymentDto) {
    const doc = await this.findOrFail(id);
    if (doc.paymentStatus === 'not-required') {
      throw new BadRequestException('This membership is free — there is nothing to pay.');
    }
    if (doc.paymentStatus === 'paid') return this.paymentView(doc);

    const reference = dto.payerReference?.trim();
    const firstClaim = !doc.paymentClaimedAt;
    const updated = await this.model
      .findOneAndUpdate(
        {
          _id: doc._id,
          paymentStatus: { $ne: 'paid' },
          // On the first claim the filter carries the condition too, so two
          // requests racing each other cannot both append: the loser matches
          // nothing and falls through to the re-read below.
          ...(firstClaim ? { paymentClaimedAt: null } : {}),
        },
        {
          $set: {
            paymentStatus: 'claimed',
            ...(firstClaim ? { paymentClaimedAt: new Date() } : {}),
            ...(reference ? { payerReference: reference } : {}),
          },
          ...(firstClaim
            ? {
                $push: {
                  history: {
                    action: 'payment-claimed',
                    at: new Date(),
                    by: 'member',
                    note: reference ?? null,
                  },
                },
              }
            : {}),
        },
        { new: true, runValidators: true },
      )
      .exec();

    // Nothing matched, so verifyPayment landed between the read and the write.
    // Report the state that won rather than the stale one this call began from.
    return this.paymentView(updated ?? (await this.findOrFail(id)));
  }

  /**
   * Admin — the money arrived, which for a membership is also the moment it
   * starts. The payment is recorded unconditionally (re-verifying keeps saying
   * the transfer came) while activation is a transition only one caller can
   * make, which is what stops a second click sending a second welcome email.
   *
   * A cancelled membership records the payment and stays cancelled: the money
   * did arrive and has to be refunded or applied, but quietly reinstating
   * something an admin deliberately dropped is not this button's job.
   */
  async verifyPayment(id: string) {
    const doc = await this.findOrFail(id);
    if (doc.paymentStatus === 'not-required') {
      throw new BadRequestException('This membership is free — there is nothing to verify.');
    }

    // Refused BEFORE the money is banked, not after.
    //
    // purchase() blocks only a second ACTIVE membership, so one address can
    // legitimately hold several `pending` rows — somebody who submitted twice,
    // or bought the wrong plan and then the right one. Verifying the second of
    // those after the first is active is an ordinary sequential admin action,
    // not the concurrent race that activate()'s duplicate-key catch was written
    // for. Left to that catch, the ConflictException is thrown AFTER the write
    // below has already recorded paymentStatus: 'paid' — leaving a row that is
    // paid and pending at once, which no admin action can then resolve because
    // this route is the only door to activation and it now refuses every time.
    if (doc.status === 'pending') {
      const live = await this.model
        .findOne({ email: doc.email, status: 'active', _id: { $ne: doc._id } })
        .exec();
      if (live) {
        throw new ConflictException(
          `${doc.email} already holds an active membership, so this one cannot be activated. ` +
            'Cancel the active one first, or cancel this duplicate.',
        );
      }
    }

    const paid = await this.model
      .findByIdAndUpdate(
        doc._id,
        {
          $set: {
            paymentStatus: 'paid',
            ...(doc.paymentVerifiedAt ? {} : { paymentVerifiedAt: new Date() }),
          },
          $push: {
            history: { action: 'payment-verified', at: new Date(), by: 'admin', note: null },
          },
        },
        { new: true, runValidators: true },
      )
      .exec();
    if (!paid) throw new NotFoundException(`No membership with id "${id}"`);
    if (paid.status !== 'pending') return paid;

    return this.activate(paid, 'admin');
  }

  // ── The membership itself ──────────────────────────────────────────────

  /**
   * Start it: stamp the term, apply the perks that can be applied, welcome
   * them.
   *
   * The term is computed once, here, from the membership's OWN snapshot of
   * `durationDays` — never from the plan, which may have been edited since it
   * was bought.
   *
   * The write is conditional on the row still being `pending`, so two admins
   * verifying at once activate it exactly once between them. Losing that race
   * is not an error: the row is read back and returned, already active.
   */
  private async activate(doc: MembershipDocument, by: string) {
    const start = new Date();
    const end = new Date(start.getTime() + doc.durationDays * 24 * 60 * 60 * 1000);

    let activated: MembershipDocument | null;
    try {
      activated = await this.model
        .findOneAndUpdate(
          { _id: doc._id, status: 'pending' },
          {
            $set: { status: 'active', startDate: start, endDate: end },
            $push: { history: { action: 'activate', at: start, by, note: null } },
          },
          { new: true, runValidators: true },
        )
        .exec();
    } catch (err: unknown) {
      // The partial unique index on { email } where status is active. purchase()
      // already refuses a second membership, so reaching this means two requests
      // for the same address raced past that check — the index is the thing that
      // actually decides, and this turns its duplicate-key error into the same
      // message the earlier check gives.
      if ((err as { code?: number })?.code === 11000) {
        throw new ConflictException('This account already holds an active membership.');
      }
      throw err;
    }

    if (!activated) return this.findOrFail(String(doc._id));

    await this.applyPerks(activated);
    void this.sendWelcome(activated);
    return activated;
  }

  /**
   * Admin — move a membership between states by hand.
   *
   * `active` is deliberately not reachable from here. Activation stamps a term
   * and fires perks and a welcome email, so it has one door (activate, above),
   * reached by verifying the payment or by buying a free plan. This route is
   * for cancelling, and for correcting a mistaken cancellation back to
   * `pending` so the payment can be verified properly.
   */
  async updateStatus(id: string, status: MembershipStatus) {
    if (status === 'active') {
      throw new BadRequestException(
        'Activate a membership by verifying its payment, so its term and perks are applied.',
      );
    }

    const doc = await this.findOrFail(id);
    if (doc.status === status) return doc;

    const wasActive = doc.status === 'active';
    const updated = await this.model
      .findByIdAndUpdate(
        doc._id,
        {
          $set: { status },
          $push: { history: { action: status, at: new Date(), by: 'admin', note: null } },
        },
        { new: true, runValidators: true },
      )
      .exec();
    if (!updated) throw new NotFoundException(`No membership with id "${id}"`);

    // Leaving `active` takes the perks with it — otherwise a cancelled member
    // keeps receiving the emails their membership bought.
    if (wasActive) await this.revokePerks(updated);
    return updated;
  }

  /** Admin — the inbox, newest first, optionally narrowed to one state. */
  listForAdmin(status?: string) {
    const filter = status && status !== 'all' ? { status } : {};
    return this.model.find(filter).sort({ createdAt: -1 }).exec();
  }

  // ── Who counts as a member ─────────────────────────────────────────────

  /**
   * The live membership behind an address, or null. The one query every
   * member-facing question goes through, so "what counts as a member" is
   * decided in exactly one place.
   *
   * `endDate` is checked here as well as swept nightly by the cron. The sweep
   * is what keeps the admin's list honest; this is what stops a membership
   * that lapsed at 3am from counting at 9am, five hours before the next sweep.
   */
  private activeMembershipFor(email: string) {
    const address = (email || '').toLowerCase().trim();
    if (!address) return null;

    return this.model
      .findOne({ email: address, ...activeMembershipFilter() })
      .exec();
  }

  /**
   * Whether this address holds a live membership right now — the question
   * every members-only surface asks before handing over content.
   *
   * Deliberately perk-agnostic. Gated content is not a perk in the catalogue
   * you can un-tick per plan: a member is a member, and making the gate depend
   * on a tickbox would mean a plan could be sold that silently cannot open the
   * thing it was sold to open.
   */
  async isActiveMember(email: string): Promise<boolean> {
    return !!(await this.activeMembershipFor(email));
  }

  /**
   * Turn a Google credential into a Viewer — the only way one is built with
   * `isMember: true` anywhere in this codebase.
   *
   * Anything that cannot be verified comes back anonymous rather than
   * throwing: a stale or malformed token should show somebody the locked
   * teaser, which is what they are entitled to, not a 500. The one thing it
   * will never do is trust an address it was simply handed.
   */
  async viewerFor(credential?: string): Promise<Viewer> {
    const clientId = googleClientId(this.configService);
    if (!clientId || !credential) return ANONYMOUS;
    try {
      const identity = await verifyGoogleCredential(clientId, credential, {
        requireVerifiedEmail: true,
      });
      return memberViewer(await this.isActiveMember(identity.email));
    } catch {
      return ANONYMOUS;
    }
  }


  /**
   * Every address entitled to a members-only mailing, oldest membership first.
   *
   * Deliberately NOT filtered by the `emails` perk. That perk governs the
   * marketing list somebody opted into; this is the content their membership
   * paid for, and a member who turned off the newsletter has not thereby
   * given up the thing they bought.
   */
  async activeMemberEmails(): Promise<string[]> {
    const live = await this.model
      .find(activeMembershipFilter())
      .select('email')
      .sort({ startDate: 1 })
      .lean()
      .exec();
    return [...new Set(live.map((m) => m.email))];
  }

  /**
   * Public — what the signed-in visitor holds, for the membership page to
   * render "you are a member until…" instead of the plan cards. Returns the
   * same reduced view the payment step gets, plus the perks, and nothing
   * identifying beyond what the caller just proved they own.
   *
   * A verified Google credential is the ONLY way in. There was a typed-email
   * fallback here for deployments with no GOOGLE_CLIENT_ID, matching the one
   * the enrolment flow keeps — but the two are not comparable. A typed address
   * at enrolment only decides what somebody is charged; here it decides who
   * gets to read a membership, and anybody who knew a member's address could
   * have read what that member paid, when it expires and what they bought.
   * That is the same argument MemberViewDto already writes down for the
   * content gate, and it applies at least as strongly to this.
   *
   * So a deployment with no GOOGLE_CLIENT_ID has no member lookup at all,
   * which is the safe way for that deployment to be wrong.
   */
  async myMembership(credential: string) {
    const clientId = googleClientId(this.configService);
    if (!clientId) {
      throw new BadRequestException(
        'Google sign-in is not configured on this server, so a membership cannot be looked up.',
      );
    }
    const identity = await verifyGoogleCredential(clientId, credential, {
      requireVerifiedEmail: true,
    });
    const email = identity.email.toLowerCase().trim();

    // One query, then the choice made in memory rather than in three round
    // trips: almost every caller is somebody with no membership at all, and
    // that case should cost one lookup on an indexed field, not three.
    // pickMembershipToShow holds the rule, and holds it where it can be tested
    // without a Google credential in front of it.
    const rows = await this.model.find({ email }).sort({ createdAt: -1 }).exec();
    const membership = pickMembershipToShow(rows);

    return membership ? this.membershipView(membership) : null;
  }

  // ── Perks ──────────────────────────────────────────────────────────────

  /**
   * The half of the perk list the software can actually keep.
   *
   * `emails` subscribes, and that is the whole of it. Nothing here copies a
   * flag onto another document: eventsh denormalises membership onto
   * Vendor.isMember and then needs a boot-time backfill and a cron to keep the
   * copy honest. Everything that asks "is this person a member" asks live.
   *
   * `early-access` and `members-content` are stored on the row and listed on
   * the plan, and nothing reads either. Members-only content is real and works,
   * but the gate asks isActiveMember, which is perk-agnostic — so ticking
   * `members-content` on a plan changes nothing. membership-perks.ts carries
   * the full reasoning.
   */
  private async applyPerks(membership: MembershipDocument) {
    if (!membership.perks.includes(PERK_EMAILS)) return;

    try {
      // Whether this membership is what put them on the list decides whether
      // its expiry may take them off again. Read before subscribing, because
      // subscribe() is an upsert and afterwards the answer is always "active".
      const before = await this.subscribers.isActive(membership.email);
      await this.subscribers.subscribe({ email: membership.email });
      if (!before) {
        await this.model
          .updateOne({ _id: membership._id }, { subscribedByMembership: true })
          .exec();
      }
    } catch (err: unknown) {
      // A membership that has been paid for must not fail to start because the
      // mailing list was unreachable.
      this.logger.warn(
        `Could not apply the emails perk for ${membership.email}: ${(err as Error)?.message}`,
      );
    }
  }

  /**
   * Undo what activation did, and only that.
   *
   * The subscription comes off only if this membership is what created it
   * (`subscribedByMembership`) AND no other active membership of theirs still
   * grants it. Anything else would revoke a consent the person gave
   * independently — see the field's docblock on the entity.
   */
  private async revokePerks(membership: MembershipDocument) {
    if (!membership.subscribedByMembership) return;

    try {
      const stillEntitled = await this.model
        .exists({
          _id: { $ne: membership._id },
          email: membership.email,
          status: 'active',
          perks: PERK_EMAILS,
        })
        .exec();
      if (stillEntitled) return;

      await this.subscribers.setActive(membership.email, false);
      await this.model
        .updateOne({ _id: membership._id }, { subscribedByMembership: false })
        .exec();
    } catch (err: unknown) {
      this.logger.warn(
        `Could not revoke the emails perk for ${membership.email}: ${(err as Error)?.message}`,
      );
    }
  }

  // ── Expiry ─────────────────────────────────────────────────────────────

  /**
   * The nightly sweep. Flips active memberships past their end date to
   * `expired` and takes their perks with them.
   *
   * One at a time rather than an updateMany, because each one may have a
   * subscription to undo and that decision is per-row. The volume this site
   * will ever see makes the loop the cheap option; if it ever does not, the
   * query is already indexed to batch.
   */
  async expireDue(): Promise<number> {
    const due = await this.model
      .find({ status: 'active', endDate: { $ne: null, $lte: new Date() } })
      .exec();

    let expired = 0;
    for (const membership of due) {
      if (await this.retireIfLapsed(membership)) expired++;
    }
    return expired;
  }

  /**
   * Move one lapsed row from `active` to `expired`, and revoke what it granted.
   *
   * Extracted so the nightly sweep and purchase() do the IDENTICAL write. They
   * have to, because two different definitions of "live" are in play and the
   * sweep is what reconciles them: isActiveMember and friends stop honouring a
   * membership at `endDate`, while the partial unique index — and therefore
   * purchase()'s conflict check — key on `status` alone and know nothing about
   * dates. Between a membership's end date and the next 2am sweep, up to a
   * day, its holder was BOTH refused members-only content AND refused a
   * renewal, with a 409 quoting an end date already in the past.
   *
   * Conditional on still being `active`, so two callers racing cannot both
   * revoke, and idempotent: a row already expired matches nothing and returns
   * false.
   */
  private async retireIfLapsed(membership: MembershipDocument): Promise<boolean> {
    const updated = await this.model
      .findOneAndUpdate(
        { _id: membership._id, status: 'active' },
        {
          $set: { status: 'expired' },
          $push: { history: { action: 'expired', at: new Date(), by: 'system', note: null } },
        },
        { new: true },
      )
      .exec();
    if (!updated) return false;
    await this.revokePerks(updated);
    return true;
  }

  // ── Side effects ───────────────────────────────────────────────────────

  /** Fire-and-forget, like every other CRM write in this codebase: a hiccup
   * there must never stop a purchase succeeding. */
  private recordInCrm(membership: MembershipDocument) {
    this.crmService
      .upsertContact({
        email: membership.email,
        name: membership.name,
        phone: membership.phone ?? undefined,
        company: membership.company ?? undefined,
        source: {
          type: 'membership',
          refId: membership._id,
          label: `Bought the ${membership.planName} membership`,
        },
      })
      .catch((err: unknown) =>
        this.logger.warn(`CRM upsert failed for membership: ${(err as Error)?.message}`),
      );
  }

  /** Best-effort, and deliberately after the row is already active: an SMTP
   * outage is not a reason for a paid membership not to start. */
  /**
   * Admin — send the welcome email again.
   *
   * Offered for any ACTIVE membership, including one whose welcome already
   * went out. A welcome gets lost, filtered, or sent while SMTP was down; the
   * member is entitled to it either way, and there is nothing destructive
   * about a second copy. Refused only where there is nothing to describe —
   * a membership that has not started has no term or perks to state.
   */
  async resendWelcome(id: string): Promise<{ sent: boolean }> {
    const doc = await this.findOrFail(id);
    if (doc.status !== 'active') {
      throw new BadRequestException('Only an active membership has a welcome to send.');
    }
    return { sent: await this.sendWelcome(doc) };
  }

  private sendWelcome(membership: MembershipDocument): Promise<boolean> {
    // formatMembershipDate, not toLocaleDateString: the latter formats in the
    // SERVER's timezone, so a term ending at midnight SGT reads as the day
    // before on a UTC host — disagreeing with the admin list and the member's
    // own page, which both format in Singapore.
    const until = membership.endDate ? formatMembershipDate(membership.endDate) : null;

    const perks = membership.perks
      .map((key) => MEMBERSHIP_PERKS.find((perk) => perk.key === key))
      .filter((perk): perk is (typeof MEMBERSHIP_PERKS)[number] => !!perk)
      .map((perk) => escapeHtml(perk.label));

    return this.mail
      .sendBestEffort({
        to: membership.email,
        subject: `Your ${membership.planName} membership is active`,
        html: brandedEmail({
          preheading: 'Membership active',
          preview: `Your ${membership.planName} membership is active${
            until ? ` until ${until}` : ''
          }.`,
          body: [
            p(`Hi ${escapeHtml(membership.name)},`),
            p(
              `Your ${strong(membership.planName)} membership is now active${
                until ? ` and runs until ${strong(until)}` : ''
              }.`,
            ),
            perks.length > 0
              ? `${p(strong('What it includes'))}${bullets(perks)}`
              : '',
            membership.amountCents > 0
              ? detail(
                  'Paid:',
                  escapeHtml(formatAmount(membership.amountCents, membership.currency)),
                )
              : '',
            p('Thank you for joining us.'),
          ].join(''),
        }),
      })
      .catch((err: unknown) => {
        this.logger.warn(`Welcome email failed: ${(err as Error)?.message}`);
        return false;
      });
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Minor units → something a reader recognises, matching the enrolment
 * confirmation's own formatter: a bare "$" on a Singapore charge reads as US
 * dollars, so SGD gets an explicit "S$". */
function formatAmount(cents: number, currency: string): string {
  const amount = (cents / 100).toFixed(2);
  return currency === 'SGD' ? `S$${amount}` : `${amount} ${currency}`;
}

export type { MembershipPerk };
