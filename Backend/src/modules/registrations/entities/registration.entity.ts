import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type RegistrationDocument = HydratedDocument<Registration>;

/** See `Registration.paymentStatus` for what each state means and, more to the
 * point, for why `claimed` and `paid` are not the same thing. */
export type RegistrationPaymentStatus = 'not-required' | 'unpaid' | 'claimed' | 'paid';

/**
 * Mirrors Frontend/prisma/schema.prisma's `Registration` model — with one
 * deliberate cut: the legacy `eventId` branch. Event RSVPs were superseded by
 * eventsh's real ticket flow (import-events.ts already migrated those rows
 * into tickets), so this collection only ever holds *training* registrations
 * going forward; the import script skips event-linked rows and logs them
 * rather than resurrecting a dead flow. `trainingTitle` is denormalized for
 * the admin list view, exactly like the old page's join did.
 */
@Schema({ collection: 'registrations', timestamps: true })
export class Registration {
  @Prop({ type: String, required: false, unique: true, sparse: true })
  legacyId?: string;

  /**
   * The Google account this place was booked from, taken from the ID token
   * verified server-side (common/utils/google-identity.ts) — never from the
   * request body, exactly as BlogFeedback.googleSub. It is what makes `email`
   * below a proven address rather than a typed one, so the person behind a
   * booking stays recoverable even if they later mistype a name.
   *
   * Null on two kinds of row, both of them honest: everything taken before
   * enrolment required a sign-in, and anything taken on a deployment with no
   * GOOGLE_CLIENT_ID configured (see RegistrationsService.identify).
   *
   * Deliberately unindexed: nothing reads a registration by it. The admin list
   * sorts by createdAt, the CRM joins these rows on email, and a per-account
   * uniqueness rule would be wrong here anyway — one person may quite
   * reasonably enrol on several programmes, and more than once on the same one.
   */
  @Prop({ type: String, required: false, default: null })
  googleSub!: string | null;

  @Prop({ type: String, required: true })
  name!: string;

  @Prop({ type: String, required: true })
  email!: string;

  @Prop({ type: String, required: true })
  phone!: string;

  @Prop({ type: String, required: false, default: null })
  company!: string | null;

  @Prop({ type: Number, required: true, default: 1 })
  seats!: number;

  @Prop({ type: String, required: false, default: null })
  message!: string | null;

  /** pending | confirmed | cancelled */
  @Prop({ type: String, required: true, default: 'pending', index: true })
  status!: string;

  /**
   * What this booking costs, in minor units — `Training.priceCents` × `seats`,
   * snapshotted by RegistrationsService.create at the moment the place was
   * taken and never recomputed after it.
   *
   * Two things depend on that being a stored number rather than a live read.
   * A price edited next week must not change what someone who enrolled today
   * owes; and the PayNow QR is built from this field alone, so if a request
   * body could reach it, a request body could set its own price. Nothing in
   * the module writes it except create.
   *
   * 0 on a free programme, and on every row taken before this flow existed.
   */
  @Prop({ type: Number, required: true, default: 0 })
  amountCents!: number;

  /** Snapshotted beside `amountCents` and for the same reason — the currency
   * the QR is denominated in, from `Training.currency`. */
  @Prop({ type: String, required: true, default: 'SGD' })
  currency!: string;

  /**
   * Where the money for this booking has got to. Four states, and the gap
   * between the middle two is the entire point of them:
   *
   *   not-required — the programme is free (`amountCents` 0). No payment step
   *                  is shown and none is owed. Also what every pre-existing
   *                  row reads as, which is the honest value: nothing was ever
   *                  collected against them.
   *   unpaid       — a paid programme with nothing received and nothing
   *                  claimed. Where a paid booking starts.
   *   claimed      — the registrant pressed "I have paid". That is an
   *                  assertion by the payer, not a receipt. PayNow has no
   *                  callback to verify a transfer against (paynow.service.ts
   *                  says as much in its own docblock), so only a person
   *                  reading the bank statement can turn a claim into money —
   *                  which is why a claim confirms nothing, counts as no
   *                  revenue, and is reachable from a public route while the
   *                  state below is not.
   *   paid         — an admin confirmed the transfer arrived
   *                  (PATCH :id/verify-payment). The only state that means
   *                  money is actually in the account.
   *
   * Unindexed on purpose, like `googleSub` above: the admin list sorts by
   * createdAt and reads this off the documents it already has, and nothing
   * queries registrations by payment state.
   */
  @Prop({
    type: String,
    required: true,
    enum: ['not-required', 'unpaid', 'claimed', 'paid'],
    default: 'not-required',
  })
  paymentStatus!: RegistrationPaymentStatus;

  /**
   * Our reference for the transfer — the code embedded in the QR (EMVCo tag
   * 62/01, which caps at 25 characters) and the string the admin matches
   * against a line on the bank statement. 12 hex characters, the same shape
   * and for the same reasons as `Ticket.paynowRef`.
   *
   * Minted once at create time for a paid booking and never regenerated:
   * reloading the payment page must show the same code, not mint a new
   * reference for a transfer the registrant may already have made. Null on a
   * free programme, which has no transfer to reference.
   */
  @Prop({ type: String, required: false, default: null })
  paymentRef!: string | null;

  /**
   * The reference the *payer* quotes back when claiming — their bank's
   * transaction id, typically. Optional, and unverified by definition: it is
   * typed into a public form by whoever is claiming. It exists to help the
   * admin find the right line on the statement, never to stand in for having
   * found it.
   */
  @Prop({ type: String, required: false, default: null })
  payerReference!: string | null;

  /** When "I have paid" was first pressed. First, not last: a second press
   * records nothing new, so this stays the moment the claim was made. */
  @Prop({ type: Date, required: false, default: null })
  paymentClaimedAt!: Date | null;

  /** When an admin confirmed the money had actually arrived. Set once, by
   * verifyPayment, and never by anything a registrant can reach. */
  @Prop({ type: Date, required: false, default: null })
  paymentVerifiedAt!: Date | null;

  @Prop({ type: Types.ObjectId, ref: 'Training', required: true })
  trainingId!: Types.ObjectId;

  @Prop({ type: String, required: true })
  trainingTitle!: string;

  @Prop({ type: Date })
  createdAt?: Date;

  @Prop({ type: Date })
  updatedAt?: Date;
}

export const RegistrationSchema = SchemaFactory.createForClass(Registration);
RegistrationSchema.index({ trainingId: 1 });
RegistrationSchema.index({ createdAt: -1 });
