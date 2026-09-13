import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Enrolment, EnrolmentDocument } from '../enrolments/entities/enrolment.entity';
import { Training, TrainingDocument } from '../trainings/entities/training.entity';
import {
  Registration,
  RegistrationDocument,
  RegistrationPaymentStatus,
} from './entities/registration.entity';

/** Nothing has actually been received. `claimed` belongs here beside `unpaid`
 * because it is the registrant's word and not the bank's — the entire reason
 * the two states are separate (see Registration.paymentStatus). */
const REGISTRATION_OWING = ['unpaid', 'claimed'];

/** Enrolment's own payment vocabulary, which is not Registration's: `invoiced`
 * is money asked for, not money in, and `waived` is money nobody will ever
 * chase. */
const ENROLMENT_OWING = ['unpaid', 'invoiced'];

/** A seat that stands: still held, or already sat. `invited` has not been
 * taken up yet, and `withdrawn`/`no-show` are not places. */
const ENROLMENT_HOLDS_A_PLACE = ['confirmed', 'completed'];

const isOneOf = (states: string[], value: string | null) =>
  value !== null && states.includes(value);

/**
 * One person on one course, merged from both records that can make them a
 * participant — never stored, derived on read exactly like CrmService's
 * ContactCourse, and for the same reason: an enrolment's status, payment and
 * attendance all move after the fact and nothing would keep a copy fresh.
 *
 * Two records, one person:
 *   - a Registration, the "I'm interested" form on the brochure page. Where
 *     nearly all the real data still is; shown as Enquired.
 *   - an Enrolment, a named allocated seat on a dated CourseRun. The richer
 *     record; shown as Enrolled.
 * Someone who enquired and then took a seat is ONE row carrying both, which is
 * the whole point of merging on email rather than listing two collections.
 *
 * Every `registration*` field is the LATEST registration's (latest meaning
 * highest createdAt) and every `enrolment*` field the latest seat's, with
 * `enquiryCount`/`enrolmentCount` saying how many records stand behind them —
 * the same latest-wins rule ContactCourse uses. Registration has no uniqueness
 * guard, so the same person genuinely can enquire five times.
 */
export type CourseParticipant = {
  /** The merge key as well as the address: lowercased and trimmed, because
   * that is the only form both collections agree on (see the pipelines in
   * participantsByCourse). */
  email: string;
  /** The seat's name when there is a seat — that is who is actually attending,
   * and a substitution rewrites it — falling back to the enquiry's. */
  name: string;
  phone: string | null;
  company: string | null;
  /** Places the latest enquiry asked for. A seat is one row per person per run
   * instead, counted by `enrolmentCount`/`runCodes`, so this stays null for
   * someone who was only ever seated. */
  seats: number | null;
  enquired: boolean;
  enrolled: boolean;
  enquiryCount: number;
  enrolmentCount: number;
  /** The registration every action on this screen targets — the status
   * dropdown and Confirm-payment both address a Registration by id
   * (PATCH /registrations/:id/status, :id/verify-payment). Null for a
   * seat-only participant, which is exactly when neither action applies. */
  registrationId: string | null;
  /** pending | confirmed | cancelled */
  registrationStatus: string | null;
  registrationPaymentStatus: RegistrationPaymentStatus | null;
  /** What the enquiry was taken at, in minor units, with the currency it was
   * priced in — the snapshot RegistrationsService.create wrote, and the amount
   * the Confirm-payment dialog must quote, since that action verifies this
   * registration and nothing else. */
  amountCents: number | null;
  currency: string | null;
  /** The reference to match on the bank statement, when there is one to match. */
  paymentRef: string | null;
  /** Every run this person holds a seat on, oldest first. Duplicate-free by
   * construction — one seat per person per run, and runCode is unique. */
  runCodes: string[];
  /** invited | confirmed | withdrawn | no-show | completed */
  enrolmentStatus: string | null;
  /** unpaid | invoiced | paid | waived — deliberately not folded into
   * `registrationPaymentStatus`: the two vocabularies mean different things
   * and a seat's `waived` must never render as an enquiry's `not-required`. */
  enrolmentPaymentStatus: string | null;
  /** The seat's nett fee after subsidy and the currency it was charged in —
   * kept apart from `amountCents` above rather than resolved into one amount,
   * so the figure this screen's payment action quotes is always the figure
   * that action can actually move. */
  nettFeeCents: number | null;
  feeCurrency: string | null;
  /** Claimable hours attended and that as a percentage of the run, from the
   * latest seat. Both null for someone who only enquired. */
  attendedHours: number | null;
  attendancePct: number | null;
  /** pending | pass | fail | competent | not-yet-competent */
  assessmentOutcome: string | null;
  /** The span across BOTH kinds of record — earliest of anything they did on
   * this course, and latest. Null only for rows old enough to predate
   * `timestamps: true`, which is why they are nullable rather than assumed. */
  firstAt: Date | null;
  lastAt: Date | null;
};

