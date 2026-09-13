import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';

export type TrainingDocument = HydratedDocument<Training>;

/**
 * Mirrors Frontend/prisma/schema.prisma's `Training` model 1:1, re-expressed
 * as a MongoDB document instead of a SQLite row. Two deliberate differences:
 * `outcomes`/`modules` are real string arrays (Prisma stored them as
 * JSON-encoded strings for portability), and `legacyId` preserves the old
 * Prisma cuid so the import script can upsert without duplicating.
 */
@Schema({ collection: 'trainings', timestamps: true })
export class Training {
  /** The Prisma cuid this row had before migration — import key, not a new id. */
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

  /** Student | Corporate | Professional */
  @Prop({ type: String, required: true, default: 'Student' })
  category!: string;

  @Prop({ type: String, required: true, default: 'All levels' })
  level!: string;

  @Prop({ type: Number, required: true, default: 2 })
  durationHrs!: number;

  /** In-person | Online | Hybrid */
  @Prop({ type: String, required: true, default: 'In-person' })
  format!: string;

  /**
   * Where an Online or Hybrid course is actually run from: the Google
   * Classroom link a confirmed registrant is emailed. Hybrid carries this and
   * not an address deliberately — a hybrid course here is still run out of the
   * classroom, and whoever chooses to sit in the room does not need a link
   * posted to them.
   *
   * A capability, not a description. Anyone holding this link can join the
   * class, so it never appears in a public response: both public readers
   * project it away (TrainingsService' PRIVATE_TRAINING_FIELDS), and the only
   * way it leaves this Backend is inside a confirmed registrant's own email.
   * Same standing, and the same treatment, as CourseRun.joinUrl.
   *
   * Null until the classroom exists — a course can be published, and places
   * taken on it, well before anyone opens one.
   */
  @Prop({ type: String, required: false, default: null })
  googleClassroomLink!: string | null;

  /**
   * Where an In-person course is held, as one block of free text the
   * confirmation email prints as it was typed. One field rather than
   * CourseRun's venue/address pair: the course form asks the admin for the one
   * thing an attendee needs — where to turn up — and a run is the place to
   * describe a sitting in more detail.
   *
   * Not a secret; a street address is exactly what a public page for an
   * in-person course may say. It is kept off both public reads only because
   * neither page renders it — see TrainingsService' PRIVATE_TRAINING_FIELDS,
   * which is where to undo that if one ever does. Null until the room is
   * booked.
   */
  @Prop({ type: String, required: false, default: null })
  venueAddress!: string | null;

  /** Minor units — 0 renders as "Free" on the public page. */
  @Prop({ type: Number, required: true, default: 0 })
  priceCents!: number;

  @Prop({ type: String, required: true, default: 'SGD' })
  currency!: string;

  @Prop({ type: [String], default: [] })
  outcomes!: string[];

  @Prop({ type: [String], default: [] })
  modules!: string[];

  @Prop({ type: Boolean, required: true, default: true })
  published!: boolean;

  @Prop({ type: Boolean, required: true, default: false })
  featured!: boolean;

  @Prop({ type: Number, required: true, default: 0 })
  sortOrder!: number;

  /**
   * Everyone who facilitates this course, in the order the admin arranged
   * them — the public page credits them in that order, so this is a list and
   * not a set. Replaces the single `trainerId`, which stays in the existing
   * documents (see scripts/migrate-trainer-ids.ts) but is no longer read.
   *
   * Declared with `SchemaTypes.ObjectId` rather than the `Types.ObjectId` the
   * old field used, following the newer LMS entities: @nestjs/mongoose builds
   * `Types.ObjectId` as a Mixed path (see course-run.entity.ts), which casts
   * nothing and so will store the string form of an id just as readily as the
   * id. That ambiguity is exactly what TrainersService.usage() has to defend
   * against when it counts who still references a facilitator, and a field
   * introduced today should not add more of it.
   */
  @Prop({ type: [SchemaTypes.ObjectId], ref: 'Trainer', default: [] })
  trainerIds!: Types.ObjectId[];

  @Prop({ type: Date })
  createdAt?: Date;

  @Prop({ type: Date })
  updatedAt?: Date;
}

export const TrainingSchema = SchemaFactory.createForClass(Training);
TrainingSchema.index({ category: 1, published: 1 });
