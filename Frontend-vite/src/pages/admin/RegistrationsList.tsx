import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { adminFetch } from "@/lib/adminFetch";
import { AdminEmpty, PageHeading, Panel, TableWrap, Td, Th } from "@/components/admin/AdminUI";
import { StatusSelect } from "@/components/admin/StatusSelect";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { Icon } from "@/components/ui/Icon";
import { REGISTRATION_STATUSES } from "@/lib/constants";
import {
  resendRegistrationConfirmation,
  updateRegistrationStatus,
  verifyRegistrationPayment,
} from "@/adminActions";
import { formatDate, formatDateTime, formatPrice } from "@/lib/utils";
import type { RegistrationDoc } from "@/lib/contentClient";

/**
 * How each payment state reads in the table. "Claimed" is the only amber one
 * on purpose: it is the one state that is waiting on somebody here, and it is
 * emphatically not money — the registrant pressed a button, and nothing has
 * been checked against a bank statement yet.
 */
const PAYMENT_LABEL: Record<RegistrationDoc["paymentStatus"], string> = {
  "not-required": "Free",
  unpaid: "Unpaid",
  claimed: "Claimed",
  paid: "Paid",
};

const PAYMENT_TONE: Record<RegistrationDoc["paymentStatus"], BadgeTone> = {
  "not-required": "neutral",
  unpaid: "neutral",
  claimed: "warn",
  paid: "success",
};

