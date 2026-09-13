import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
// SchemaTypes.ObjectId, not Types.ObjectId — see course-run.entity.ts.
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';

/**
 * The item types the builder offers, in the order its "Add item" picker lists
 * them. A const union (the LANDING_SECTION_KEYS shape) rather than a free
 * string: `kind` decides which payload fields on this document are even
 * meaningful, so an unknown value is not a bad status — it is an item nothing
 * can render. Hence `enum:` on the prop as well as @IsIn on the DTO.
 */
export const COURSE_ITEM_KINDS = [
  'video',
  'reading',
  'quiz',
  'assignment',
  'discussion',
  'resource',
] as const;
export type CourseItemKind = (typeof COURSE_ITEM_KINDS)[number];

/** immediately | after-previous | on-day — see CourseItem.releaseRule. */
export const RELEASE_RULES = ['immediately', 'after-previous', 'on-day'] as const;
/** file | text | link | offline — see CourseItem.submissionType. */
export const SUBMISSION_TYPES = ['file', 'text', 'link', 'offline'] as const;
/** single | multiple | true-false — see QuizQuestion.type. */
export const QUIZ_QUESTION_TYPES = ['single', 'multiple', 'true-false'] as const;
/** youtube | vimeo | file — see CourseItem.videoProvider. */
export const VIDEO_PROVIDERS = ['youtube', 'vimeo', 'file'] as const;

export type CourseItemDocument = HydratedDocument<CourseItem>;

/**
 * One answer on a quiz question. Embedded with a client-visible string `id`
 * minted by the service (`id || randomUUID()`), not a Mongo _id — the same
 * convention EventsService uses for ticket tiers and speaker rows, so the
 * builder can key React rows and reorder them locally, and a future answer
 * record keeps pointing at the same option after its text is corrected.
 */
@Schema({ _id: false })
export class QuizOption {
  @Prop({ type: String, required: true })
  id!: string;

  @Prop({ type: String, required: true })
  text!: string;

  @Prop({ type: Boolean, required: true, default: false })
  correct!: boolean;
}
export const QuizOptionSchema = SchemaFactory.createForClass(QuizOption);

/**
 * A question on a quiz item. Embedded rather than its own collection: a
 * question has no life outside its quiz, is never queried on its own, and is
 * always saved as part of the one item the author has open — the test the
 * event agenda passes and CourseRunSession fails. Capped at 100 per item in
 * the DTO, which keeps even a long quiz far under the 16MB document ceiling.
 */
@Schema({ _id: false })
export class QuizQuestion {
  @Prop({ type: String, required: true })
  id!: string;

  /** single | multiple | true-false */
  @Prop({ type: String, required: true, default: 'single' })
  type!: string;

  @Prop({ type: String, required: true })
  prompt!: string;

  @Prop({ type: [QuizOptionSchema], default: [] })
  options!: QuizOption[];

  /** Shown after the attempt, whichever way it went. Never sent to a public
   * caller — see CourseContentService.publicItem.
   *
   * `required: false` with an empty default, the convention every optional
   * string in this codebase uses: Mongoose's `required` validator treats '' as
   * missing on a String path, so `required: true, default: ''` rejects its own
   * default and every question without an explanation fails to save. */
  @Prop({ type: String, required: false, default: '' })
  explanation!: string;

  @Prop({ type: Number, required: true, default: 1 })
  points!: number;
}
export const QuizQuestionSchema = SchemaFactory.createForClass(QuizQuestion);

/**
 * A downloadable or a link that hangs off any item — slides under a video, a
 * worksheet under a reading, the whole payload of a `resource` item. `url` is
 * a relative /uploads/course-media/... path from UploadsController or an
 * external https link, the same convention BlogPost.coverImage uses.
 */
@Schema({ _id: false })
export class CourseAttachment {
  @Prop({ type: String, required: true })
  id!: string;

  @Prop({ type: String, required: true })
  label!: string;

  @Prop({ type: String, required: true })
  url!: string;
}
export const CourseAttachmentSchema = SchemaFactory.createForClass(CourseAttachment);

/**
 * One item in the outline — a video, reading, quiz, assignment, discussion
 * prompt or downloadable resource.
 *
 * Flat and polymorphic rather than a Mixed `content` blob: the global
 * ValidationPipe runs with `whitelist: true` (main.ts), so every writable
 * field has to be declared on a DTO anyway, and declaring it here means
 * Mongoose casts and defaults it too. Which fields matter is decided by
 * `kind`, enforced in CourseContentService.assertItemCoherent — against the
 * item as it will be AFTER the write, not just the fields in the request,
 * which is why the rule is not in the DTO (the assertRunCoherent precedent).
 *
 * The cost, stated plainly: a `resource` document carries passMarkPct: 70 and
 * videoProvider: 'youtube' from schema defaults. A consumer must check `kind`
 * before trusting any payload field. At six kinds that is the better trade
 * than a DTO per kind; at fifteen it would not be.
 */
