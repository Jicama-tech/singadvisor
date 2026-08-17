import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type JobPostingDocument = HydratedDocument<JobPosting>;

/**
 * Mirrors Frontend/prisma/schema.prisma's `JobPosting` model 1:1, re-expressed
 * as a MongoDB document. `requirements`/`benefits` are real string arrays
 * (Prisma stored them as JSON-encoded strings), `legacyId` is the import key.
 */
@Schema({ collection: 'job-postings', timestamps: true })
export class JobPosting {
  @Prop({ type: String, required: false, unique: true, sparse: true })
  legacyId?: string;

  @Prop({ type: String, required: true, unique: true })
  slug!: string;

  @Prop({ type: String, required: true })
  title!: string;

  @Prop({ type: String, required: true, default: 'General' })
  department!: string;

  @Prop({ type: String, required: true, default: 'Singapore' })
  location!: string;

  /** Full-time | Part-time | Contract | Internship */
  @Prop({ type: String, required: true, default: 'Full-time' })
  employment!: string;

  /** On-site | Remote | Hybrid */
  @Prop({ type: String, required: true, default: 'On-site' })
  workMode!: string;

  @Prop({ type: String, required: true, default: '2-4 years' })
  experience!: string;

  @Prop({ type: Number, required: false, default: null })
  salaryMin!: number | null;

  @Prop({ type: Number, required: false, default: null })
  salaryMax!: number | null;

  @Prop({ type: String, required: true, default: 'SGD' })
  currency!: string;

  @Prop({ type: String, required: false, default: '' })
  summary!: string;

  @Prop({ type: String, required: false, default: '' })
  description!: string;

  @Prop({ type: [String], default: [] })
  requirements!: string[];

  @Prop({ type: [String], default: [] })
  benefits!: string[];

  @Prop({ type: Boolean, required: true, default: true })
  published!: boolean;

  @Prop({ type: Date, required: false, default: null })
  closesAt!: Date | null;

  @Prop({ type: Date })
  createdAt?: Date;

  @Prop({ type: Date })
  updatedAt?: Date;
}

export const JobPostingSchema = SchemaFactory.createForClass(JobPosting);
JobPostingSchema.index({ department: 1, published: 1 });
