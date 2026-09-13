import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
// SchemaTypes.ObjectId, not Types.ObjectId — see course-run.entity.ts.
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';

export type EnrolmentDocument = HydratedDocument<Enrolment>;

/**
 * A named seat on a `CourseRun` — the roster row.
 *
 * This is what `Registration` should have been. Registration is a lead form: an
 * enquiry with a free-text `seats` count, no link to a date, no capacity check
 * and no identity beyond an email. It stays exactly as it is and keeps serving
 * the "I'm interested in this programme" form on the brochure page; an
 * Enrolment is created *from* one when a seat is actually allocated, and
 * `registrationId` keeps that provenance so the enquiry-to-seat funnel stays
 * measurable.
 *
 * Seats consume on ALLOCATION, not on first attendance — a no-show still costs
 * a room and a trainer day. The allocating write is the guarded atomic $inc on
 * CourseRun.seatsTaken described in course-run.entity.ts; this document is only
 * created once that increment has succeeded, so an oversell cannot produce an
 * orphaned roster row.
 *
 * The money fields are a SNAPSHOT taken at allocation, not a live join onto the
 * run. A run's fee can be corrected after someone has paid, and the completion
 * record and the invoice must both continue to say what was actually charged.
 *
 * Counted alongside registrations wherever the admin reports bookings: the
 * training list's enrolmentCount, overview-stats' totals, and the CRM backfill.
 * Those counters reach this collection by raw string name, so a new one will
 * not raise a type error if it forgets to.
 */
@Schema({ collection: 'enrolments', timestamps: true })
export class Enrolment {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'CourseRun', required: true, index: true })
  courseRunId!: Types.ObjectId;

  /** Denormalized so cross-run reporting ("everyone who ever took Manage Time")
   * does not need to load every run. */
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Training', required: true })
  trainingId!: Types.ObjectId;

  @Prop({ type: String, required: true })
  runCode!: string;

  @Prop({ type: String, required: true })
  name!: string;

  @Prop({ type: String, required: true })
  email!: string;

  @Prop({ type: String, required: false, default: null })
  phone!: string | null;

  @Prop({ type: String, required: false, default: null })
  company!: string | null;

  @Prop({ type: String, required: false, default: null })
  jobTitle!: string | null;

  /** The sponsoring employer's own staff number. Corporate clients reconcile
   * our report against their HR system by this, not by email. */
  @Prop({ type: String, required: false, default: null })
  externalId!: string | null;

  /**
   * NRIC/FIN, encrypted with common/secret-crypto.util (AES-256-GCM), and only
   * ever populated on a funded run — that is the narrow case where the PDPC
   * permits collection, because SSG requires verification to a high degree of
   * accuracy. Never place this value in a JWT claim, log line, filename or URL.
   * PDPC enforcement against NRIC misuse steps up from 1 January 2027.
   *
   * `select: false` keeps it out of every query result, so no read or update
   * response can carry it; a caller must ask by name with `+nricFinEncrypted`.
   */
  @Prop({ type: String, required: false, default: null, select: false })
  nricFinEncrypted!: string | null;

  /** Last four characters plus checksum letter, stored in clear for masked
   * display and CSV export so a list never has to decrypt the full value. */
  @Prop({ type: String, required: false, default: null })
  nricFinMasked!: string | null;

  /** invited | confirmed | withdrawn | no-show | completed */
  @Prop({ type: String, required: true, default: 'confirmed', index: true })
  status!: string;

  @Prop({ type: Date, required: false, default: null })
  seatAllocatedAt!: Date | null;

  /** Free name substitution is allowed up to a few working days before the run
   * starts; this records that the seat changed hands rather than deleting and
   * recreating the row, so the sponsor's paid seat count stays stable. */
  @Prop({ type: String, required: false, default: null })
  substitutedForName!: string | null;

  @Prop({ type: String, required: true, default: 'SGD' })
  currency!: string;

  @Prop({ type: Number, required: true, default: 0 })
  fullFeeCents!: number;

  @Prop({ type: Number, required: true, default: 0 })
  subsidyCents!: number;

  @Prop({ type: Number, required: true, default: 0 })
  nettFeeCents!: number;

  @Prop({ type: Number, required: true, default: 0 })
  gstCents!: number;

  /** unpaid | invoiced | paid | waived */
  @Prop({ type: String, required: true, default: 'unpaid', index: true })
  paymentStatus!: string;

  @Prop({ type: Date, required: false, default: null })
  paidAt!: Date | null;

  /** Claimable hours actually attended, summed from SessionAttendance. This is
   * the number an employer's Absentee Payroll claim is built on, which is why
   * it is hours and not a percentage. */
  @Prop({ type: Number, required: true, default: 0 })
  attendedHours!: number;

  /** Attendance as a percentage of the run's totalHours, maintained alongside
   * attendedHours. SSG-funded non-certifiable courses carry a 75% minimum. */
  @Prop({ type: Number, required: true, default: 0 })
  attendancePct!: number;

  /**
   * pending | pass | fail | competent | not-yet-competent
   *
   * The vocabulary forks on the run's fundingScheme: internal courses are
   * pass/fail, WSQ assessment is Competent / Not Yet Competent. They are kept
   * in one field with distinct values rather than being flattened, because a
   * WSQ outcome must never be rendered with internal-course wording.
   */
  @Prop({ type: String, required: true, default: 'pending' })
  assessmentOutcome!: string;

  @Prop({ type: Date, required: false, default: null })
  assessedAt!: Date | null;

  @Prop({ type: Date, required: false, default: null })
  completedAt!: Date | null;

  /** The enquiry this seat came from, when there was one. Null for a seat an
   * admin added directly from a corporate booking. */
  @Prop({
    type: SchemaTypes.ObjectId,
    ref: 'Registration',
    required: false,
    default: null,
  })
  registrationId!: Types.ObjectId | null;

  /**
   * The day before the run ends — the last date this learner can claim
   * SkillsFuture Credit on MySkillsFuture. Denormalized so the reminder cron
   * can query it directly. Missing this window is the most common service
   * failure a Singapore training provider commits, and the learner pays cash
   * they should not have.
   */
  @Prop({ type: Date, required: false, default: null })
  sfcClaimWindowClosesAt!: Date | null;

  @Prop({ type: String, required: false, default: null })
  notes!: string | null;

  @Prop({ type: Date })
  createdAt?: Date;

  @Prop({ type: Date })
  updatedAt?: Date;
}

export const EnrolmentSchema = SchemaFactory.createForClass(Enrolment);
// One seat per person per run. Registration has no such guard, which is how the
// same person can currently enquire five times and appear five times.
EnrolmentSchema.index({ courseRunId: 1, email: 1 }, { unique: true });
// "Every run this person has ever been on" — the alumni and repeat-booking view.
EnrolmentSchema.index({ email: 1, createdAt: -1 });
EnrolmentSchema.index({ trainingId: 1, completedAt: -1 });
// Drives the SkillsFuture Credit claim-window reminder job.
EnrolmentSchema.index({ sfcClaimWindowClosesAt: 1 });