/** A course as the picker screen lists it. The counts are computed from the
 * merged participants themselves, never from a separate aggregation, so the
 * number on the card and the number of rows behind it cannot disagree. */
export type ParticipantCourseRow = {
  trainingId: string;
  /** The live Training's title, falling back to Registration.trainingTitle
   * (the denormalized snapshot) and then to 'Deleted programme' —
   * TrainingsService.remove hard-deletes, so both source collections can point
   * at a training that is gone. */
  title: string;
  /** null when the Training no longer exists. Doubles as the "still linkable"
   * flag, as it does on ContactCourse. */
  slug: string | null;
  /** People, not rows: someone who enquired twice and then took a seat counts
   * once here and appears once in the roster. */
  participantCount: number;
  enquiredCount: number;
  enrolledCount: number;
  /** How many hold a place today — see holdsAPlace. */
  confirmedCount: number;
  /** How many still owe money nobody has confirmed arriving — see
   * awaitsPayment. This is the triage number: it is the queue of bank
   * statements somebody has to go and read. */
  awaitingPaymentCount: number;
  /** Newest activity of any kind on the course, and what the list is ordered
   * by. Null for a course nobody has touched. */
  lastActivityAt: Date | null;
};

/** The roster screen's payload: the same row the admin clicked, so the header
 * can render its counts without a second call, plus the people themselves. */
export type CourseRoster = ParticipantCourseRow & {
  participants: CourseParticipant[];
};

/** One course's merged people, plus the title snapshot that is the only name
 * left once the Training itself has been deleted. */
type CourseParticipants = {
  snapshotTitle: string | null;
  people: CourseParticipant[];
};

/** The grouping key both aggregations share: this person, this programme.
 * `email` is folded to lowercase on either side before it is grouped on. */
type ParticipantGroupId = { trainingId: Types.ObjectId; email: string };

type EnquiryGroupRow = {
  _id: ParticipantGroupId;
  registrationId: Types.ObjectId;
  name: string;
  phone: string | null;
  company: string | null;
  seats: number;
  title: string;
  status: string;
  paymentStatus: RegistrationPaymentStatus;
  amountCents: number;
  currency: string;
  paymentRef: string | null;
  count: number;
  firstAt: Date | null;
  lastAt: Date | null;
};

type SeatGroupRow = {
  _id: ParticipantGroupId;
  name: string;
  phone: string | null;
  company: string | null;
  runCodes: string[];
  status: string;
  paymentStatus: string;
  nettFeeCents: number;
  currency: string;
  attendedHours: number;
  attendancePct: number;
  assessmentOutcome: string;
  count: number;
  firstAt: Date | null;
  lastAt: Date | null;
};

type LeanTraining = { _id: Types.ObjectId; title: string; slug: string };

/**
 * Does this person hold a place on the course today?
 *
 * The seat answers whenever there is one: an Enrolment is the allocated place
 * ("this is what Registration should have been", per its own entity), so a
 * withdrawn seat is not a place however the enquiry it grew out of still
 * reads. Only for the enquiry-only majority — nothing creates an Enrolment
 * from the public form yet — does the registration's own status answer.
 */
const holdsAPlace = (p: CourseParticipant) =>
  p.enrolmentStatus !== null
    ? isOneOf(ENROLMENT_HOLDS_A_PLACE, p.enrolmentStatus)
    : p.registrationStatus === 'confirmed';

/**
 * Is somebody still waiting on this person's money? Same seat-first rule, for
 * the same reason: once a seat exists it carries the invoice.
 *
 * A cancelled enquiry owes nothing. RegistrationsService.verifyPayment
 * deliberately leaves a cancelled row cancelled even when a transfer did
 * arrive, so counting one as outstanding would send an admin chasing a place
 * that was dropped on purpose.
 */
