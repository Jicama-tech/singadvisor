import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
// SchemaTypes.ObjectId, not Types.ObjectId — see course-run.entity.ts.
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';

export type CourseModuleDocument = HydratedDocument<CourseModule>;

/**
 * One module (a week, a unit, a theme) of a Training's curriculum — the top
 * level of the outline an admin builds under Trainings → Content.
 *
 * It hangs off `Training`, not `CourseRun`, for the reason CourseRun.versionLabel
 * already gives: a run records *which* syllabus it taught, it does not own one.
 * A Training is taught by many intakes; authoring the curriculum per run would
 * mean re-authoring every video and quiz for each one.
 *
 * Named CourseModule, collection `coursemodules`: `Module` is @nestjs/common's
 * decorator, imported at the top of every module file, and `Training.modules`
 * is already the flat brochure "Session outline". This collection NEVER writes
 * that field — the one bridge is CourseContentService.seedFromOutline, which
 * only reads it.
 */
@Schema({ collection: 'coursemodules', timestamps: true })
export class CourseModule {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Training', required: true, index: true })
  trainingId!: Types.ObjectId;

  /**
   * Position in the outline. `sortOrder` and NOT `sequence`, and deliberately
   * NOT unique on (trainingId, sortOrder), unlike CourseRunSession.sequence:
   * that one is claim-bearing (a duplicate double-counts funded hours), this
   * one is cosmetic. Reordering here is a drag-anywhere rewrite of the whole
   * outline in one bulkWrite, and this deployment has no transactions
   * (standalone mongod — see MONGO_URI in app.module.ts), so a unique index
   * would reject the legitimate intermediate state of a reorder. The reorder
   * endpoint renumbers to 1..n; a newly created row gets max+1. Ties are
   * broken deterministically by _id — EVERY read sorts { sortOrder: 1, _id: 1 }.
   */
  @Prop({ type: Number, required: true, default: 0 })
  sortOrder!: number;

  @Prop({ type: String, required: true })
  title!: string;

  /** The blurb shown above a module's item list.
   *
   * `required: false` with an empty default, the convention every optional
   * string in this codebase uses: Mongoose's `required` validator treats '' as
   * missing on a String path, so `required: true, default: ''` rejects its own
   * default — every module created without a blurb (including every one
   * seedFromOutline mints) would fail to save. */
  @Prop({ type: String, required: false, default: '' })
  summary!: string;

  /** An unpublished module and everything inside it stays out of every public
   * read, so a week can be built over several sittings without leaking half of
   * itself. Independent of Training.published, which gates the brochure. */
  @Prop({ type: Boolean, required: true, default: false })
  published!: boolean;

  @Prop({ type: Date })
  createdAt?: Date;

  @Prop({ type: Date })
  updatedAt?: Date;
}

export const CourseModuleSchema = SchemaFactory.createForClass(CourseModule);
// The outline read and the public curriculum read: one training's modules in
// display order.
CourseModuleSchema.index({ trainingId: 1, sortOrder: 1 });