export default function RegistrationsList() {
  const { user } = useAuth();
  const [registrations, setRegistrations] = useState<RegistrationDoc[] | null>(null);
  const [verifying, setVerifying] = useState<string | null>(null);
  const [resending, setResending] = useState<string | null>(null);
  /** What the last Resend actually did. Separate from `error` below because a
   * resend has three endings, not two — it can be refused, it can go out, and
   * it can succeed as a request while sending nothing at all. */
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { confirm, confirmDialog } = useConfirm();

  const load = useCallback(async () => {
    const res = await adminFetch(`${__API_URL__}/registrations`);
    if (res.ok) setRegistrations((await res.json()) as RegistrationDoc[]);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  /**
   * The one action here that says money arrived — and, unless the booking was
   * cancelled, confirms the place with it. Confirmed first, like DeleteButton
   * does, because the only thing standing behind it is somebody having found
   * the transfer: the dialog names the amount and the reference to look for so
   * the check happens before the click, not after.
   */
  async function confirmPayment(r: RegistrationDoc) {
    const reference = r.paymentRef ?? "—";
    const agreed = await confirm({
      title: `Confirm ${formatPrice(r.amountCents, r.currency)} received from ${r.name}?`,
      message: `Match reference ${reference} on the bank statement first.`,
      detail: "This marks the payment received and confirms their place.",
      confirmLabel: "Confirm payment",
    });
    if (!agreed) return;
    setVerifying(r._id);
    setError(null);
    try {
      await verifyRegistrationPayment(r._id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not confirm the payment.");
    } finally {
      setVerifying(null);
    }
  }

  /**
   * Send the joining details again — the Classroom link or the venue address,
   * whichever the course's format calls for.
   *
   * Honest about the answer, because here the answer is usually no: with no
   * SMTP host configured the Backend's best-effort send returns `sent: false`
   * and the request itself still succeeds. Reporting that as "done" would undo
   * the entire point of the column this button sits beside.
   */
  async function resendConfirmation(r: RegistrationDoc) {
    setResending(r._id);
    setNotice(null);
    try {
      const result = await resendRegistrationConfirmation(r._id);
      setNotice(
        result.sent
          ? { ok: true, text: `Joining details sent to ${r.email}.` }
          : {
              ok: false,
              text:
                `Nothing was sent to ${r.email} — no mail server took the message. ` +
                `${r.name} still has not been told where to turn up; check the mail configuration and try again.`,
            },
      );
      await load();
    } catch (err) {
      setNotice({
        ok: false,
        text: err instanceof Error ? err.message : "Could not send the confirmation.",
      });
    } finally {
      setResending(null);
    }
  }

  if (!user) return null;

  const rows = registrations ?? [];
  const pending = rows.filter((r) => r.status === "pending").length;
  const claimed = rows.filter((r) => r.paymentStatus === "claimed").length;
  // Confirmed, and the email carrying the joining details never got out.
  // Unlike the two counts above, nobody will chase this one — the registrant
  // was never told an email was coming — so it has to be visible without
  // reading down a column to find it.
  const untold = rows.filter((r) => r.status === "confirmed" && !r.confirmationEmailSentAt).length;

  return (
      <div className="flex flex-col gap-8">
        <PageHeading
          title="Registrations"
          description={
            `${registrations?.length ?? "…"} total · ${pending} awaiting confirmation` +
            (claimed > 0 ? ` · ${claimed} payment${claimed === 1 ? "" : "s"} to check` : "") +
            (untold > 0 ? ` · ${untold} confirmed without joining details` : "")
          }
        />

        {error && (
          <p
            role="alert"
            className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800 dark:bg-red-950/50 dark:text-red-200"
          >
            {error}
          </p>
        )}

        {notice && (
          <p
            role={notice.ok ? "status" : "alert"}
            className={
              notice.ok
                ? "rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200"
                : "rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800 dark:bg-red-950/50 dark:text-red-200"
            }
          >
            {notice.text}
          </p>
        )}

        <Panel>
          {registrations && registrations.length === 0 ? (
            <AdminEmpty message="No registrations yet." />
          ) : (
            <TableWrap>
              <thead>
                <tr>
                  <Th>Name</Th>
                  <Th>Contact</Th>
                  <Th>For</Th>
                  <Th>Seats</Th>
                  <Th>Amount</Th>
                  <Th>Payment</Th>
                  <Th>Received</Th>
                  <Th>Status</Th>
                  <Th>Joining details</Th>
                  <Th className="text-right">Actions</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r._id} className="hover:bg-[var(--surface-sunken)]">
                    <Td>
                      <span className="font-medium text-[var(--text-primary)]">{r.name}</span>
                      {r.company && (
                        <span className="block text-xs text-[var(--text-muted)]">{r.company}</span>
                      )}
                      {r.message && (
                        <span className="mt-1 block max-w-sm text-xs italic text-[var(--text-secondary)]">
                          “{r.message}”
                        </span>
                      )}
                    </Td>
                    <Td>
                      <a href={`mailto:${r.email}`} className="block text-[var(--accent)] hover:underline">
                        {r.email}
                      </a>
                      <a href={`tel:${r.phone}`} className="block text-xs text-[var(--text-muted)] hover:underline">
                        {r.phone}
                      </a>
                    </Td>
                    <Td>
                      <Badge tone="accent">Training</Badge>
                      <span className="mt-1 block max-w-xs text-xs text-[var(--text-secondary)]">
                        {r.trainingTitle}
                      </span>
                    </Td>
                    <Td className="text-[var(--text-secondary)]">{r.seats}</Td>
                    <Td className="whitespace-nowrap text-[var(--text-secondary)]">
                      {formatPrice(r.amountCents, r.currency)}
                    </Td>
                    <Td>
                      <Badge tone={PAYMENT_TONE[r.paymentStatus]}>
                        {PAYMENT_LABEL[r.paymentStatus]}
                      </Badge>
                      {r.paymentRef && (
                        <span className="mt-1 block font-mono text-xs text-[var(--text-muted)]">
                          {r.paymentRef}
                        </span>
                      )}
                      {/* Whatever the payer typed as their own bank's reference
                          — unverified, and only ever a hint for finding the
                          right line on the statement. */}
                      {r.payerReference && (
                        <span className="block max-w-40 truncate font-mono text-xs text-[var(--text-secondary)]">
                          {r.payerReference}
                        </span>
                      )}
                      {(r.paymentVerifiedAt ?? r.paymentClaimedAt) && (
                        <span className="block text-xs text-[var(--text-muted)]">
                          {formatDateTime((r.paymentVerifiedAt ?? r.paymentClaimedAt) as string)}
                        </span>
                      )}
                    </Td>
                    <Td className="whitespace-nowrap text-[var(--text-secondary)]">
                      {formatDate(r.createdAt)}
                    </Td>
                    <Td>
                      <StatusSelect
                        // Keyed on the status as well as the row: verifying a
                        // payment flips the booking to confirmed server-side,
                        // and this select is uncontrolled — without a remount
                        // it would keep showing the status it was born with.
                        key={`${r._id}-${r.status}`}
                        id={r._id}
                        value={r.status}
                        options={REGISTRATION_STATUSES}
                        action={async (id, status) => {
                          await updateRegistrationStatus(id, status);
                          // Confirming here is what sends the joining details,
                          // so the column beside this select is only truthful
                          // after a re-read. Its failure is swallowed on
                          // purpose: StatusSelect reverts itself when its
                          // action throws, and a refresh that could not run is
                          // not a status that did not save.
                          await load().catch(() => undefined);
                        }}
                        label={`Status for ${r.name}`}
                      />
                    </Td>
                    {/* Deliberately not styled like the payment column: this
                        one answers "has this person been told where to turn
                        up", which a confirmed booking can fail silently — the
                        send is best-effort server-side and a deployment with no
                        SMTP host never manages one. Hence a date for a real
                        delivery, and the attempt behind a failure rather than
                        a blank. */}
                    <Td>
                      {r.confirmationEmailSentAt ? (
                        <>
                          <Badge tone="success">
                            <Icon name="mail" size={13} />
                            Sent
                          </Badge>
                          <span className="mt-1 block text-xs text-[var(--text-muted)]">
                            {formatDateTime(r.confirmationEmailSentAt)}
                          </span>
                        </>
                      ) : r.confirmationEmailAttemptedAt || r.status === "confirmed" ? (
                        <>
                          <Badge tone="danger">
                            <Icon name="alert" size={13} />
                            Not sent
                          </Badge>
                          {r.confirmationEmailAttemptedAt && (
                            <span className="mt-1 block text-xs text-[var(--text-muted)]">
                              Tried {formatDateTime(r.confirmationEmailAttemptedAt)}
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-[var(--text-muted)]">—</span>
                      )}
                    </Td>
                    <Td>
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        {/* Offered against any confirmed booking, INCLUDING one
                            whose email already went out. Joining details get
                            lost, filtered, or sent to an address the person has
                            since stopped reading — and a venue or a Classroom
                            link can change after the first send, which is
                            precisely when somebody needs it sent again.
                            RegistrationsService.resendConfirmation asks only
                            that the booking be confirmed, so the button matches
                            what the route will actually accept.

                            The Email column beside this already says whether it
                            went and when, so nothing is hidden by keeping the
                            button available. Outlined rather than filled: the
                            money button beside it is the one that should take a
                            second's thought. */}
                        {r.status === "confirmed" && (
                          <button
                            type="button"
                            onClick={() => void resendConfirmation(r)}
                            disabled={resending === r._id}
                            aria-label={`Resend joining details to ${r.email}`}
                            className="inline-flex h-8 items-center gap-1.5 rounded-full border border-[var(--border-strong)] px-3 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--accent)]/50 hover:text-[var(--accent)] disabled:pointer-events-none disabled:opacity-50"
                          >
                            <Icon name="mail" size={13} />
                            {resending === r._id ? "Sending…" : "Resend"}
                          </button>
                        )}
                        {/* Offered only against an actual claim: "unpaid" has
                            nobody waiting on it and a free booking has no
                            transfer to confirm, so a money button on every row
                            would be one misclick from a booking marked paid
                            that nobody paid for. The route itself is happy
                            without a claim — a transfer from someone who never
                            came back to press the button is confirmed by asking
                            them to, which also gets their side of the flow
                            showing the right thing. */}
                        {r.paymentStatus === "claimed" && (
                          <button
                            type="button"
                            onClick={() => void confirmPayment(r)}
                            disabled={verifying === r._id}
                            className="inline-flex h-8 items-center rounded-full bg-[var(--accent)] px-3 text-xs font-medium text-[var(--accent-foreground)] transition-all hover:bg-[var(--accent-hover)] disabled:pointer-events-none disabled:opacity-50"
                          >
                            {verifying === r._id ? "Confirming…" : "Confirm payment"}
                          </button>
                        )}
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </TableWrap>
          )}
        </Panel>

        {confirmDialog}
      </div>
  );
}
