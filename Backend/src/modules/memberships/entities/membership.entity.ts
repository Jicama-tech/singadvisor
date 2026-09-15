import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { MEMBERSHIP_PERK_KEYS, type MembershipPerk } from '../membership-perks';

export type MembershipDocument = HydratedDocument<Membership>;

/** Where a membership is in its life. Separate from `paymentStatus` for the
 * reason Registration separates them: the money and the place are different
 * facts, and a transfer arriving is not the same event as a membership
 * starting. */
export type MembershipStatus = 'pending' | 'active' | 'expired' | 'cancelled';

/** The same four words Registration.paymentStatus uses, on purpose: this flow
 * is that flow with a different subject, and one vocabulary across both means
 * the admin's two inboxes read alike. */
export type MembershipPaymentStatus = 'not-required' | 'unpaid' | 'claimed' | 'paid';

/** One entry of the audit trail. Every status change appends one; nothing ever
 * rewrites an earlier one. */
@Schema({ _id: false })
export class MembershipEvent {
  @Prop({ type: String, required: true })
  action!: string;

  @Prop({ type: Date, required: true, default: Date.now })
  at!: Date;

  /** Who did it: 'member', 'admin' or 'system' (the expiry sweep). Not a user
   * id — this deployment has one admin account shape and the interesting
   * distinction is which side of the desk the action came from. */
  @Prop({ type: String, required: true })
  by!: string;

  @Prop({ type: String, required: false, default: null })
  note!: string | null;
}

export const MembershipEventSchema = SchemaFactory.createForClass(MembershipEvent);

/**
 * One person's membership on one plan.
 *
 * Three things about this differ from eventsh-v1's ExhibitorMembership, and
 * each is a deliberate correction rather than a simplification:
 *
 * 1. No `organizerId`. Single tenant; see MembershipPlan.
 *
 * 2. The subject is a person identified by a Google-verified address, not a
 *    Vendor matched on whatever contact details happened to be typed. eventsh
 *    has to hunt a membership across email AND three spellings of a WhatsApp
 *    number because it never had a proven identity to key on; this codebase
 *    does (see RegistrationsService.identify), so `email` here is the same
 *    verified address the CRM merges on and the lookup is one equality test.
 *
 * 3. Everything the plan said at the time is snapshotted onto the row —
 *    `planName`, `perks`, `durationDays`, `amountCents`,
 *    `currency`. eventsh re-reads the plan at confirm time, which means
 *    editing a plan silently changes what somebody already bought. The stored
 *    copy is the contract; the plan is only where it came from. This is the
 *    same discipline Registration.amountCents is under, for the same reason.
 */
@Schema({ collection: 'memberships', timestamps: true })
export class Membership {
  /**
   * The Google account this was bought from, from a server-verified ID token
   * and never from the body — exactly as Registration.googleSub. Null on a
   * deployment with no GOOGLE_CLIENT_ID configured, where the purchase form
   * falls back to a typed address, and on anything an admin granted by hand.
   */
  @Prop({ type: String, required: false, default: null })
  googleSub!: string | null;

  /**
   * Lowercased, and the key everything looks a membership up by: the content
   * gate's "is this reader a member", the member's own status check, the CRM's
   * isMember column, the uniqueness rule below. Both indexes on it are declared
   * at the foot of this file rather than here, so the two that share the key
   * pattern are visible side by side.
   */
  @Prop({ type: String, required: true, lowercase: true, trim: true })
  email!: string;

  @Prop({ type: String, required: true })
  name!: string;

  @Prop({ type: String, required: false, default: null })
  phone!: string | null;

  @Prop({ type: String, required: false, default: null })
  company!: string | null;

  @Prop({ type: Types.ObjectId, ref: 'MembershipPlan', required: true })
  planId!: Types.ObjectId;

  /** Snapshot, so the row still names what was bought after the plan is
   * renamed or archived — and so the admin list needs no join. */
  @Prop({ type: String, required: true })
  planName!: string;

  /** Snapshot of the plan's perks at purchase. What this membership actually
   * grants; the plan's current list is irrelevant to it. */
  @Prop({
    type: [String],
    required: true,
    default: [],
    enum: MEMBERSHIP_PERK_KEYS,
  })
  perks!: MembershipPerk[];

  /** Snapshot — the term that was sold, used once to compute `endDate`. */
  @Prop({ type: Number, required: true, min: 1 })
  durationDays!: number;

