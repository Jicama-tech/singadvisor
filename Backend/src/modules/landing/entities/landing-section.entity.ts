import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';

/**
 * The nine sections of the public homepage, in their default display order.
 * Kept as a const union (not a free-form string) so an invalid key can never
 * be written — every route that takes a `key` param is typed against this.
 */
export const LANDING_SECTION_KEYS = [
  'hero',
  'stats',
  'pillars',
  'trainings',
  'events',
  'consultancy',
  'careers',
  'blog',
  'cta',
] as const;

export type LandingSectionKey = (typeof LANDING_SECTION_KEYS)[number];

/**
 * Three visual treatments, offered consistently across every section rather
 * than eventsh's approach of only varying 4 of ~12 areas. "modern" is always
 * exactly what shipped before this existed — the seed default, and what
 * every section falls back to.
 */
export const LANDING_VARIANTS = ['modern', 'minimal', 'bold'] as const;
export type LandingVariant = (typeof LANDING_VARIANTS)[number];

export type LandingSectionDocument = HydratedDocument<LandingSection>;

/**
 * One row per homepage section. `content`'s actual shape depends on `key` —
 * validated per-key at the DTO layer (dto/*.dto.ts), not here. Mongo stores
 * it as a native nested object (Mixed), unlike the JSON-encoded-string
 * columns the legacy Prisma/SQLite models use for the same kind of data —
 * one of the reasons this lives on the Mongo side rather than extending the
 * old schema.
 */
@Schema({ collection: 'landing-sections' })
export class LandingSection {
  @Prop({ type: String, required: true, unique: true, enum: LANDING_SECTION_KEYS })
  key!: LandingSectionKey;

  @Prop({ type: Boolean, required: true, default: true })
  visible!: boolean;

  @Prop({ type: Number, required: true, default: 0 })
  sortOrder!: number;

  @Prop({ type: String, required: true, enum: LANDING_VARIANTS, default: 'modern' })
  variant!: LandingVariant;

  @Prop({ type: MongooseSchema.Types.Mixed, required: true })
  content!: Record<string, unknown>;
}

export const LandingSectionSchema = SchemaFactory.createForClass(LandingSection);
