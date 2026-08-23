import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ContactDocument = HydratedDocument<Contact>;

/** One entry in a contact's activity timeline — denormalized (`label`) so
 * the CRM never needs a second query to render it; `refId` still lets the
 * frontend deep-link back to the real record in its own Inbox tab. */
@Schema({ _id: false })
export class ContactSource {
  /** registration | enquiry | application | message | subscriber | manual */
  @Prop({ type: String, required: true })
  type!: string;

  @Prop({ type: Types.ObjectId, required: false, default: null })
  refId!: Types.ObjectId | null;

  @Prop({ type: String, required: true })
  label!: string;

  @Prop({ type: Date, required: true, default: Date.now })
  createdAt!: Date;
}
export const ContactSourceSchema = SchemaFactory.createForClass(ContactSource);

@Schema({ _id: true })
export class ContactNote {
  @Prop({ type: String, required: true })
  text!: string;

  @Prop({ type: String, required: true })
  authorName!: string;

  @Prop({ type: Date, required: true, default: Date.now })
  createdAt!: Date;
}
export const ContactNoteSchema = SchemaFactory.createForClass(ContactNote);

/**
 * The CRM's unified person record — one per email address, upserted by every
 * form submission across Trainings/Consultancy/Careers/Contact/Newsletter
 * (see CrmService.upsertContact and each domain service's call site). Holds
 * what none of those five source collections do on their own: an
 * independent lead pipeline, freeform tags, notes, and a merged activity
 * timeline.
 */
@Schema({ collection: 'contacts', timestamps: true })
export class Contact {
  @Prop({ type: String, required: true, unique: true, lowercase: true, trim: true })
  email!: string;

  @Prop({ type: String, required: false, default: '' })
  name!: string;

  @Prop({ type: String, required: false, default: '' })
  phone!: string;

  @Prop({ type: String, required: false, default: '' })
  company!: string;

  @Prop({ type: [String], required: false, default: [] })
  tags!: string[];

  @Prop({ type: [ContactNoteSchema], required: false, default: [] })
  notes!: ContactNote[];

  /** new | contacted | qualified | won | lost — independent of whatever
   * status field the originating source record (registration/enquiry/
   * application) already has; this is the CRM's own pipeline. */
  @Prop({ type: String, required: true, default: 'new', index: true })
  leadStatus!: string;

  @Prop({ type: [ContactSourceSchema], required: false, default: [] })
  sources!: ContactSource[];

  @Prop({ type: Date, required: true, default: Date.now })
  firstSeenAt!: Date;

  @Prop({ type: Date, required: true, default: Date.now, index: true })
  lastActivityAt!: Date;

  @Prop({ type: Date })
  createdAt?: Date;

  @Prop({ type: Date })
  updatedAt?: Date;
}

export const ContactSchema = SchemaFactory.createForClass(Contact);
ContactSchema.index({ name: 'text', email: 'text', company: 'text' });