  @Prop({ type: String, required: true, default: 'pending', index: true })
  status!: MembershipStatus;

  /** Both null until activation, and both set together at that moment. */
  @Prop({ type: Date, required: false, default: null })
  startDate!: Date | null;

  @Prop({ type: Date, required: false, default: null })
  endDate!: Date | null;

  /**
   * What was owed, in minor units, decided by the server from the plan it had
   * just loaded and never recomputed afterwards. The PayNow QR is built from
   * this field alone, so nothing a request body carries may reach it.
   */
  @Prop({ type: Number, required: true, default: 0 })
  amountCents!: number;

  @Prop({ type: String, required: true, default: 'SGD' })
  currency!: string;

  @Prop({ type: String, required: true, default: 'unpaid', index: true })
  paymentStatus!: MembershipPaymentStatus;

  /** Minted at purchase for a payable membership — what the admin matches the
   * transfer on. Null on a free plan and on an admin grant. */
  @Prop({ type: String, required: false, default: null })
  paymentRef!: string | null;

  /** Whatever reference the payer's own bank gave the transfer, if they typed
   * one. Never checked against anything; see Registration's ClaimPaymentDto. */
  @Prop({ type: String, required: false, default: null })
  payerReference!: string | null;

  @Prop({ type: Date, required: false, default: null })
  paymentClaimedAt!: Date | null;

  @Prop({ type: Date, required: false, default: null })
  paymentVerifiedAt!: Date | null;

  /**
   * Whether activating THIS membership is what put the address on the
   * subscriber list.
   *
   * The alternative is unsubscribing on expiry unconditionally, and that is a
   * real bug waiting: somebody who signed up for the newsletter in 2024 and
   * bought a membership in 2026 would be silently unsubscribed when it lapsed,
   * losing a consent they gave independently and never withdrew. So the
   * subscription is only undone by the membership that made it.
   */
  @Prop({ type: Boolean, required: true, default: false })
  subscribedByMembership!: boolean;

  @Prop({ type: [MembershipEventSchema], required: true, default: [] })
  history!: MembershipEvent[];

  @Prop({ type: Date })
  createdAt?: Date;

  @Prop({ type: Date })
  updatedAt?: Date;
}

export const MembershipSchema = SchemaFactory.createForClass(Membership);

/**
 * One active membership per address — eventsh's trick, and the one piece of
 * its schema worth copying verbatim. The partial filter is what makes it
 * usable: expired and cancelled rows pile up per person over the years and
 * must not collide with a fresh purchase, and a plain unique index would make
 * renewing impossible.
 */
MembershipSchema.index(
  { email: 1 },
  { unique: true, partialFilterExpression: { status: 'active' } },
);

/**
 * Every other lookup by address: "what does this person hold?", newest first.
 *
 * Declared here rather than as `index: true` on the prop because the partial
 * unique index above already has the key pattern {email:1} — two declarations
 * of the same pattern make Mongoose warn about a duplicate at boot, and the
 * prop-level one would have been the redundant half anyway. This carries
 * `createdAt` so myMembership's sort is served by the index too, and unlike the
 * partial one it covers rows in every state.
 */
MembershipSchema.index({ email: 1, createdAt: -1 });

/** The expiry sweep's query. */
MembershipSchema.index({ status: 1, endDate: 1 });

/**
 * The one definition of "a live membership", as a query filter.
 *
 * It lives on the entity rather than in MembershipsService because two
 * collections' worth of code needs it and only one of them can import that
 * service: CrmService reads this collection directly, the way it already reads
 * Registration, Enrolment and Ticket, because CrmModule cannot import
 * MembershipsModule — memberships write themselves into the CRM, and
 * MembershipsModule -> SubscribersModule -> CrmModule closes the loop.
 *
 * A shared filter keeps the rule singular anyway. Getting it wrong in one of
 * two places would mean the CRM and the content gate disagreeing about who is
 * a member, which is the sort of bug nobody reports because each screen looks
 * plausible on its own.
 *
 * `status: 'active'` alone is NOT enough: the nightly sweep is what flips a
 * lapsed row to `expired`, so between its end date and 2am the next morning a
 * membership is stale but still marked active. The date test is what closes
 * that window.
 */
export function activeMembershipFilter(now: Date = new Date()) {
  return {
    status: 'active',
    $or: [{ endDate: null }, { endDate: { $gt: now } }],
  };
}
