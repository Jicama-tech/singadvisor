/**
 * Admin-only client for the Trainings > Participants tab — the course→people
 * read the Backend serves from ParticipantsController. Like crmClient.ts and
 * courseContentClient.ts (and unlike contentClient.ts + adminActions.ts), both
 * routes are Bearer-guarded, so both go through apiJson({ admin: true }), which
 * throws an Error carrying the Backend's own message; callers hold a local
 * `error` string and render it through <FormError>.
 *
 * Reads only, and that is the whole module. The two things an admin can DO to
 * somebody on this screen — move the booking's status, confirm that a payment
 * arrived — are writes against ONE Registration, and they already exist in
 * adminActions.ts behind the Registrations screen, which is where one booking
 * is worked on. Nothing here is stored either: every row below is derived at
 * read time from the registrations and enrolments that already exist.
 *
 * The paths sit under /registrations/participants rather than at a prefix of
 * their own because the people on a course ARE that module's records seen from
 * the other end — the same way careers/jobs and careers/applications split one
 * module's URL namespace.
 */
import { apiJson } from "@/lib/adminFetch";

/** Registration.paymentStatus — the closed union the Backend types it as, and
 * the same four states RegistrationsList labels, so one booking cannot read
 * differently depending on which screen found it. Not to be confused with
 * `enrolmentPaymentStatus` below: that is a different vocabulary describing a
 * different record. */
export type RegistrationPaymentStatus = "not-required" | "unpaid" | "claimed" | "paid";

/**
 * One person on one course, merged from both records that can make them a
 * participant — never stored, derived on read exactly like ContactCourse in
 * crmClient.ts, and for the same reason: an enrolment's status, payment and
 * attendance all move after the fact and nothing would keep a copy fresh.
 *
 * Two records, one person: a Registration (the "I'm interested" form on the
 * brochure page, where nearly all the real data still is) shows as Enquired, an
 * Enrolment (a named allocated seat on a dated run, the richer record) as
 * Enrolled. Somebody who enquired and then took a seat is ONE row carrying
 * both — the Backend merges them on the normalised email, which is the whole
 * reason this is a join and not two lists stacked.
 *
 * Every `registration*` field is the LATEST registration's and every
 * `enrolment*` field the latest seat's, with the two counts saying how many
 * records stand behind them: Registration has no uniqueness guard, so the same
 * person genuinely can enquire five times.
 */
export type CourseParticipant = {
  /** Lowercased and trimmed — the merge key as well as the address, because
   * that is the only form both collections agree on. */
  email: string;
  /** The seat's name where there is a seat (a substitution rewrites it),
   * falling back to the enquiry's. Empty only if neither record carried one. */
  name: string;
  phone: string | null;
  company: string | null;
  /** Places the latest enquiry asked for; null for someone who was only ever
   * seated, since a seat is one row per person per run instead. */
  seats: number | null;
  enquired: boolean;
  enrolled: boolean;
  enquiryCount: number;
  enrolmentCount: number;
  /** The Registration that PATCH /registrations/:id/status and
   * :id/verify-payment address. Null for a seat-only participant — exactly when
   * neither action applies. This screen only reads it; see the file docblock. */
  registrationId: string | null;
  /** pending | confirmed | cancelled */
  registrationStatus: string | null;
  registrationPaymentStatus: RegistrationPaymentStatus | null;
  /** What the enquiry was taken at, in minor units, and the currency it was
   * priced in — the snapshot taken when the place was booked, so a later price
   * edit cannot change what an existing registrant owes. */
  amountCents: number | null;
  currency: string | null;
  /** Ours: the code in the QR and on the bank statement. Null when free. */
  paymentRef: string | null;
  /** Every run this person holds a seat on, oldest first; empty when never
   * enrolled. */
  runCodes: string[];
  /** invited | confirmed | withdrawn | no-show | completed */
  enrolmentStatus: string | null;
  /** unpaid | invoiced | paid | waived — deliberately NOT folded into
   * `registrationPaymentStatus`: a seat's `waived` must never render as an
   * enquiry's `not-required`. */
  enrolmentPaymentStatus: string | null;
  /** The seat's nett fee after subsidy and the currency it was charged in, kept
   * apart from `amountCents` for the same reason the two payment states are. */
  nettFeeCents: number | null;
  feeCurrency: string | null;
  attendedHours: number | null;
  attendancePct: number | null;
  /** pending | pass | fail | competent | not-yet-competent */
  assessmentOutcome: string | null;
  /** The span across BOTH kinds of record — earliest of anything they did on
   * this course, and latest. Null together, and only for rows old enough to
   * predate the collections' timestamps. */
  firstAt: string | null;
  lastAt: string | null;
};

/** A course as the picker lists it. The counts are computed from the merged
 * participants themselves, so the number on a row always equals the number of
 * rows behind it. */
export type ParticipantCourseRow = {
  trainingId: string;
  /** The live Training's title, falling back to the denormalized snapshot on a
   * registration and then to 'Deleted programme'. */
  title: string;
  /** null once the Training has been deleted — also the "is it linkable" flag,
   * since /admin/trainings/:trainingId is then a dead route. */
  slug: string | null;
  /** PEOPLE, not rows: someone who enquired twice and then took a seat counts
   * once here and appears once in the roster. */
  participantCount: number;
  enquiredCount: number;
  enrolledCount: number;
  /** How many hold a place today — the seat answers when there is one, since a
   * withdrawn seat is not a place however the enquiry behind it reads. */
  confirmedCount: number;
  /** How many owe money nobody has confirmed arriving. The triage number: it is
   * the queue of bank statements somebody has to go and read. */
  awaitingPaymentCount: number;
  /** Newest activity of any kind, and what the list is ordered by. Null for a
   * course nobody has touched. */
  lastActivityAt: string | null;
};

/** The roster read carries the same row the admin clicked, so the header needs
 * no second call for its counts. */
export type CourseRoster = ParticipantCourseRow & {
  participants: CourseParticipant[];
};

/** EVERY course, including the ones nobody has signed up for, plus any course
 * that has participants but no longer has a Training — a picker that quietly
 * drops rows is one an admin cannot trust. Ordered by last activity, so a
 * course somebody signed up for this morning is at the top and an untouched one
 * sinks to the bottom. */
export function fetchParticipantCourses(): Promise<ParticipantCourseRow[]> {
  return apiJson(`/registrations/participants/courses`, { admin: true });
}

/** One course's people, newest activity first. 400 on an id that is not an
 * ObjectId, 404 only when neither a Training nor a single participant exists
 * for it. */
export function fetchCourseRoster(trainingId: string): Promise<CourseRoster> {
  return apiJson(`/registrations/participants/courses/${trainingId}`, { admin: true });
}
