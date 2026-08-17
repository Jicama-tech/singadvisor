import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type SubscriberDocument = HydratedDocument<Subscriber>;

/**
 * Mirrors Frontend/prisma/schema.prisma's `Subscriber` model 1:1. Write-only
 * from the API's point of view: the newsletter form subscribes/unsubscribes
 * by re-activating a row, and no admin list page exists upstream, so nothing
 * reads this collection through the API.
 */
@Schema({ collection: 'subscribers', timestamps: true })
export class Subscriber {
  @Prop({ type: String, required: false, unique: true, sparse: true })
  legacyId?: string;

  @Prop({ type: String, required: true, unique: true, lowercase: true, trim: true })
  email!: string;

  @Prop({ type: Boolean, required: true, default: true })
  active!: boolean;

  @Prop({ type: Date })
  createdAt?: Date;

  @Prop({ type: Date })
  updatedAt?: Date;
}

export const SubscriberSchema = SchemaFactory.createForClass(Subscriber);
