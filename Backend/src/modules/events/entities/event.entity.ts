import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type EventStatus = 'draft' | 'published' | 'cancelled';
export type EventVisibility = 'public' | 'private' | 'unlisted';

/**
 * A ticket tier (eventsh-v1 calls this `visitorTypes`) — this is where price
 * AND inventory live, not on the Event itself. `soldCount` is incremented by
 * the tickets module inside its purchase transaction; `maxCount - soldCount`
 * is the live remaining count.
 */
@Schema({ _id: false })
export class VisitorType {
  @Prop({ type: String, required: true })
  id!: string;

  @Prop({ type: String, required: true })
  name!: string;

  /** Ordinary decimal currency units (e.g. dollars) — tickets.service.ts
   * converts to minor units (cents) only at the Razorpay boundary. */
  @Prop({ type: Number, required: true, default: 0 })
  price!: number;

  @Prop({ type: Number, required: true, default: 0 })
  maxCount!: number;

  @Prop({ type: Number, required: true, default: 0 })
  soldCount!: number;

  @Prop({ type: String, default: '' })
  description!: string;

  @Prop({ type: [String], default: [] })
  featureAccess!: string[];

  @Prop({ type: Boolean, default: true })
  isActive!: boolean;
}
export const VisitorTypeSchema = SchemaFactory.createForClass(VisitorType);

/** A per-purpose age limit (e.g. "Vendors" -> "18+") — distinct from the
 * single general `ageRestriction` string, which stays as the default. */
@Schema({ _id: false })
export class AgeRestrictionEntry {
  @Prop({ type: String, required: true })
  heading!: string;

  @Prop({ type: String, required: true, default: 'All Ages' })
  age!: string;
}
export const AgeRestrictionEntrySchema = SchemaFactory.createForClass(AgeRestrictionEntry);

/** A scrolling announcement strip above the event banner. */
@Schema({ _id: false })
export class AdBar {
  @Prop({ type: Boolean, default: false })
  visible!: boolean;

  @Prop({ type: String, default: '' })
  message!: string;

  @Prop({ type: String, default: '#000000' })
  bgColor!: string;

  @Prop({ type: String, default: '#ffffff' })
  textColor!: string;
}
export const AdBarSchema = SchemaFactory.createForClass(AdBar);

@Schema({ _id: false })
export class CustomSection {
  @Prop({ type: String, required: true })
  id!: string;

  @Prop({ type: String, required: true })
  heading!: string;

  @Prop({ type: String, required: true })
  content!: string;
}
export const CustomSectionSchema = SchemaFactory.createForClass(CustomSection);

/** One "time | title" programme row — kept from the legacy Prisma model. */
@Schema({ _id: false })
export class AgendaItem {
  @Prop({ type: String, required: true })
  time!: string;

  @Prop({ type: String, required: true })
  title!: string;
}
export const AgendaItemSchema = SchemaFactory.createForClass(AgendaItem);

@Schema({ _id: false })
export class SpeakerSocialLinks {
  @Prop({ type: String, default: '' })
  linkedin!: string;

  @Prop({ type: String, default: '' })
  instagram!: string;

  @Prop({ type: String, default: '' })
  youtube!: string;

  @Prop({ type: String, default: '' })
  facebook!: string;

  @Prop({ type: String, default: '' })
  twitter!: string;

  @Prop({ type: String, default: '' })
  website!: string;
}
export const SpeakerSocialLinksSchema = SchemaFactory.createForClass(SpeakerSocialLinks);

/**
 * A speaker's profile + session — ported from eventsh-v1's "Speakers" tab
 * fields, minus the venue-zone/space placement (`venueSpeakerZones`,
 * `speakerSlotTemplates`) since that's tied to the visual venue-designer
 * canvas this project doesn't have (deferred to a later phase). `startTime`/
 * `endTime` are plain HH:mm strings, same convention as the Event's own
 * `time`/`endTime` — informational, not validated against timezone-aware
 * Dates, since a session is always within its own event's single day.
 */
@Schema({ _id: false })
export class SpeakerProfile {
  @Prop({ type: String, required: true })
  id!: string;

  @Prop({ type: String, required: true })
  name!: string;

  @Prop({ type: String, default: '' })
  role!: string;

  @Prop({ type: String, default: '' })
  company!: string;

  @Prop({ type: String, default: '' })
  photo!: string;

  @Prop({ type: String, required: true })
  topic!: string;

  @Prop({ type: String, default: '' })
  description!: string;

  @Prop({ type: String, default: '' })
  startTime!: string;

  @Prop({ type: String, default: '' })
  endTime!: string;

  @Prop({ type: String, default: '' })
  whatsApp!: string;

  @Prop({ type: String, default: '' })
  email!: string;

  @Prop({ type: SpeakerSocialLinksSchema, default: () => ({}) })
  socialLinks!: SpeakerSocialLinks;
}
export const SpeakerProfileSchema = SchemaFactory.createForClass(SpeakerProfile);

