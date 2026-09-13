import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
// SchemaTypes.ObjectId, not Types.ObjectId — see course-run.entity.ts.
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';

export type SessionAttendanceDocument = HydratedDocument<SessionAttendance>;

/**
 * One person, one sitting — the join of `Enrolment` and `CourseRunSession`.
 *
 * `source` is the integrity guard and the reason this is a real collection
 * rather than an array on the enrolment. For an SSG-funded run SingAdvisor does
 * not own attendance capture and cannot: Singpass e-attendance is the default,
 * SSG issues the QR per session and the trainee scans it from their own phone.
 * What we build is reconciliation and exception handling. Keeping the capture
 * method on every row means a staff member clicking a roster grid can never
 * silently manufacture a record that later gets submitted as if a trainee had
 * scanned for it — the two are different values and the report says which.
 *
 * `hours` is stored per row rather than copied from the session at read time
 * because partial attendance is real: someone who leaves at the break attended
 * fewer claimable hours than the session offers, and the employer's Absentee
 * Payroll claim must reflect that.
 */
@Schema({ collection: 'sessionattendances', timestamps: true })
export class SessionAttendance {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Enrolment', required: true, index: true })
  enrolmentId!: Types.ObjectId;

  @Prop({
    type: SchemaTypes.ObjectId,
    ref: 'CourseRunSession',
    required: true,
    index: true,
  })
  courseRunSessionId!: Types.ObjectId;

  /** Denormalized so the per-run roster grid and the sponsor report can be
   * built with one query instead of a lookup through every session. */
  @Prop({ type: SchemaTypes.ObjectId, ref: 'CourseRun', required: true, index: true })
  courseRunId!: Types.ObjectId;

  /** present | absent | late | excused */
  @Prop({ type: String, required: true })
  status!: string;

  /** Claimable hours actually attended for this sitting — see the class doc. */
  @Prop({ type: Number, required: true, default: 0 })
  hours!: number;

  /**
   * singpass | manual | hardcopy
   *
   * 'singpass' may only be written by the reconciliation path that reads a scan
   * SSG reported. A trainer marking the roster grid always writes 'manual', and
   * a countersigned paper sheet writes 'hardcopy' with `evidencePath` set.
   */
  @Prop({ type: String, required: true, index: true })
  source!: string;

  /** The operator or admin who recorded a manual or hardcopy row. Null for a
   * Singpass scan, which has no internal author. */
  @Prop({
    type: SchemaTypes.ObjectId,
    ref: 'Operator',
    required: false,
    default: null,
  })
  recordedBy!: Types.ObjectId | null;

  @Prop({ type: Date, required: true, default: () => new Date() })
  recordedAt!: Date;

  /** The timestamp SSG reports for the trainee's scan, kept distinct from
   * `recordedAt` (when we learned of it). The scan must fall within ±30 minutes
   * of the session for SSG to accept it, so both times are needed to explain a
   * rejected record. */
  @Prop({ type: Date, required: false, default: null })
  ssgScanAt!: Date | null;

  /**
   * Scanned signature sheet or other evidence backing a non-Singpass row.
   *
   * MUST NOT be written under `uploads/`. main.ts:48 serves that whole tree via
   * `useStaticAssets` with no guard, and Deployment/SERVER_SETUP.md requires it
   * to stay publicly reachable — an attendance sheet placed there is world-
   * readable to anyone who guesses or leaks the filename. Use the guarded
   * RESUME_DIR + streamed-response pattern instead, so the file is served only
   * behind JwtAuthGuard after a document reference check.
   */
  @Prop({ type: String, required: false, default: null })
  evidencePath!: string | null;

  /** Why this row was entered by hand — read during an SSG audit, so it is
   * expected to be populated whenever source is not 'singpass'. */
  @Prop({ type: String, required: false, default: null })
  reason!: string | null;

  @Prop({ type: Date })
  createdAt?: Date;

  @Prop({ type: Date })
  updatedAt?: Date;
}

export const SessionAttendanceSchema =
  SchemaFactory.createForClass(SessionAttendance);
// One row per person per sitting. Without this a double-marked session
// double-counts claimable hours straight into a funding claim.
SessionAttendanceSchema.index(
  { enrolmentId: 1, courseRunSessionId: 1 },
  { unique: true },
);
// The roster grid: every mark for one run, in session order.
SessionAttendanceSchema.index({ courseRunId: 1, courseRunSessionId: 1 });
