import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type JobApplicationDocument = HydratedDocument<JobApplication>;

/**
 * Mirrors Frontend/prisma/schema.prisma's `JobApplication` model 1:1.
 * `jobTitle` is denormalized at import time (the old admin page joined it
 * anyway) so the applications list never needs a second query.
 */
@Schema({ collection: 'job-applications', timestamps: true })
export class JobApplication {
  @Prop({ type: String, required: false, unique: true, sparse: true })
  legacyId?: string;

  @Prop({ type: String, required: true })
  name!: string;

  @Prop({ type: String, required: true })
  email!: string;

  @Prop({ type: String, required: true })
  phone!: string;

  @Prop({ type: String, required: false, default: null })
  linkedin!: string | null;

  @Prop({ type: String, required: false, default: null })
  portfolio!: string | null;

  @Prop({ type: String, required: true })
  coverLetter!: string;

  /** Bare `<uuid><ext>` filename under the résumé dir — never the uploader's
   * original name, never a path (see careers.service.ts upload notes). */
  @Prop({ type: String, required: false, default: null })
  resumePath!: string | null;

  @Prop({ type: String, required: false, default: null })
  resumeName!: string | null;

  /** received | screening | interview | offer | rejected */
  @Prop({ type: String, required: true, default: 'received', index: true })
  status!: string;

  @Prop({ type: Types.ObjectId, ref: 'JobPosting', required: true })
  jobId!: Types.ObjectId;

  @Prop({ type: String, required: true })
  jobTitle!: string;

  @Prop({ type: Date })
  createdAt?: Date;

  @Prop({ type: Date })
  updatedAt?: Date;
}

export const JobApplicationSchema = SchemaFactory.createForClass(JobApplication);
JobApplicationSchema.index({ jobId: 1, status: 1 });
JobApplicationSchema.index({ createdAt: -1 });