/**
 * A sponsorship tier businesses can apply for — the catalog side lives here
 * on the Event (like `visitorTypes`); the actual applications live in the
 * separate `sponsors` module's `SponsorRequest` collection, since an
 * application has its own approval/payment-verification lifecycle that
 * doesn't fit as embedded data. When `collectPayment` is off, the tier is
 * non-cash — `price` becomes a display-only "value" and `customOptions`
 * lists what a sponsor can provide instead (matches eventsh-v1's model).
 */
@Schema({ _id: false })
export class SponsorType {
  @Prop({ type: String, required: true })
  id!: string;

  @Prop({ type: String, required: true })
  name!: string;

  @Prop({ type: Number, default: 0 })
  price!: number;

  @Prop({ type: Boolean, default: true })
  collectPayment!: boolean;

  @Prop({ type: [String], default: [] })
  customOptions!: string[];

  @Prop({ type: String, default: '' })
  description!: string;
}
export const SponsorTypeSchema = SchemaFactory.createForClass(SponsorType);

export type EventDocument = HydratedDocument<Event>;

@Schema({ collection: 'events', timestamps: true })
export class Event {
  @Prop({ type: String, required: true, unique: true, trim: true })
  slug!: string;

  @Prop({ type: String, required: true })
  title!: string;

  @Prop({ type: String, default: '' })
  summary!: string;

  @Prop({ type: String, default: '' })
  description!: string;

  @Prop({ type: String, default: 'general' })
  eventType!: string;

  @Prop({ type: String, default: '' })
  category!: string;

  @Prop({ type: Date, required: true })
  startDate!: Date;

  @Prop({ type: Date, required: true })
  endDate!: Date;

  @Prop({ type: String, default: '' })
  time!: string;

  @Prop({ type: String, default: '' })
  endTime!: string;

  @Prop({ type: String, default: '' })
  location!: string;

  @Prop({ type: String, default: '' })
  venue!: string;

  @Prop({ type: String, default: '' })
  address!: string;

  @Prop({ type: String, enum: ['public', 'private', 'unlisted'], default: 'public' })
  visibility!: EventVisibility;

  @Prop({ type: [String], default: [] })
  tags!: string[];

  @Prop({ type: Object, default: {} })
  features!: Record<string, boolean>;

  @Prop({ type: String, default: '' })
  ageRestriction!: string;

  /** Per-purpose overrides (e.g. "Vendors" -> "18+") — the single
   * `ageRestriction` above stays as the general default. */
  @Prop({ type: [AgeRestrictionEntrySchema], default: [] })
  ageRestrictions!: AgeRestrictionEntry[];

  @Prop({ type: String, default: '' })
  dresscode!: string;

  @Prop({ type: String, default: '' })
  dressCodeTheme!: string;

  @Prop({ type: AdBarSchema, default: () => ({}) })
  adBar!: AdBar;

  @Prop({ type: String, default: '' })
  specialInstructions!: string;

  @Prop({ type: String, default: '' })
  refundPolicy!: string;

  @Prop({ type: String, default: '' })
  termsAndConditions!: string;

  @Prop({ type: [CustomSectionSchema], default: [] })
  customSections!: CustomSection[];

  @Prop({ type: Object, default: {} })
  registrationFormFields!: Record<string, unknown>;

  @Prop({ type: String, default: '' })
  image!: string;

  @Prop({ type: [String], default: [] })
  gallery!: string[];

  @Prop({ type: [String], default: [] })
  reelLinks!: string[];

  @Prop({ type: Object, default: {} })
  socialMedia!: Record<string, string>;

  @Prop({ type: String, enum: ['draft', 'published', 'cancelled'], default: 'draft' })
  status!: EventStatus;

  /** Kill switch, independent of `status` — same dual-flag pattern eventsh-v1 uses. */
  @Prop({ type: Boolean, default: true })
  published!: boolean;

  @Prop({ type: Boolean, default: false })
  featured!: boolean;

  /** Simple flat names — kept for backward compatibility with migrated
   * events and as a lightweight fallback. `speakerProfiles` below is the
   * richer, real one; the public page prefers it when non-empty. */
  @Prop({ type: [String], default: [] })
  speakers!: string[];

  @Prop({ type: [SpeakerProfileSchema], default: [] })
  speakerProfiles!: SpeakerProfile[];

  /** "time | title" programme rows — kept from the legacy Prisma model. */
  @Prop({ type: [AgendaItemSchema], default: [] })
  agenda!: AgendaItem[];

  @Prop({ type: String, default: 'SGD' })
  currency!: string;

  @Prop({ type: [VisitorTypeSchema], default: [] })
  visitorTypes!: VisitorType[];

  @Prop({ type: [SponsorTypeSchema], default: [] })
  sponsorTypes!: SponsorType[];
}

export const EventSchema = SchemaFactory.createForClass(Event);
EventSchema.index({ startDate: 1, published: 1 });
