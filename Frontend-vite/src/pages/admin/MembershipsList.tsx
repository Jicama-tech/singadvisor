import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { adminFetch } from "@/lib/adminFetch";
import { AdminEmpty, PageHeading, Panel, TableWrap, Td, Th } from "@/components/admin/AdminUI";
import { Badge } from "@/components/ui/Badge";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import {
  resendMembershipWelcome,
  updateMembershipStatus,
  verifyMembershipPayment,
} from "@/adminActions";
import type { MembershipDoc, MembershipStatus } from "@/lib/membershipsClient";
import { formatDate, formatPrice } from "@/lib/utils";

/** The membership's own state. Mirrors the vocabulary on the entity — and is
 * deliberately not the same column as the payment, because the money and the
 * place are different facts. */
const STATUS_TONE: Record<MembershipStatus, "success" | "accent" | "neutral"> = {
  active: "success",
  pending: "accent",
  expired: "neutral",
  cancelled: "neutral",
};

const FILTERS: { key: string; label: string }[] = [
  { key: "all", label: "All" },
  { key: "pending", label: "Awaiting payment" },
  { key: "active", label: "Active" },
  { key: "expired", label: "Expired" },
  { key: "cancelled", label: "Cancelled" },
];

export default function MembershipsList() {
  const { user } = useAuth();
  const { confirm, confirmDialog } = useConfirm();
  const [memberships, setMemberships] = useState<MembershipDoc[] | null>(null);
  const [filter, setFilter] = useState("all");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    const query = filter === "all" ? "" : `?status=${filter}`;
    const res = await adminFetch(`${__API_URL__}/memberships${query}`);
    if (res.ok) setMemberships((await res.json()) as MembershipDoc[]);
  }, [filter]);

  useEffect(() => {
    void load();
  }, [load]);

  /**
   * Verifying the payment is also what starts the membership — the Backend
   * stamps the term, applies the perks and sends the welcome email off the
   * back of it. The dialog says so, because "mark as paid" reads like
   * bookkeeping and this is not only that.
   */
  async function verify(membership: MembershipDoc) {
    const agreed = await confirm({
      title: `Confirm payment for ${membership.name}?`,
      message: `This starts the ${membership.planName} membership: the term begins today, the perks are applied and a welcome email goes out.`,
      detail: `Match ${formatPrice(membership.amountCents, membership.currency)} against reference ${
        membership.paymentRef ?? "—"
      } on the bank statement first.`,
      confirmLabel: "Confirm payment",
    });
    if (!agreed) return;

    setBusyId(membership._id);
    setNotice(null);
    try {
      await verifyMembershipPayment(membership._id);
      setNotice({ ok: true, text: `${membership.name}'s membership is active.` });
      await load();
    } catch (err) {
      setNotice({
        ok: false,
        text: err instanceof Error ? err.message : "Could not confirm that payment.",
      });
    } finally {
      setBusyId(null);
    }
  }

  /**
   * Send the welcome again — offered on every active membership, including one
   * that has already had it. A welcome gets lost or filtered, or goes out while
   * SMTP is down, and the member is entitled to it either way.
   *
   * The reply carries whether it actually sent: MailService swallows failures,
   * so without checking, a click against a dead SMTP host would report success.
   */
  async function resendWelcome(membership: MembershipDoc) {
    setBusyId(membership._id);
    setNotice(null);
    try {
      const { sent } = await resendMembershipWelcome(membership._id);
      setNotice(
        sent
          ? { ok: true, text: `Welcome email sent to ${membership.email}.` }
          : {
              ok: false,
              text: `Could not send to ${membership.email} — the mail server refused it. Check SMTP settings.`,
            },
      );
    } catch (err) {
      setNotice({
        ok: false,
        text: err instanceof Error ? err.message : "Could not resend the welcome email.",
      });
    } finally {
      setBusyId(null);
    }
  }

  async function cancel(membership: MembershipDoc) {
    const agreed = await confirm({
      title: `Cancel ${membership.name}'s membership?`,
      message: "It stops counting as active immediately.",
      detail:
        "Any perks it granted come off with it — including the mailing list, unless they were already subscribed before they joined.",
      confirmLabel: "Cancel membership",
      tone: "danger",
    });
    if (!agreed) return;

    setBusyId(membership._id);
    setNotice(null);
    try {
      await updateMembershipStatus(membership._id, "cancelled");
      await load();
    } catch (err) {
      setNotice({
        ok: false,
        text: err instanceof Error ? err.message : "Could not cancel that membership.",
      });
    } finally {
      setBusyId(null);
    }
  }

  if (!user) return null;

  const rows = memberships ?? [];

  return (
    <div className="flex flex-col gap-8">
      <PageHeading
        title="Memberships"
        description={`${rows.length} ${filter === "all" ? "in total" : FILTERS.find((f) => f.key === filter)?.label.toLowerCase()}`}
        action={
          <ButtonLink to="/admin/memberships/plans" size="sm" variant="secondary">
            <Icon name="settings" size={15} />
            Plans
          </ButtonLink>
        }
      />

      <nav aria-label="Filter by status" className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={
              filter === f.key
                ? "rounded-full bg-[var(--accent)] px-3 py-1.5 text-xs font-medium text-[var(--accent-foreground)]"
                : "rounded-full border border-[var(--border-strong)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:text-[var(--accent)]"
            }
          >
            {f.label}
          </button>
        ))}
      </nav>

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
        {memberships && rows.length === 0 ? (
          <AdminEmpty message="No memberships here yet." />
        ) : (
          <TableWrap>
            <thead>
              <tr>
                <Th>Member</Th>
                <Th>Plan</Th>
                <Th>Payment</Th>
                <Th>Status</Th>
                <Th>Runs until</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((m) => (
                <tr key={m._id} className="hover:bg-[var(--surface-sunken)]">
                  <Td>
                    <span className="font-medium text-[var(--text-primary)]">{m.name}</span>
                    <span className="block text-xs text-[var(--text-muted)]">{m.email}</span>
                    {m.company && (
                      <span className="block text-xs text-[var(--text-muted)]">{m.company}</span>
                    )}
                  </Td>
                  <Td className="text-[var(--text-secondary)]">
                    {m.planName}
                  </Td>
                  <Td className="whitespace-nowrap">
                    {m.paymentStatus === "not-required" ? (
                      <span className="text-[var(--text-secondary)]">Free</span>
                    ) : (
                      <>
                        <span className="text-[var(--text-secondary)]">
                          {formatPrice(m.amountCents, m.currency)}
                        </span>
                        <span className="block text-xs text-[var(--text-muted)]">
                          {/* The reference is what the admin matches on the
                              bank statement, so it belongs next to the amount
                              rather than behind a click. */}
                          {m.paymentStatus === "paid"
                            ? "Received"
                            : m.paymentStatus === "claimed"
                              ? `Claimed · ${m.paymentRef ?? "—"}`
                              : `Unpaid · ${m.paymentRef ?? "—"}`}
                        </span>
                      </>
                    )}
                  </Td>
                  <Td>
                    <Badge tone={STATUS_TONE[m.status]}>{m.status}</Badge>
                  </Td>
                  <Td className="whitespace-nowrap text-[var(--text-secondary)]">
                    {m.endDate ? formatDate(m.endDate) : "—"}
                  </Td>
                  <Td>
                    <div className="flex items-center justify-end gap-2">
                      {m.status === "pending" && m.paymentStatus !== "not-required" && (
                        <Button
                          size="sm"
                          disabled={busyId === m._id}
                          onClick={() => void verify(m)}
                        >
                          {busyId === m._id ? "Confirming…" : "Confirm payment"}
                        </Button>
                      )}
                      {m.status === "active" && (
                        <>
                          <Button
                            size="sm"
                            variant="secondary"
                            disabled={busyId === m._id}
                            onClick={() => void resendWelcome(m)}
                          >
                            {busyId === m._id ? "Sending…" : "Resend welcome"}
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            disabled={busyId === m._id}
                            onClick={() => void cancel(m)}
                          >
                            Cancel
                          </Button>
                        </>
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