@Schema({ collection: 'courseitems', timestamps: true })
export class CourseItem {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'CourseModule', required: true, index: true })
  courseModuleId!: Types.ObjectId;

  /** Denormalized one level up, exactly as Enrolment carries trainingId and
   * SessionAttendance carries courseRunId: the builder tree, the public
   * curriculum read and the Content tab's counters all want every item of one
   * training in a single query rather than a lookup through every module. An
   * item may move between modules of the same training but never between
   * trainings, so this is effectively immutable once written. */
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Training', required: true, index: true })
  trainingId!: Types.ObjectId;

  /** Position within the module. See CourseModule.sortOrder for why this is
   * not unique-indexed and why every read sorts { sortOrder: 1, _id: 1 }. */
  @Prop({ type: Number, required: true, default: 0 })
  sortOrder!: number;

  /**
   * Coursera groups a module's items into named "lessons". Rather than a third
   * collection — with a third reorder scope and orphan lessons to clean up — a
   * lesson is a DIVIDER: a non-null heading on the item that opens the group,
   * rendered above it and inherited by every item after it until the next one.
   * Dragging across a divider therefore needs no extra bookkeeping, and an
   * empty lesson is not representable.
   *
   * The one rule this costs: when the item carrying a heading leaves its
   * module (deleted, or moved elsewhere), the heading is bequeathed to the
   * item that follows it in that module — unless that item already has its
   * own. See CourseContentService.bequeathHeading, which is called before
   * every delete and before every cross-module move.
   */
  @Prop({ type: String, required: false, default: null })
  lessonHeading!: string | null;

  @Prop({ type: String, required: true, enum: COURSE_ITEM_KINDS })
  kind!: CourseItemKind;

  @Prop({ type: String, required: true })
  title!: string;

  /** See QuizQuestion.explanation for why an optional string is
   * `required: false` with an empty default rather than `required: true`. */
  @Prop({ type: String, required: false, default: '' })
  summary!: string;

  /**
   * Author-stated length in MINUTES, shown against the item in the outline
   * ("8 min") and summed per module and per course.
   *
   * Minutes on purpose. CourseRunSession.durationHours is claimable training
   * hours that SSG audits and that an employer puts on an Absentee Payroll
   * claim. This is marketing copy that nothing measures. The different unit is
   * the guardrail: the two must never be summed together.
   */
  @Prop({ type: Number, required: true, default: 0 })
  estimatedMins!: number;

  // ── Release ───────────────────────────────────────────────────────────────

  /** immediately | after-previous | on-day */
  @Prop({ type: String, required: true, default: 'immediately' })
  releaseRule!: string;

  /**
   * 1-based day offset from the run's first session, used only when
   * releaseRule is 'on-day'. A Date cannot live here: the curriculum belongs
   * to the Training and is taught by many CourseRuns, so "day 15" is the only
   * form of a release date that survives the next intake. Resolved against
   * CourseRun.startsAt at read time, never stored resolved.
   */
  @Prop({ type: Number, required: false, default: null })
  releaseOnDay!: number | null;

  /** Counted towards neither the grade nor the completion requirement. */
  @Prop({ type: Boolean, required: true, default: false })
  optional!: boolean;

  /** Visible in full on the public training page before anyone enrols — the
   * free-preview item, and the only reason an unenrolled visitor ever sees an
   * item's body or video URL. */
  @Prop({ type: Boolean, required: true, default: false })
  previewFree!: boolean;

  @Prop({ type: Boolean, required: true, default: false })
  published!: boolean;

  // ── Grading ───────────────────────────────────────────────────────────────

  @Prop({ type: Boolean, required: true, default: false })
  graded!: boolean;

  /** Percentage points of the final grade. The builder shows the running total
   * across a course and warns when it is not 100; deliberately NOT rejected
   * server-side, because every intermediate state of a legitimate re-weighting
   * is invalid. */
  @Prop({ type: Number, required: true, default: 0 })
  gradeWeight!: number;

  @Prop({ type: Number, required: true, default: 70 })
  passMarkPct!: number;

  // ── kind: video ───────────────────────────────────────────────────────────

  /** A watch URL (YouTube/Vimeo) or an /uploads/course-media/... path. */
  @Prop({ type: String, required: false, default: null })
  videoUrl!: string | null;

  /** youtube | vimeo | file. `file` means a path under uploads/, which
   * useStaticAssets serves to the world with NO guard (main.ts) — fine for
   * a marketing preview, never for gated paid content. The editor says so. */
  @Prop({ type: String, required: true, default: 'youtube' })
  videoProvider!: string;

  // ── kind: reading | assignment | discussion ───────────────────────────────

  /** Sanitized rich HTML from RichTextEditor: the reading itself, the
   * assignment brief, or the discussion prompt. One field for all three
   * because they are the same thing to both the editor and the renderer
   * (<ArticleBody> in every case). `required: false` for the reason given on
   * QuizQuestion.explanation — a brand-new reading has no body yet. */
  @Prop({ type: String, required: false, default: '' })
  body!: string;

  // ── kind: quiz ────────────────────────────────────────────────────────────

  @Prop({ type: [QuizQuestionSchema], default: [] })
  questions!: QuizQuestion[];

  /** 0 means unlimited. */
  @Prop({ type: Number, required: true, default: 1 })
  attemptsAllowed!: number;

  @Prop({ type: Boolean, required: true, default: false })
  shuffleQuestions!: boolean;

  // ── kind: assignment ──────────────────────────────────────────────────────

  /** file | text | link | offline */
  @Prop({ type: String, required: true, default: 'file' })
  submissionType!: string;

  /** Day offset from the run's first session — same reasoning as releaseOnDay. */
  @Prop({ type: Number, required: false, default: null })
  dueOnDay!: number | null;

  // ── any kind ──────────────────────────────────────────────────────────────

  @Prop({ type: [CourseAttachmentSchema], default: [] })
  attachments!: CourseAttachment[];

  @Prop({ type: Date })
  createdAt?: Date;

  @Prop({ type: Date })
  updatedAt?: Date;
}

export const CourseItemSchema = SchemaFactory.createForClass(CourseItem);
// The outline read: one module's items, in order.
CourseItemSchema.index({ courseModuleId: 1, sortOrder: 1 });
// The whole-tree read and the public curriculum read — every item of one
// training in one query, then bucketed by module in memory. No sortOrder
// suffix: sortOrder is scoped per module, so a training-wide sort on it orders
// nothing coherent.
CourseItemSchema.index({ trainingId: 1, published: 1 });