const awaitsPayment = (p: CourseParticipant) => {
  if (p.enrolmentStatus !== null) return isOneOf(ENROLMENT_OWING, p.enrolmentPaymentStatus);
  if (p.registrationStatus === 'cancelled') return false;
  return isOneOf(REGISTRATION_OWING, p.registrationPaymentStatus);
};

const millis = (d: Date | null) => d?.getTime() ?? 0;

/**
 * The Trainings > Participants tab, course→people — the inverse of
 * CrmService.coursesFor, which answers the same join contact→courses.
 *
 * It lives beside RegistrationsService rather than inside it because it is a
 * different kind of thing: that service is the write path for one booking's
 * lifecycle (take a place, quote a QR, record a claim, verify a payment) and
 * owns nothing but its own collection, while this is a read-time reporting
 * join that has to reach across Registration, Enrolment and Training. The same
 * split TrainersService takes beside TrainingsService in one module.
 *
 * Nothing here writes, and nothing here is denormalized: no new collection, no
 * stored roster, no counter to drift (the standing rule this feature was asked
 * to keep). Both screens are two aggregations merged in memory plus one lookup
 * for live titles — three queries each, regardless of how many courses or
 * people come back.
 */
@Injectable()
export class ParticipantsService {
  constructor(
    @InjectModel(Registration.name)
    private readonly registrationModel: Model<RegistrationDocument>,
    // Read-only cross-module injections, exactly as CrmService takes them: the
    // other half of the join, and the live title and slug that neither source
    // collection can be trusted for (Enrolment denormalizes neither, and
    // Registration only snapshots the title).
    @InjectModel(Enrolment.name)
    private readonly enrolmentModel: Model<EnrolmentDocument>,
    @InjectModel(Training.name)
    private readonly trainingModel: Model<TrainingDocument>,
  ) {}

