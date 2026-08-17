import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';

export type SponsorRequestStatus =
  | 'Applied'
  | 'Approved'
  | 'PaymentSubmitted'
  | 'Confirmed'
  | 'Rejected'
  | 'Cancelled';

@Schema({ _id: false })
export class SponsorStatusHistoryEntry {
  @Prop({ type: String, required: true })
  status!: SponsorRequestStatus;

  @Prop({ type: String, default: '' })
  note!: string;

  @Prop({ type: Date, default: Date.now })
  changedAt!: Date;
}
export const SponsorStatusHistoryEntrySchema = SchemaFactory.createForClass(SponsorStatusHistoryEntry);

export type SponsorRequestDocument = HydratedDocument<SponsorRequest>;

/**
 * A business's application for one of an Event's `sponsorTypes` tiers.
 * Ported from eventsh-v1's `SponsorRequest` model, minus the separate
 * reusable `Sponsor` CRM-directory collection (organizer-facing "past
 * sponsors" address book) — single-tenant SingAdvisor doesn't need a
 * cross-event directory the way a multi-organizer platform does; each
 * application is self-contained.
 */
@Schema({ collection: 'sponsor-requests', timestamps: true })
export class SponsorRequest {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Event', required: true, index: true })
  eventId!: string;

  @Prop({ type: String, required: true })
  sponsorTypeId!: string;

  /** Snapshot at application time — the tier's name/price/collectPayment
   * could change later without retroactively rewriting past applications. */
  @Prop({ type: String, required: true })
  sponsorTypeName!: string;

  @Prop({ type: Number, default: 0 })
  amount!: number;

  @Prop({ type: Boolean, default: true })
  collectPayment!: boolean;

  /** Only meaningful when `collectPayment` is false — which of the tier's
   * `customOptions` this sponsor is providing instead of paying. */
  @Prop({ type: [String], default: [] })
  selectedOptions!: string[];

  @Prop({ type: String, required: true })
  companyName!: string;

  @Prop({ type: String, required: true })
  contactName!: string;

  @Prop({ type: String, required: true, lowercase: true, index: true })
  email!: string;

  @Prop({ type: String, default: '' })
  businessEmail!: string;

  @Prop({ type: String, default: '' })
  phone!: string;

  @Prop({ type: String, default: '' })
  website!: string;

  @Prop({ type: String, default: '' })
  logo!: string;

  @Prop({ type: String, default: '' })
  message!: string;

  // Manual proof-of-transfer — same as the ported Stalls flow will use,
  // no payment gateway involved for sponsorship money (matches source).
  @Prop({ type: String, default: '' })
  transactionId!: string;

  @Prop({ type: String, default: '' })
  transactionScreenshot!: string;

  @Prop({ type: String, default: '' })
  paymentMethod!: string;

  @Prop({ type: Boolean, default: false })
  paymentVerified!: boolean;

  @Prop({ type: Date })
  paymentVerifiedAt?: Date;

  @Prop({
    type: String,
    enum: ['Applied', 'Approved', 'PaymentSubmitted', 'Confirmed', 'Rejected', 'Cancelled'],
    default: 'Applied',
  })
  status!: SponsorRequestStatus;

  @Prop({ type: [SponsorStatusHistoryEntrySchema], default: [] })
  statusHistory!: SponsorStatusHistoryEntry[];
}

export const SponsorRequestSchema = SchemaFactory.createForClass(SponsorRequest);
// One application per business per event — same uniqueness rule as source.
SponsorRequestSchema.index({ eventId: 1, email: 1 }, { unique: true });
