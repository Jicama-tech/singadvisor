import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { AdminEmpty, PageHeading, Panel, TableWrap, Td, Th } from "@/components/admin/AdminUI";
import TrainingsShell from "@/components/admin/TrainingsShell";
import { FormError } from "@/components/forms/FormShell";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import {
  fetchCourseRoster,
  type CourseRoster,
  type RegistrationPaymentStatus,
} from "@/lib/participantsClient";
import { formatDate, formatPrice } from "@/lib/utils";

/**
 * /admin/trainings/participants/:id — one course's roster.
 *
 * One row per PERSON, not per record: somebody who enquired through the
 * brochure form and then took a seat on a run appears once, wearing both
 * badges. The merge happens on the Backend (ParticipantsService, on the
 * normalised email); what this screen has to get right is showing which of the
 * two they are without pretending the two are the same thing.
 *
 * Read-only. The status dropdown and the Confirm-payment button both write to
 * one Registration and live on the Registrations screen, which is where a
 * single booking is worked on; a roster answers "who is on this course".
 * The vocabulary is deliberately the same on both screens.
 */

/** Label and tone together, because they are never wanted apart — the shape the
 * CRM's Courses panel and CourseContentList's curriculumStatus both use. */
type Vocab = Record<string, { label: string; tone: BadgeTone }>;

/** Registration.status — the booking, which is not the money below it. */
const REGISTRATION_STATUS: Vocab = {
  pending: { label: "Pending", tone: "warn" },
  confirmed: { label: "Confirmed", tone: "success" },
  cancelled: { label: "Cancelled", tone: "danger" },
};

/**
 * Registration.paymentStatus, word for word from RegistrationsList — the same
 * bookings are on both screens and they must not be described differently.
 * "Claimed" is the only amber one for the reason it is there: it is the one
 * state waiting on somebody here, and it is emphatically not money — the
 * registrant pressed a button, and nothing has been checked against a bank
 * statement yet.
 */
const REGISTRATION_PAYMENT: Record<
  RegistrationPaymentStatus,
  { label: string; tone: BadgeTone }
> = {
  "not-required": { label: "Free", tone: "neutral" },
  unpaid: { label: "Unpaid", tone: "neutral" },
  claimed: { label: "Claimed", tone: "warn" },
  paid: { label: "Paid", tone: "success" },
};

/** Enrolment.status — a seat, which moves on its own after the enquiry that
 * started it. A no-show is the only one that costs us a room and a trainer day
 * for nothing. */
const ENROLMENT_STATUS: Vocab = {
  invited: { label: "Invited", tone: "info" },
  confirmed: { label: "Confirmed", tone: "accent" },
  withdrawn: { label: "Withdrawn", tone: "neutral" },
  "no-show": { label: "No-show", tone: "danger" },
  completed: { label: "Completed", tone: "success" },
};

/** Enrolment.paymentStatus — a different vocabulary from the enquiry's, and
 * kept in its own column for that reason: money still owed is the only one
 * worth warning about, and `waived` was a decision rather than a balance. */
const ENROLMENT_PAYMENT: Vocab = {
  unpaid: { label: "Unpaid", tone: "warn" },
  invoiced: { label: "Invoiced", tone: "info" },
  paid: { label: "Paid", tone: "success" },
  waived: { label: "Waived", tone: "neutral" },
};

/** Enrolment.assessmentOutcome. The vocabulary forks on the run's funding
 * scheme — internal courses are pass/fail, WSQ is Competent / Not Yet
 * Competent — so both halves are spelled out: a WSQ outcome must never be
 * rendered with internal-course wording. */
const ASSESSMENT_OUTCOME: Vocab = {
  pending: { label: "Assessment pending", tone: "neutral" },
  pass: { label: "Passed", tone: "success" },
  fail: { label: "Failed", tone: "danger" },
  competent: { label: "Competent", tone: "success" },
  "not-yet-competent": { label: "Not yet competent", tone: "warn" },
};

/** Falls back to the raw value rather than dropping the badge: these lists live
 * on the Backend entities, and a state added there should show up here
 * unstyled rather than silently vanish from somebody's row. */
function VocabBadge({ vocab, value }: { vocab: Vocab; value: string }) {
  const known = vocab[value];
  return <Badge tone={known?.tone ?? "neutral"}>{known?.label ?? value}</Badge>;
}

const dash = <span className="text-[var(--text-muted)]">—</span>;

