import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { MEMBERSHIP_PERK_KEYS, type MembershipPerk } from '../membership-perks';

export type MembershipPlanDocument = HydratedDocument<MembershipPlan>;

/**
 * A membership tier the admin writes and anyone can buy.
 *
 * Deliberately NOT eventsh-v1's shape. That model hangs every plan off an
 * `organizerId` because it is a multi-tenant SaaS selling to many organizers;
 * this site is one organization selling to the public, so the tenant column
 * and every query that had to carry it are simply absent.
 *
 * Archived rather than deleted, for the reason eventsh got right: a plan is
 * referenced by every membership ever sold on it, and those rows have to keep
 * naming what was bought. `archived` hides it from the public list while
 * leaving the history readable. The memberships themselves do not depend on
 * this document surviving either — they snapshot what they were sold (see
 * Membership) — but an admin looking at last year's sales should still find
 * the plan behind them.
 */
@Schema({ collection: 'membership_plans', timestamps: true })
export class MembershipPlan {
  @Prop({ type: String, required: true, trim: true })
  name!: string;

  @Prop({ type: String, required: false, default: '' })
  description!: string;

  /**
   * Minor units, like Training.priceCents and for the same reasons — the
   * PayNow QR is built from an integer number of cents, and a price carrying
   * a fraction of one is not a price anybody can pay.
   *
   * 0 is a real and supported value: a free tier activates on purchase with
   * no payment step at all, exactly as a free programme does.
   */
  @Prop({ type: Number, required: true, default: 0, min: 0 })
  priceCents!: number;

  @Prop({
    type: String,
    required: true,
    default: 'SGD',
    uppercase: true,
    maxlength: 3,
  })
  currency!: string;

  /** How long a membership bought on this plan runs. The end date is computed
   * once, at activation, and stored — so shortening the plan later cannot
   * retroactively expire somebody who already paid for a year. */
  @Prop({ type: Number, required: true, default: 365, min: 1 })
  durationDays!: number;

  /** Keys from membership-perks.ts. The enum is the schema's own guard, behind
   * the DTO's — a perk that is not in the catalogue cannot reach the database
   * even from a script. */
  @Prop({
    type: [String],
    required: true,
    default: [],
    enum: MEMBERSHIP_PERK_KEYS,
  })
  perks!: MembershipPerk[];

  /** Draft until the admin says otherwise: an unpublished plan is invisible to
   * the public list and cannot be purchased, so a half-written tier is never
   * for sale. */
  @Prop({ type: Boolean, required: true, default: false, index: true })
  published!: boolean;

  @Prop({ type: Boolean, required: true, default: false, index: true })
  archived!: boolean;

  @Prop({ type: Date })
  createdAt?: Date;

  @Prop({ type: Date })
  updatedAt?: Date;
}

export const MembershipPlanSchema = SchemaFactory.createForClass(MembershipPlan);

/** The public list's only query: published, not archived. */
MembershipPlanSchema.index({ published: 1, archived: 1 });
