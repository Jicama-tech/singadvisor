import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
// SchemaTypes.ObjectId, not Types.ObjectId — see course-run.entity.ts.
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';

export type CourseRunSessionDocument = HydratedDocument<CourseRunSession>;

/**
 * One sitting of a `CourseRun` — a single evening, morning or full day.
 *
 * This collection is the reason the run model is not simply a startsAt/endsAt
 * pair, and it is the one part of the spine that cannot be retrofitted cheaply
 * once attendance exists. Three separate requirements are all per-session:
 *
 *  - SSG attendance. Since 1 Oct 2023 Singpass e-attendance is the default for
 *    physical and synchronous e-learning: SSG generates a QR *per session*, the
 *    trainee scans within ±30 minutes of it. A run-level record cannot be
 *    submitted and cannot be reconciled.
 *  - Absentee Payroll. Employers claim a flat rate per *hour attended*, so the
 *    claimable figure is a sum over sessions, not a percentage of a course.
 *  - Real programmes. An eight-week Tuesday-evening course is eight rows here;
 *    a single date range cannot express it at all.
 */
@Schema({ collection: 'courserunsessions', timestamps: true })
export class CourseRunSession {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'CourseRun', required: true, index: true })
  courseRunId!: Types.ObjectId;

  /** 1-based running order within the run. Kept explicit rather than sorting by
   * startsAt so a session can be rescheduled without renumbering the syllabus
   * the learners were given. */
  @Prop({ type: Number, required: true })
  sequence!: number;

  @Prop({ type: String, required: true })
  title!: string;

  @Prop({ type: Date, required: true })
  startsAt!: Date;

  @Prop({ type: Date, required: true })
  endsAt!: Date;

  /**
   * Claimable training hours for this session — stored, never derived from
   * startsAt/endsAt. A 9am-5pm day is 8 hours on the clock but 7 claimable
   * hours once lunch is excluded, and it is the claimable figure an employer
   * puts on an Absentee Payroll claim and that SSG audits.
   */
  @Prop({ type: Number, required: true })
  durationHours!: number;

  /** In-person | Online — a Hybrid run is a run whose sessions differ, which is
   * why mode lives here as well as on CourseRun. */
  @Prop({ type: String, required: true, default: 'In-person' })
  mode!: string;

  /** Null falls back to the run's venue; set only when this sitting moves. */
  @Prop({ type: String, required: false, default: null })
  venue!: string | null;

  @Prop({ type: String, required: false, default: null })
  joinUrl!: string | null;

  /** A co-trainer or substitute for this sitting only. Null means the run's
   * trainer. TPQA assesses trainer qualifications per course, so a funded run
   * must be able to say who actually stood in the room on each date. */
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Trainer', required: false, default: null })
  trainerId!: Types.ObjectId | null;

  /** SSG's identifier for this session's e-attendance QR, once the run is
   * registered on TPGateway. The reconciliation key between a scan SSG reports
   * and the SessionAttendance row we hold. */
  @Prop({ type: String, required: false, default: null })
  ssgSessionId!: string | null;

  /**
   * Scanned signature sheet for the whole sitting. SSG expects providers to
   * retain a hardcopy fallback even where Singpass is the primary capture.
   *
   * Stored under the guarded RESUME_DIR-style tree, never under `uploads/` —
   * see the note on SessionAttendance.evidencePath for why.
   */
  @Prop({ type: String, required: false, default: null })
  hardcopySheetPath!: string | null;

  @Prop({ type: Boolean, required: true, default: false })
  cancelled!: boolean;

  @Prop({ type: Date })
  createdAt?: Date;

  @Prop({ type: Date })
  updatedAt?: Date;
}

export const CourseRunSessionSchema =
  SchemaFactory.createForClass(CourseRunSession);
// Sessions are always read as an ordered set for one run, and the sequence must
// be unique within it — a duplicate would silently double-count claimable hours.
CourseRunSessionSchema.index({ courseRunId: 1, sequence: 1 }, { unique: true });
// The attendance-window query: which sessions are happening around now.
CourseRunSessionSchema.index({ startsAt: 1 });
