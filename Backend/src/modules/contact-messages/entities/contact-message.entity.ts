import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ContactMessageDocument = HydratedDocument<ContactMessage>;

/**
 * Mirrors Frontend/prisma/schema.prisma's `ContactMessage` model 1:1,
 * re-expressed as a MongoDB document.
 */
@Schema({ collection: 'contact-messages', timestamps: true })
export class ContactMessage {
  @Prop({ type: String, required: false, unique: true, sparse: true })
  legacyId?: string;

  @Prop({ type: String, required: true })
  name!: string;

  @Prop({ type: String, required: true })
  email!: string;

  @Prop({ type: String, required: false, default: null })
  phone!: string | null;

  @Prop({ type: String, required: true })
  subject!: string;

  @Prop({ type: String, required: true })
  message!: string;

  @Prop({ type: Boolean, required: true, default: false })
  handled!: boolean;

  @Prop({ type: Date })
  createdAt?: Date;

  @Prop({ type: Date })
  updatedAt?: Date;
}

export const ContactMessageSchema = SchemaFactory.createForClass(ContactMessage);
ContactMessageSchema.index({ createdAt: -1 });
