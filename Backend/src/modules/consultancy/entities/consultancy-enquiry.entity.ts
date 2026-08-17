import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ConsultancyEnquiryDocument = HydratedDocument<ConsultancyEnquiry>;

/**
 * Mirrors Frontend/prisma/schema.prisma's `ConsultancyEnquiry` model 1:1.
 * `serviceTitle` is denormalized at import time (the old admin page joined it
 * anyway) so the list view never needs a second query.
 */
@Schema({ collection: 'consultancy-enquiries', timestamps: true })
export class ConsultancyEnquiry {
  @Prop({ type: String, required: false, unique: true, sparse: true })
  legacyId?: string;

  @Prop({ type: String, required: true })
  name!: string;

  @Prop({ type: String, required: true })
  email!: string;

  @Prop({ type: String, required: true })
  phone!: string;

  @Prop({ type: String, required: true })
  company!: string;

  /** 1-10 | 11-50 | 51-200 | 200+ */
  @Prop({ type: String, required: false, default: null })
  companySize!: string | null;

  @Prop({ type: String, required: false, default: null })
  budget!: string | null;

  @Prop({ type: String, required: false, default: null })
  timeline!: string | null;

  @Prop({ type: String, required: true })
  message!: string;

  /** new | contacted | won | lost */
  @Prop({ type: String, required: true, default: 'new', index: true })
  status!: string;

  @Prop({ type: Types.ObjectId, ref: 'ConsultancyService', default: null })
  serviceId!: Types.ObjectId | null;

  @Prop({ type: String, required: false, default: null })
  serviceTitle!: string | null;

  @Prop({ type: Date })
  createdAt?: Date;

  @Prop({ type: Date })
  updatedAt?: Date;
}

export const ConsultancyEnquirySchema = SchemaFactory.createForClass(ConsultancyEnquiry);
ConsultancyEnquirySchema.index({ createdAt: -1 });