export default function CourseParticipants() {
  const { user } = useAuth();
  const { id: trainingId = "" } = useParams();
  const [roster, setRoster] = useState<CourseRoster | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Clearing first matters: this page stays mounted when the route moves from
    // one course to another, so without it the previous roster renders for a
    // frame under the new id — with the new course's name over it. The
    // cancelled flag is the other half of that: a slow read for the course just
    // left must not land on top of the one now open.
    setRoster(null);
    setError(null);
    let cancelled = false;
    void (async () => {
      try {
        const next = await fetchCourseRoster(trainingId);
        if (!cancelled) setRoster(next);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not open this roster.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [trainingId]);

  if (!user) return null;

  /** The way back, and — while the course still exists — the way into it. Both
   * branches below wear it, so a roster that failed to load is still one click
   * from the list that offered it. */
  const backToCourses = (
    <ButtonLink to="/admin/trainings/participants" variant="secondary" size="sm">
      <Icon name="chevron-left" size={16} />
      All courses
    </ButtonLink>
  );

  // A bad id 400s and a course with neither a training nor a single participant
  // 404s; either way the nested nav stays wrapped around the message.
  if (error) {
    return (
      <TrainingsShell>
        <div className="flex flex-col gap-8">
          <PageHeading
            title="Participants"
            description="This roster could not be opened."
            action={backToCourses}
          />
          <FormError state={{ ok: false, message: error }} />
          <Panel>
            <AdminEmpty
              title="Nothing to show"
              message="Pick a course from the Participants tab to see who is on it."
            />
          </Panel>
        </div>
      </TrainingsShell>
    );
  }

  // First load. Blank under the heading rather than a spinner — the shell and
  // the nested nav are already on screen, which is what every other admin page
  // does while it waits.
  if (!roster) {
    return (
      <TrainingsShell>
        <div className="flex flex-col gap-8">
          <PageHeading
            title="Participants"
            description="Loading the roster…"
            action={backToCourses}
          />
        </div>
      </TrainingsShell>
    );
  }

  const { participants } = roster;

  return (
    <TrainingsShell>
      <div className="flex flex-col gap-8">
        <PageHeading
          title={roster.title}
          description={
            participants.length === 0
              ? "Nobody on this course yet"
              : `${participants.length} participant${participants.length === 1 ? "" : "s"} · ` +
                `${roster.enquiredCount} enquired · ${roster.enrolledCount} enrolled`
          }
          action={
            <div className="flex flex-wrap items-center gap-2">
              {roster.confirmedCount > 0 && (
                <Badge tone="success">{roster.confirmedCount} holding a place</Badge>
              )}
              {roster.awaitingPaymentCount > 0 && (
                <Badge tone="warn">{roster.awaitingPaymentCount} awaiting payment</Badge>
              )}
              {backToCourses}
              {/* No slug means the training was hard-deleted — the people
                  outlived it, so there is no settings page left to offer. */}
              {roster.slug && (
                <ButtonLink
                  to={`/admin/trainings/${roster.trainingId}`}
                  variant="ghost"
                  size="sm"
                >
                  Course settings
                </ButtonLink>
              )}
            </div>
          }
        />

        <Panel>
          {participants.length === 0 ? (
            <AdminEmpty message="Nobody has signed up for this course yet." />
          ) : (
            <TableWrap>
              <thead>
                <tr>
                  <Th>Participant</Th>
                  <Th>Contact</Th>
                  <Th>Record</Th>
                  <Th>Seats</Th>
                  <Th>Amount</Th>
                  <Th>Payment</Th>
                  <Th>Status</Th>
                  <Th>Seat</Th>
                  <Th>Activity</Th>
                </tr>
              </thead>
              <tbody>
                {participants.map((p) => {
                  // Both stamps through formatDate before comparing: two
                  // records hours apart are one day to the reader, and
                  // "12 Sep 2026 – 12 Sep 2026" is not a span.
                  const first = p.firstAt && formatDate(p.firstAt);
                  const last = p.lastAt && formatDate(p.lastAt);
                  return (
                    // The normalised email is the merge key, so it is unique
                    // per course by construction — one row per person.
                    <tr key={p.email} className="hover:bg-[var(--surface-sunken)]">
                      <Td>
                        <span className="font-medium text-[var(--text-primary)]">
                          {p.name || p.email}
                        </span>
                        {p.company && (
                          <span className="block text-xs text-[var(--text-muted)]">
                            {p.company}
                          </span>
                        )}
                      </Td>
                      <Td>
                        <a
                          href={`mailto:${p.email}`}
                          className="block text-[var(--accent)] hover:underline"
                        >
                          {p.email}
                        </a>
                        {p.phone && (
                          <a
                            href={`tel:${p.phone}`}
                            className="block text-xs text-[var(--text-muted)] hover:underline"
                          >
                            {p.phone}
                          </a>
                        )}
                      </Td>
                      {/* Which of the two records make this person a
                          participant — the same two words, and the same two
                          tones, the CRM's Courses panel uses. Both badges on
                          one row is the point of the merge: enquired, then took
                          a seat, one person. */}
                      <Td>
                        <div className="flex flex-wrap gap-1">
                          {p.enquired && (
                            <Badge tone="neutral">
                              Enquired
                              {p.enquiryCount > 1 && ` ×${p.enquiryCount}`}
                            </Badge>
                          )}
                          {p.enrolled && (
                            <Badge tone="accent">
                              Enrolled
                              {p.enrolmentCount > 1 && ` ×${p.enrolmentCount}`}
                            </Badge>
                          )}
                        </div>
                        {p.runCodes.length > 0 && (
                          <span className="mt-1 block text-xs text-[var(--text-muted)]">
                            {p.runCodes.join(", ")}
                          </span>
                        )}
                      </Td>
                      <Td className="text-[var(--text-secondary)]">{p.seats ?? dash}</Td>
                      {/* The enquiry's snapshot and the seat's nett fee are two
                          different figures about two different records, so they
                          are stacked rather than resolved into one — the top
                          line is the amount the Registrations screen's payment
                          action can actually move. */}
                      <Td className="whitespace-nowrap text-[var(--text-secondary)]">
                        {p.amountCents === null
                          ? dash
                          : formatPrice(p.amountCents, p.currency ?? undefined)}
                        {p.nettFeeCents !== null && (
                          <span className="block text-xs text-[var(--text-muted)]">
                            {formatPrice(p.nettFeeCents, p.feeCurrency ?? undefined)} seat fee
                          </span>
                        )}
                      </Td>
                      <Td>
                        {p.registrationPaymentStatus ? (
                          <Badge tone={REGISTRATION_PAYMENT[p.registrationPaymentStatus].tone}>
                            {REGISTRATION_PAYMENT[p.registrationPaymentStatus].label}
                          </Badge>
                        ) : (
                          dash
                        )}
                        {p.paymentRef && (
                          <span className="mt-1 block font-mono text-xs text-[var(--text-muted)]">
                            {p.paymentRef}
                          </span>
                        )}
                      </Td>
                      <Td>
                        {p.registrationStatus ? (
                          <VocabBadge vocab={REGISTRATION_STATUS} value={p.registrationStatus} />
                        ) : (
                          dash
                        )}
                      </Td>
                      {/* The seat's own state, in its own column: the two
                          vocabularies are not interchangeable, and a seat's
                          "Waived" beside an enquiry's "Free" has to stay
                          legible as two different statements. */}
                      <Td>
                        {p.enrolled ? (
                          <div className="flex flex-col items-start gap-1">
                            <div className="flex flex-wrap gap-1">
                              {p.enrolmentStatus && (
                                <VocabBadge
                                  vocab={ENROLMENT_STATUS}
                                  value={p.enrolmentStatus}
                                />
                              )}
                              {p.enrolmentPaymentStatus && (
                                <VocabBadge
                                  vocab={ENROLMENT_PAYMENT}
                                  value={p.enrolmentPaymentStatus}
                                />
                              )}
                            </div>
                            {p.assessmentOutcome && (
                              <VocabBadge
                                vocab={ASSESSMENT_OUTCOME}
                                value={p.assessmentOutcome}
                              />
                            )}
                            {/* attendancePct defaults to 0 and stays there
                                until the run has actually happened — "0%
                                attended" on a confirmed future seat is noise,
                                not information. */}
                            {p.attendancePct !== null && p.attendancePct > 0 && (
                              <span className="text-xs text-[var(--text-muted)]">
                                {p.attendancePct}% attended
                                {p.attendedHours !== null && p.attendedHours > 0 && (
                                  <> · {p.attendedHours} hrs</>
                                )}
                              </span>
                            )}
                          </div>
                        ) : (
                          dash
                        )}
                      </Td>
                      <Td className="whitespace-nowrap text-[var(--text-secondary)]">
                        {first ? (
                          <>
                            {first}
                            {last && last !== first && <> – {last}</>}
                          </>
                        ) : (
                          dash
                        )}
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </TableWrap>
          )}
        </Panel>
      </div>
    </TrainingsShell>
  );
}
