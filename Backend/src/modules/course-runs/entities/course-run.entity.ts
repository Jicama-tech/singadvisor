import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
// Reference fields across the LMS entities use `SchemaTypes.ObjectId`, not the
// `Types.ObjectId` used elsewhere in this codebase: @nestjs/mongoose builds the
// latter as a Mixed path, which casts nothing and accepts a string id — and a
// string id slips past the unique indexes that stop double enrolment and
// double-counted attendance, because "abc…" and ObjectId("abc…") never collide.
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';

export type CourseRunDocument = HydratedDocument<CourseRun>;

/**
 * A dated intake of a `Training`.
 *
 * `Training` is a brochure — it has no dates, no capacity and no trainer on the
 * day. Everything the practice actually sells is a *run*: this cohort, starting
 * this date, in this room, with this trainer, capped at this many seats. A run
 * owns its `CourseRunSession` children; nothing here duplicates the marketing
 * copy, which stays on the Training and is joined at read time.
 *
 * Two fields exist earlier than they look necessary, both deliberately:
 *
 * `fundingScheme` forks the entire record. An SSG-funded run needs a TGS course
 * reference, NRIC-keyed enrolment, Singpass e-attendance, statutory submission
 * deadlines and audit retention; an unfunded corporate run needs none of it.
 * Retrofitting that fork after enrolments exist is a multi-collection rewrite,
 * so it lands in the first schema change and defaults to 'none'.
 *
 * `seatsTaken` is denormalized because this deployment runs a standalone mongod
 * (see MONGO_URI in app.module.ts), so multi-document transactions are not
 * available. Allocation instead uses a single guarded atomic update —
 * findOneAndUpdate({ _id, seatsTaken: { $lt: capacity } }, { $inc: { seatsTaken: 1 } })
 * — which is race-free on one document. Reading capacity by counting Enrolments
 * would reintroduce exactly the check-then-act race this avoids.
 */
@Schema({ collection: 'courseruns', timestamps: true })
export class CourseRun {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Training', required: true, index: true })
  trainingId!: Types.ObjectId;

  /** Denormalized for admin lists and the sponsor report, exactly as
   * Registration.trainingTitle does — both are read far more than Training is
   * renamed, and the report must stay truthful after a rename. */
  @Prop({ type: String, required: true })
  trainingTitle!: string;

  /** Human-facing reference quoted on invoices, joining emails and the sponsor
   * report (e.g. "MT-2026-03"). Employers cite this when claiming Absentee
   * Payroll, so it must be stable once published. */
  @Prop({ type: String, required: true, unique: true })
  runCode!: string;

  /** draft | open | closed | running | completed | cancelled */
  @Prop({ type: String, required: true, default: 'draft', index: true })
  status!: string;

  /** In-person | Online | Hybrid — mirrors Training.format, but a run may be
   * delivered differently from how the brochure describes the programme. */
  @Prop({ type: String, required: true, default: 'In-person' })
  mode!: string;

  @Prop({ type: String, required: false, default: null })
  venue!: string | null;

  @Prop({ type: String, required: false, default: null })
  address!: string | null;

  /** Zoom/Teams link for Online or Hybrid runs. Surfaced only on the joining
   * page, never in the public listing. */
  @Prop({ type: String, required: false, default: null })
  joinUrl!: string | null;

  @Prop({ type: Number, required: true, default: 20 })
  capacity!: number;

  /** Maintained by the guarded atomic allocation described above. Never
   * recomputed from a count — see the class doc comment. */
  @Prop({ type: Number, required: true, default: 0 })
  seatsTaken!: number;

  @Prop({ type: Date, required: false, default: null })
  registrationOpensAt!: Date | null;

  @Prop({ type: Date, required: false, default: null })
  registrationClosesAt!: Date | null;

  /** Denormalized from the first and last CourseRunSession so the catalogue can
   * sort and filter runs without loading their sessions. Recomputed whenever a
   * session is added, moved or removed — the sessions are the source of truth. */
  @Prop({ type: Date, required: false, default: null })
  startsAt!: Date | null;

  @Prop({ type: Date, required: false, default: null })
  endsAt!: Date | null;

  /** Total claimable hours across sessions. Stored rather than derived from
   * startsAt/endsAt because breaks and lunch are not claimable — see
   * CourseRunSession.durationHours. */
  @Prop({ type: Number, required: true, default: 0 })
  totalHours!: number;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Trainer', required: false, default: null })
  trainerId!: Types.ObjectId | null;

  /** none | ssg | ibf — the fork described in the class doc comment. */
  @Prop({ type: String, required: true, default: 'none', index: true })
  fundingScheme!: string;

  /** SSG's TGS course reference. Required before a funded run may be published;
   * a learner quotes it with `runCode` to claim SkillsFuture Credit. */
  @Prop({ type: String, required: false, default: null })
  tgsCourseRef!: string | null;

  /** SSG's own identifier for this run once it is registered on TPGateway.
   * Needed to reconcile Singpass e-attendance scans back to our sessions. */
  @Prop({ type: String, required: false, default: null })
  ssgCourseRunId!: string | null;

  @Prop({ type: String, required: true, default: 'SGD' })
  currency!: string;

  /** The published, unsubsidised fee. GST on funded courses is customarily
   * computed on this figure, not on the nett fee, which is why a single
   * `priceCents` cannot express a subsidised price. */
  @Prop({ type: Number, required: true, default: 0 })
  fullFeeCents!: number;

  @Prop({ type: Number, required: true, default: 0 })
  subsidyCents!: number;

  /** What the learner or employer actually pays: fullFeeCents - subsidyCents. */
  @Prop({ type: Number, required: true, default: 0 })
  nettFeeCents!: number;

  @Prop({ type: Number, required: true, default: 0 })
  gstCents!: number;

  /** Snapshot label for the curriculum this run taught (e.g. "2026 syllabus").
   * A completion record must stay truthful after the course is revised. */
  @Prop({ type: String, required: false, default: null })
  versionLabel!: string | null;

  @Prop({ type: Boolean, required: true, default: false })
  published!: boolean;

  /** Internal only — never rendered publicly. */
  @Prop({ type: String, required: false, default: null })
  notes!: string | null;

  @Prop({ type: Date })
  createdAt?: Date;

  @Prop({ type: Date })
  updatedAt?: Date;
}

export const CourseRunSchema = SchemaFactory.createForClass(CourseRun);
// The catalogue query: published runs for a training, soonest first.
CourseRunSchema.index({ trainingId: 1, published: 1, startsAt: 1 });
// The admin overview and the submission-deadline countdown both scan by date.
CourseRunSchema.index({ startsAt: -1 });
CourseRunSchema.index({ status: 1, startsAt: 1 });
