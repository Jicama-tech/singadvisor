import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { adminFetch } from "@/lib/adminFetch";
import { AdminEmpty, PageHeading, Panel, TableWrap, Td, Th } from "@/components/admin/AdminUI";
import { StatusSelect } from "@/components/admin/StatusSelect";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { REGISTRATION_STATUSES } from "@/lib/constants";
import { updateRegistrationStatus, verifyRegistrationPayment } from "@/adminActions";
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
  const [error, setError] = useState<string | null>(null);

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
    if (
      !confirm(
        `Confirm ${formatPrice(r.amountCents, r.currency)} received from ${r.name}?\n\n` +
          `Match reference ${reference} on the bank statement first. This marks the payment ` +
          `received and confirms their place.`,
      )
    ) {
      return;
    }
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

  if (!user) return null;

  const rows = registrations ?? [];
  const pending = rows.filter((r) => r.status === "pending").length;
  const claimed = rows.filter((r) => r.paymentStatus === "claimed").length;

  return (
      <div className="flex flex-col gap-8">
        <PageHeading
          title="Registrations"
          description={
            `${registrations?.length ?? "…"} total · ${pending} awaiting confirmation` +
            (claimed > 0 ? ` · ${claimed} payment${claimed === 1 ? "" : "s"} to check` : "")
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
                        action={updateRegistrationStatus}
                        label={`Status for ${r.name}`}
                      />
                    </Td>
                    <Td>
                      <div className="flex justify-end">
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
      </div>
  );
}
