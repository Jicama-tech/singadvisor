import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type NewsletterDocument = HydratedDocument<Newsletter>;

/**
 * One image, a <=500-word message (enforced in SaveNewsletterDto), and a
 * reference link the reader follows to the full article — same shape as
 * jicamaTech's own newsletter module.
 */
@Schema({ collection: 'newsletters', timestamps: true })
export class Newsletter {
  @Prop({ type: String, required: true })
  title!: string;

  @Prop({ type: String, required: true })
  image!: string;

  @Prop({ type: String, required: false, default: '' })
  imageAlt!: string;

  // Plain-text body, capped at 500 words (enforced in the DTO).
  @Prop({ type: String, required: true })
  message!: string;

  // Where "Read full article" sends the reader — any URL, not necessarily
  // one of this site's own blog posts.
  @Prop({ type: String, required: true })
  referenceLink!: string;

  @Prop({ type: Boolean, required: true, default: false })
  published!: boolean;

  @Prop({ type: Date })
  createdAt?: Date;

  @Prop({ type: Date })
  updatedAt?: Date;
}

export const NewsletterSchema = SchemaFactory.createForClass(Newsletter);
NewsletterSchema.index({ published: 1, createdAt: -1 });
