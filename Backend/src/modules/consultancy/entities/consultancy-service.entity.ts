import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ConsultancyServiceDocument = HydratedDocument<ConsultancyService>;

/**
 * Mirrors Frontend/prisma/schema.prisma's `ConsultancyService` model 1:1,
 * re-expressed as a MongoDB document. `deliverables`/`idealFor` are real
 * string arrays (Prisma stored them as JSON-encoded strings), and `legacyId`
 * preserves the old cuid for the import script's upsert key.
 */
@Schema({ collection: 'consultancy-services', timestamps: true })
export class ConsultancyService {
  @Prop({ type: String, required: false, unique: true, sparse: true })
  legacyId?: string;

  @Prop({ type: String, required: true, unique: true })
  slug!: string;

  @Prop({ type: String, required: true })
  title!: string;

  @Prop({ type: String, required: false, default: '' })
  summary!: string;

  @Prop({ type: String, required: false, default: '' })
  description!: string;

  @Prop({ type: String, required: false, default: '' })
  image!: string;

  @Prop({ type: String, required: true, default: 'compass' })
  icon!: string;

  /** Retainer | Project-based | Advisory */
  @Prop({ type: String, required: true, default: 'Project-based' })
  engagement!: string;

  @Prop({ type: [String], default: [] })
  deliverables!: string[];

  @Prop({ type: [String], default: [] })
  idealFor!: string[];

  @Prop({ type: Boolean, required: true, default: true })
  published!: boolean;

  @Prop({ type: Number, required: true, default: 0 })
  sortOrder!: number;

  @Prop({ type: Date })
  createdAt?: Date;

  @Prop({ type: Date })
  updatedAt?: Date;
}

export const ConsultancyServiceSchema = SchemaFactory.createForClass(ConsultancyService);
