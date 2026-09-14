import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { AdminEmpty, PageHeading, Panel, TableWrap, Td, Th } from "@/components/admin/AdminUI";
import TrainingsShell from "@/components/admin/TrainingsShell";
import { FormError } from "@/components/forms/FormShell";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { Icon } from "@/components/ui/Icon";
import {
  resendRegistrationConfirmation,
  updateRegistrationStatus,
  verifyRegistrationPayment,
} from "@/adminActions";
import {
  fetchCourseRoster,
  type CourseParticipant,
  type CourseRoster,
  type RegistrationPaymentStatus,
} from "@/lib/participantsClient";
import { formatDate, formatDateTime, formatPrice } from "@/lib/utils";

/**
 * /admin/trainings/participants/:id — one course's roster.
 *
 * One row per PERSON, not per record: somebody who enquired through the
 * brochure form and then took a seat on a run appears once, wearing both
 * badges. The merge happens on the Backend (ParticipantsService, on the
 * normalised email); what this screen has to get right is showing which of the
 * two they are without pretending the two are the same thing.
 *
 * Not read-only any more. Confirming a place is what an admin working down a
 * course's list actually wants to do, and sending them off to find the same
 * booking again on the Registrations screen to do it is the whole complaint.
 * The actions offered here ARE that screen's: the same three routes against the
 * same Registration, through the same helpers in adminActions. So the badge
 * vocabulary, the wording of the dialogs and the "Not sent" treatment of the
 * joining details are deliberately identical on both — one booking must not
 * read differently depending on which screen found it.
 *
 * Only a Registration can be acted on. A seat-only participant has no booking
 * behind them, and the Actions cell says so in words rather than offering a
 * button with nothing to address.
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
  /** The registration whose action is in flight, so only that row's buttons go
   * dead — a busy flag for the whole table would stop an admin working down a
   * list of twenty. One id covers both buttons because a row never offers both:
   * Confirm wants a pending booking, Resend a confirmed one. */
  const [busyId, setBusyId] = useState<string | null>(null);
  /** What the last action did. Separate from `error` above, which is the roster
   * failing to open and takes the whole screen with it: a refused write leaves
   * the table standing and correct. Separate too because a resend has three
   * endings rather than two — it can be refused, it can go out, and it can
   * succeed as a request while sending nothing at all. */
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const { confirm, confirmDialog } = useConfirm();

  /** Which course the screen is showing, for the two reads that can outlive it.
   * The effect below has its own cancelled flag; a re-read fired by an action
   * has no cleanup to hang one on, so it checks this instead. */
  const liveTrainingId = useRef(trainingId);

  /** Re-reads the whole roster after a write — see `run` for why none of this
   * is patched in place — and drops the answer if the admin has moved to
   * another course in the meantime. */
  const reload = useCallback(async () => {
    const next = await fetchCourseRoster(trainingId);
    if (liveTrainingId.current === trainingId) setRoster(next);
  }, [trainingId]);

  useEffect(() => {
    // Clearing first matters: this page stays mounted when the route moves from
    // one course to another, so without it the previous roster renders for a
    // frame under the new id — with the new course's name over it. The
    // cancelled flag is the other half of that: a slow read for the course just
    // left must not land on top of the one now open. The last action's message
    // and busy row go with it — both were about a booking on the course left.
    liveTrainingId.current = trainingId;
    setRoster(null);
    setError(null);
    setNotice(null);
    setBusyId(null);
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

  /**
   * Every write on this screen goes through here: one place that marks the row
   * busy, clears the last outcome, surfaces the Backend's own words on a
   * refusal and re-reads the roster — the funnel CourseBuilder's `run` is, for
   * the same reason.
   *
   * Nothing is patched in place. These rows are money and attendance, and both
   * actions move more than the field they are named after: confirming sends an
   * email that may not go out, and verifying a payment moves the status too.
   * The header counts and every badge beside them are derived server-side, so a
   * re-read is the only thing that leaves the whole screen agreeing.
   *
   * A failed re-read is reported as itself rather than as a failed write: the
   * money was recorded either way, and telling the admin it was not is how a
   * transfer gets confirmed twice.
   */
  async function run(id: string, write: () => Promise<void>, failed: string): Promise<void> {
    setBusyId(id);
    setNotice(null);
    let written = false;
    try {
      await write();
      written = true;
      await reload();
    } catch (err) {
      setNotice({
        ok: false,
        text: written
          ? "That went through, but the roster could not be re-read — reload the page " +
            "to see where it stands."
          : err instanceof Error
            ? err.message
            : failed,
      });
    } finally {
      setBusyId(null);
    }
  }

  /**
   * Confirm somebody's place — and, where they have said they paid, record the
   * transfer in the same click.
   *
   * Two routes, because they are two different promises. A booking sitting at
   * `claimed` has a payment nobody has checked yet, and verify-payment writes
   * that the money arrived AND confirms the place; confirming that one through
   * the status route instead would seat them while leaving the claim standing
   * forever, since nothing afterwards asks again. Every other booking has no
   * claim to act on — and verify-payment refuses a free one outright ("This
   * programme is free — there is nothing to verify") — so those go through the
   * status route. Both ends with the Backend sending the joining details, which
   * is why the column beside the button is only truthful after the re-read.
   *
   * Asked first, like RegistrationsList and DeleteButton: on the money branch
   * the only thing standing behind the click is somebody having found the
   * transfer, so the dialog names the amount and the reference to look for.
   */
  async function confirmPlace(p: CourseParticipant) {
    const id = p.registrationId;
    if (!id) return;
    const who = p.name || p.email;
    const claimed = p.registrationPaymentStatus === "claimed";
    const amount =
      p.amountCents === null
        ? "the payment"
        : formatPrice(p.amountCents, p.currency ?? undefined);
    const agreed = await confirm(
      claimed
        ? {
            title: `Confirm ${amount} received from ${who}?`,
            message: `Match reference ${p.paymentRef ?? "—"} on the bank statement first.`,
            detail:
              "This marks the payment received, confirms their place and sends the " +
              "joining details.",
            confirmLabel: "Confirm payment",
          }
        : {
            title: `Confirm ${who}'s place on this course?`,
            message: "This confirms the booking and sends them the joining details.",
            // Said out loud rather than left to the Payment column: this branch
            // records nothing about money, and a place confirmed is exactly when
            // everybody stops chasing the transfer behind it.
            detail:
              p.registrationPaymentStatus === "unpaid"
                ? `It records no payment — ${amount} is still outstanding.`
                : undefined,
            confirmLabel: "Confirm place",
          },
    );
    if (!agreed) return;

    await run(
      id,
      // The status helper swallows a refusal where the payment one throws (see
      // adminActions), so on that branch the re-read is what tells the truth: a
      // row still reading Pending afterwards is one that did not go through.
      () => (claimed ? verifyRegistrationPayment(id) : updateRegistrationStatus(id, "confirmed")),
      claimed ? "Could not confirm the payment." : "Could not confirm the place.",
    );
  }

  /**
   * Send the joining details again — the Classroom link or the venue address,
   * whichever the course's format calls for.
   *
   * Honest about the answer, because here the answer is usually no: with no
   * SMTP host configured the Backend's best-effort send returns `sent: false`
   * and the request itself still succeeds. Reporting that as done would undo
   * the entire point of the column this button sits beside.
   */
  async function resendJoiningDetails(p: CourseParticipant) {
    const id = p.registrationId;
    if (!id) return;
    await run(
      id,
      async () => {
        const result = await resendRegistrationConfirmation(id);
        setNotice(
          result.sent
            ? { ok: true, text: `Joining details sent to ${p.email}.` }
            : {
                ok: false,
                text:
                  `Nothing was sent to ${p.email} — no mail server took the message. ` +
                  `${p.name || p.email} still has not been told where to turn up; check the ` +
                  `mail configuration and try again.`,
              },
        );
      },
      "Could not send the confirmation.",
    );
  }

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
  // Confirmed, and the email carrying the joining details never got out. The
  // one count not on the roster row: it is derived here rather than server-side
  // because the Backend's counts answer who holds a place, and being told is
  // not holding a place. Worth the badge all the same — nobody will chase this
  // one, since the registrant was never told an email was coming.
  const untold = participants.filter(
    (p) => p.registrationStatus === "confirmed" && !p.confirmationEmailSentAt,
  ).length;

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
              {untold > 0 && (
                <Badge tone="danger">{untold} without joining details</Badge>
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

        {/* What the last action did, where the admin is looking. The failure
            half goes through FormError so this screen keeps ONE red banner —
            the same one a roster that would not open gets; only the good news
            needs a treatment of its own. */}
        {notice &&
          (notice.ok ? (
            <p
              role="status"
              className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200"
            >
              {notice.text}
            </p>
          ) : (
            <FormError state={{ ok: false, message: notice.text }} />
          ))}

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
                  <Th>Joining details</Th>
                  <Th>Seat</Th>
                  <Th>Activity</Th>
                  <Th className="text-right">Actions</Th>
                </tr>
              </thead>
              <tbody>
                {participants.map((p) => {
                  // Both stamps through formatDate before comparing: two
                  // records hours apart are one day to the reader, and
                  // "12 Sep 2026 – 12 Sep 2026" is not a span.
                  const first = p.firstAt && formatDate(p.firstAt);
                  const last = p.lastAt && formatDate(p.lastAt);
                  // Explicitly not null, or a seat-only row (registrationId
                  // null) would read as busy whenever nothing is in flight.
                  const busy = busyId !== null && busyId === p.registrationId;
                  // Confirming a transfer somebody says they made is a
                  // different promise from confirming a place that costs
                  // nothing, and the button has to say which one it is.
                  const confirmLabel =
                    p.registrationPaymentStatus === "claimed"
                      ? "Confirm payment"
                      : "Confirm place";
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
                          line is the amount Confirm payment moves, and the one
                          its dialog quotes; the seat fee below it is nobody's
                          balance on this screen. */}
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
                      {/* Deliberately not styled like the Payment column, and
                          word for word the Registrations screen's: this one
                          answers "has this person been told where to turn up",
                          which a confirmed booking can fail silently — the send
                          is best-effort server-side and a deployment with no
                          SMTP host never manages one. Hence a date for a real
                          delivery, and the attempt behind a failure rather than
                          a blank. */}
                      <Td>
                        {p.confirmationEmailSentAt ? (
                          <>
                            <Badge tone="success">
                              <Icon name="mail" size={13} />
                              Sent
                            </Badge>
                            <span className="mt-1 block text-xs text-[var(--text-muted)]">
                              {formatDateTime(p.confirmationEmailSentAt)}
                            </span>
                          </>
                        ) : p.confirmationEmailAttemptedAt ||
                          p.registrationStatus === "confirmed" ? (
                          <>
                            <Badge tone="danger">
                              <Icon name="alert" size={13} />
                              Not sent
                            </Badge>
                            {p.confirmationEmailAttemptedAt && (
                              <span className="mt-1 block text-xs text-[var(--text-muted)]">
                                Tried {formatDateTime(p.confirmationEmailAttemptedAt)}
                              </span>
                            )}
                          </>
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
                      <Td>
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          {p.registrationId === null ? (
                            // Not a missing button: this person holds a seat
                            // somebody allocated them and never made a booking,
                            // so there is no Registration for any of the three
                            // routes to address. Said in words, because a blank
                            // cell beside rows full of buttons reads as broken.
                            <span className="text-xs text-[var(--text-muted)]">
                              Seat only — no booking
                            </span>
                          ) : (
                            <>
                              {/* Offered wherever a confirmed place has not had
                                  its joining details out — the Backend refuses
                                  anything else, and there is nothing to resend
                                  to a booking still pending or since cancelled.
                                  Outlined rather than filled: the money button
                                  is the one that should take a second's
                                  thought. */}
                              {p.registrationStatus === "confirmed" &&
                                !p.confirmationEmailSentAt && (
                                  <button
                                    type="button"
                                    onClick={() => void resendJoiningDetails(p)}
                                    disabled={busy}
                                    aria-label={`Resend joining details to ${p.email}`}
                                    className="inline-flex h-8 items-center gap-1.5 rounded-full border border-[var(--border-strong)] px-3 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--accent)]/50 hover:text-[var(--accent)] disabled:pointer-events-none disabled:opacity-50"
                                  >
                                    <Icon name="mail" size={13} />
                                    {busy ? "Sending…" : "Resend"}
                                  </button>
                                )}
                              {/* Only a booking still pending has a place to
                                  confirm: one already confirmed would send a
                                  second set of joining details for nothing, and
                                  offering it against a cancelled booking would
                                  promise a reinstatement neither route makes —
                                  the Backend leaves a cancelled booking
                                  cancelled. */}
                              {p.registrationStatus === "pending" && (
                                <button
                                  type="button"
                                  onClick={() => void confirmPlace(p)}
                                  disabled={busy}
                                  aria-label={`${confirmLabel} for ${p.name || p.email}`}
                                  className="inline-flex h-8 items-center rounded-full bg-[var(--accent)] px-3 text-xs font-medium text-[var(--accent-foreground)] transition-all hover:bg-[var(--accent-hover)] disabled:pointer-events-none disabled:opacity-50"
                                >
                                  {busy ? "Confirming…" : confirmLabel}
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </TableWrap>
          )}
        </Panel>

        {confirmDialog}
      </div>
    </TrainingsShell>
  );
}