  /**
   * Everyone on every course — or on one, when `trainingId` narrows it — in
   * two queries rather than two per course, the discipline coursesFor and
   * CourseContentService.summary both follow.
   *
   * The merge key is the NORMALIZED email, and that is not a detail. The live
   * form lowercases (RegistrationsService.create) but import-content.ts wrote
   * legacy rows verbatim, so `registrations` genuinely holds mixed case and
   * stray whitespace; every enrolment write normalizes (EnrolmentsService's
   * normalizeEmail). Grouping on the raw string would file "Ann@x.com" and
   * "ann@x.com" as two people and then fail to match either against the seat
   * that is plainly theirs — one person silently becoming two rows, which is
   * the precise failure this screen exists to avoid. So both sides are folded
   * with $toLower + $trim before they are grouped on, even though only one
   * side is known to need it: the key has to be identical on both, and the
   * fold is free here because no email index is in play (the reads are
   * scoped by trainingId, which is indexed on both collections).
   */
  private async participantsByCourse(
    trainingId?: Types.ObjectId,
  ): Promise<Map<string, CourseParticipants>> {
    const [enquiries, seats] = await Promise.all([
      this.registrationModel.aggregate<EnquiryGroupRow>([
        // Narrowed first so the roster's read is the indexed one
        // (RegistrationSchema.index({ trainingId: 1 })). Unnarrowed, the $ne
        // still earns its place: a row whose trainingId never resolved on
        // import — the same `?? null` written past a required:true that
        // coursesFor guards against — has no course to be grouped under.
        { $match: trainingId ? { trainingId } : { trainingId: { $ne: null } } },
        { $addFields: { emailLower: { $toLower: { $trim: { input: '$email' } } } } },
        // $sort before $group is what makes $first/$last mean oldest/newest.
        { $sort: { createdAt: 1 } },
        {
          $group: {
            _id: { trainingId: '$trainingId', email: '$emailLower' },
            registrationId: { $last: '$_id' },
            name: { $last: '$name' },
            phone: { $last: '$phone' },
            company: { $last: '$company' },
            seats: { $last: '$seats' },
            // Only ever a fallback for a deleted Training — the live one wins.
            title: { $last: '$trainingTitle' },
            status: { $last: '$status' },
            paymentStatus: { $last: '$paymentStatus' },
            amountCents: { $last: '$amountCents' },
            currency: { $last: '$currency' },
            paymentRef: { $last: '$paymentRef' },
            count: { $sum: 1 },
            firstAt: { $first: '$createdAt' },
            lastAt: { $last: '$createdAt' },
          },
        },
      ]),
      this.enrolmentModel.aggregate<SeatGroupRow>([
        // EnrolmentSchema.index({ trainingId: 1, completedAt: -1 }) backs the
        // narrowed read. Enrolment.trainingId is written by the LMS and never
        // null, so there is nothing to exclude when it is not narrowed.
        { $match: trainingId ? { trainingId } : {} },
        { $addFields: { emailLower: { $toLower: { $trim: { input: '$email' } } } } },
        { $sort: { createdAt: 1 } },
        {
          // Named fields only, which also keeps `nricFinEncrypted` out of the
          // reply: `select: false` is a query-projection rule and an
          // aggregation does not honour it, so a $group that swept whole
          // documents would carry an encrypted NRIC into an admin list that
          // has no business holding one.
          $group: {
            _id: { trainingId: '$trainingId', email: '$emailLower' },
            name: { $last: '$name' },
            phone: { $last: '$phone' },
            company: { $last: '$company' },
            // $push, not $addToSet: the sort above makes this chronological,
            // and duplicates are impossible (one seat per person per run).
            runCodes: { $push: '$runCode' },
            status: { $last: '$status' },
            paymentStatus: { $last: '$paymentStatus' },
            nettFeeCents: { $last: '$nettFeeCents' },
            currency: { $last: '$currency' },
            attendedHours: { $last: '$attendedHours' },
            attendancePct: { $last: '$attendancePct' },
            assessmentOutcome: { $last: '$assessmentOutcome' },
            count: { $sum: 1 },
            firstAt: { $first: '$createdAt' },
            lastAt: { $last: '$createdAt' },
          },
        },
      ]),
    ]);

    const key = (id: ParticipantGroupId) => `${String(id.trainingId)} ${id.email}`;
    const enquiryRows = new Map(enquiries.map((r) => [key(r._id), r]));
    const seatRows = new Map(seats.map((r) => [key(r._id), r]));
    // Seeded from both sides — someone who only enquired and someone who only
    // holds a seat are both participants — and keyed by the group id itself
    // rather than parsed back out of the string.
    const groups = new Map<string, ParticipantGroupId>();
    for (const r of enquiries) groups.set(key(r._id), r._id);
    for (const r of seats) groups.set(key(r._id), r._id);

    const byCourse = new Map<string, CourseParticipants>();
    for (const [k, id] of groups) {
      const enquiry = enquiryRows.get(k);
      const seat = seatRows.get(k);
      // createdAt is optional on both entities — `timestamps: true` fills it
      // in, but taking .getTime() of a row that somehow predates that would
      // 500 the whole roster, so the span is built from what is really there.
      const stamps = [enquiry?.firstAt, enquiry?.lastAt, seat?.firstAt, seat?.lastAt]
        .filter((d): d is Date => d instanceof Date)
        .map((d) => d.getTime());
      const person: CourseParticipant = {
        email: id.email,
        // `||` rather than `??` throughout: a record can hold a blank where
        // the other holds the real value, and an empty string is not an
        // answer. The seat wins where both have one.
        name: seat?.name || enquiry?.name || '',
        phone: seat?.phone || enquiry?.phone || null,
        company: seat?.company || enquiry?.company || null,
        seats: enquiry?.seats ?? null,
        enquired: Boolean(enquiry),
        enrolled: Boolean(seat),
        enquiryCount: enquiry?.count ?? 0,
        enrolmentCount: seat?.count ?? 0,
        registrationId: enquiry ? String(enquiry.registrationId) : null,
        registrationStatus: enquiry?.status ?? null,
        registrationPaymentStatus: enquiry?.paymentStatus ?? null,
        amountCents: enquiry?.amountCents ?? null,
        currency: enquiry?.currency ?? null,
        paymentRef: enquiry?.paymentRef ?? null,
        runCodes: seat?.runCodes ?? [],
        enrolmentStatus: seat?.status ?? null,
        enrolmentPaymentStatus: seat?.paymentStatus ?? null,
        nettFeeCents: seat?.nettFeeCents ?? null,
        feeCurrency: seat?.currency ?? null,
        attendedHours: seat?.attendedHours ?? null,
        attendancePct: seat?.attendancePct ?? null,
        assessmentOutcome: seat?.assessmentOutcome ?? null,
        firstAt: stamps.length ? new Date(Math.min(...stamps)) : null,
        lastAt: stamps.length ? new Date(Math.max(...stamps)) : null,
      };
      const courseKey = String(id.trainingId);
      const course = byCourse.get(courseKey) ?? { snapshotTitle: null, people: [] };
      // Any enquiry's snapshot will do: they are all copies of the same
      // course's title, taken at different moments, and it is only ever read
      // once the live Training has been deleted.
      course.snapshotTitle = course.snapshotTitle ?? enquiry?.title ?? null;
      course.people.push(person);
      byCourse.set(courseKey, course);
    }
    // Most recent first, which is what "who just signed up" means and the
    // order the roster is specified to arrive in.
    for (const course of byCourse.values()) {
      course.people.sort((a, b) => millis(b.lastAt) - millis(a.lastAt));
    }
    return byCourse;
  }

  private courseRow(
    trainingId: string,
    title: string,
    slug: string | null,
    course: CourseParticipants | undefined,
  ): ParticipantCourseRow {
    const people = course?.people ?? [];
    const stamps = people.map((p) => millis(p.lastAt)).filter((t) => t > 0);
    return {
      trainingId,
      title,
      slug,
      participantCount: people.length,
      enquiredCount: people.filter((p) => p.enquired).length,
      enrolledCount: people.filter((p) => p.enrolled).length,
      confirmedCount: people.filter(holdsAPlace).length,
      awaitingPaymentCount: people.filter(awaitsPayment).length,
      lastActivityAt: stamps.length ? new Date(Math.max(...stamps)) : null,
    };
  }

  /**
   * The picker: every course, with who is on it.
   *
   * Every course, including the ones nobody has signed up for — this screen's
   * job is to be picked from, and a picker that quietly drops rows is one an
   * admin cannot trust. "Nobody has enquired yet" and "that course is not
   * here" have to look different, and only the first of them is worth
   * clicking to confirm.
   *
   * Plus any course that has participants but no longer has a Training. Those
   * people are real and the CRM already lists them under 'Deleted programme';
   * leaving them out here would be the one case where a roster exists that
   * this screen cannot reach.
   */
  async courses(): Promise<ParticipantCourseRow[]> {
    const [byCourse, trainings] = await Promise.all([
      this.participantsByCourse(),
      this.trainingModel
        .find()
        .select('title slug')
        .lean<LeanTraining[]>()
        .exec(),
    ]);

    const rows = trainings.map((t) =>
      this.courseRow(String(t._id), t.title, t.slug, byCourse.get(String(t._id))),
    );
    const live = new Set(trainings.map((t) => String(t._id)));
    for (const [trainingId, course] of byCourse) {
      if (live.has(trainingId)) continue;
      rows.push(
        this.courseRow(trainingId, course.snapshotTitle ?? 'Deleted programme', null, course),
      );
    }

    // Busiest-most-recently first, so the course somebody signed up for this
    // morning is at the top; a course with nobody on it scores 0 and sinks to
    // the bottom, where the alphabetical tiebreak makes it findable.
    rows.sort(
      (a, b) =>
        millis(b.lastActivityAt) - millis(a.lastActivityAt) || a.title.localeCompare(b.title),
    );
    return rows;
  }

  /**
   * One course's roster.
   *
   * The id comes straight off a URL, so a string that is not an ObjectId is a
   * 400 here rather than the 500 Mongoose's cast error would otherwise surface
   * as — the same guard RegistrationsService.findForPayment puts in front of
   * its own routes.
   *
   * A 404 needs BOTH halves to come back empty. A hard-deleted Training whose
   * registrations outlived it still has a roster, and courses() lists it, so
   * refusing on the missing Training alone would 404 a row this API itself
   * offered. Nothing anywhere means nothing to show.
   */
  async roster(trainingId: string): Promise<CourseRoster> {
    if (!Types.ObjectId.isValid(trainingId)) {
      throw new BadRequestException('Invalid training id');
    }
    const id = new Types.ObjectId(trainingId);
    const [byCourse, training] = await Promise.all([
      this.participantsByCourse(id),
      this.trainingModel
        .findById(id)
        .select('title slug')
        .lean<LeanTraining | null>()
        .exec(),
    ]);

    const course = byCourse.get(String(id));
    if (!training && !course) {
      throw new NotFoundException(`No training with id "${trainingId}"`);
    }
    const row = this.courseRow(
      String(id),
      training?.title ?? course?.snapshotTitle ?? 'Deleted programme',
      training?.slug ?? null,
      course,
    );
    return { ...row, participants: course?.people ?? [] };
  }
}
