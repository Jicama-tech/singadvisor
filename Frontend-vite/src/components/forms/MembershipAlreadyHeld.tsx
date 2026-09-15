import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { MembershipHeldView } from "@/actions";
import { Icon } from "@/components/ui/Icon";
import { fetchPerkOptions, type MembershipPerkOption } from "@/lib/membershipsClient";
import { formatDate, formatPrice } from "@/lib/utils";

/**
 * What somebody sees when the Google account they just signed in with already
 * has a membership on it.
 *
 * The case this exists for is an ordinary mistake: a person who joined months
 * ago, or who has two Google accounts and picked the wrong one, arriving at the
 * plan grid and starting again. Before this they filled in a name and a phone
 * number, pressed Buy, and got "This account already holds an active
 * membership" — true, and useless. It named neither the plan nor when it ends,
 * so somebody who had genuinely forgotten had nothing to check it against, and
 * somebody on the wrong account was told nothing that would tell them so.
 *
 * So the panel answers the two questions that mistake actually raises: WHICH
 * membership, and WHAT is on it. The email is shown for the same reason — on
 * the wrong-account version of this mistake, the address is the whole answer,
 * and "use a different Google account" is the fix.
 *
 * It renders for a finished membership too, where the offer is to renew rather
 * than a wall: an expired membership is not a reason to refuse somebody's
 * money, and `purchase()` will let that through.
 */
export function MembershipAlreadyHeld({
  membership,
  email,
  onUseAnotherAccount,
  onContinueAnyway,
}: {
  membership: MembershipHeldView;
  /** From the Google profile, not from the Backend: the reduced view carries
   * nothing identifying, and this is the account they are looking at. */
  email?: string;
  onUseAnotherAccount: () => void;
  /** Offered only where buying again is allowed — a membership that has ended.
   * Absent for an active one, which the Backend refuses outright. */
  onContinueAnyway?: () => void;
}) {
  const [perkOptions, setPerkOptions] = useState<MembershipPerkOption[]>([]);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const options = await fetchPerkOptions();
      if (!cancelled) setPerkOptions(options);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /** The catalogue's wording, falling back to the stored key so a perk that has
   * since left the catalogue still shows as something. */
  const perkLabel = (key: string) => perkOptions.find((p) => p.key === key)?.label ?? key;

  const active = membership.status === "active";
  const pending = membership.status === "pending";
  const owes = pending && membership.paymentStatus !== "paid";

  const heading = active
    ? "You are already a member"
    : pending
      ? "You have already started this"
      : "You have been a member before";

  const lead = active
    ? "This Google account already holds a membership, so there is nothing to buy."
    : pending
      ? "This Google account already has a membership waiting on payment. Finishing that one is better than starting a second."
      : "This Google account held a membership that has since ended. You can take out a new one.";

  return (
    <div className="flex flex-col gap-5 rounded-[var(--radius-card)] border border-[var(--accent)]/25 bg-[var(--accent-soft)] p-6">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--surface)] text-[var(--accent)] shadow-[var(--shadow-soft)]">
          <Icon name={active ? "check" : "alert"} size={18} />
        </span>
        <div className="min-w-0">
          <p className="text-base font-medium text-[var(--text-primary)]">{heading}</p>
          <p className="mt-1 text-sm leading-relaxed text-[var(--text-secondary)]">{lead}</p>
        </div>
      </div>

      <dl className="flex flex-col gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] px-4 py-3 text-sm">
        <Row label="Plan" value={membership.planName} strong />
        {email && <Row label="Account" value={email} />}
        <Row
          label="Status"
          value={
            active
              ? "Active"
              : pending
                ? owes
                  ? "Waiting for payment"
                  : "Waiting to be activated"
                : membership.status === "expired"
                  ? "Expired"
                  : "Cancelled"
          }
        />
        {membership.startDate && <Row label="Started" value={formatDate(membership.startDate)} />}
        {membership.endDate && (
          <Row
            label={active ? "Runs until" : "Ended"}
            value={formatDate(membership.endDate)}
            strong={active}
          />
        )}
        {owes && membership.amountCents > 0 && (
          <Row
            label="To pay"
            value={formatPrice(membership.amountCents, membership.currency)}
            strong
          />
        )}
        {membership.reference && <Row label="Reference" value={membership.reference} />}
        {membership.perks.length > 0 && (
          <div className="flex flex-col gap-1 border-t border-[var(--border-subtle)] pt-2 sm:flex-row sm:gap-3">
            <dt className="shrink-0 text-[var(--text-muted)] sm:w-28">Includes</dt>
            <dd className="min-w-0 flex-1">
              <ul className="flex flex-col gap-1">
                {membership.perks.map((key) => (
                  <li
                    key={key}
                    className="flex items-start gap-2 text-[var(--text-primary)]"
                  >
                    <span className="mt-0.5 shrink-0 text-[var(--accent)]">
                      <Icon name="check" size={14} />
                    </span>
                    <span className="min-w-0">{perkLabel(key)}</span>
                  </li>
                ))}
              </ul>
            </dd>
          </div>
        )}
      </dl>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        {active && (
          <Link
            to="/blog"
            className="inline-flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-full bg-[var(--accent)] px-6 text-[0.9375rem] font-medium text-[var(--accent-foreground)] shadow-[var(--shadow-soft)] transition-all duration-200 hover:bg-[var(--accent-hover)] hover:shadow-[var(--shadow-lift)] active:scale-[0.98]"
          >
            Read members-only writing
            <Icon name="arrow-right" size={16} />
          </Link>
        )}

        {onContinueAnyway && (
          <button
            type="button"
            onClick={onContinueAnyway}
            className="inline-flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-full bg-[var(--accent)] px-6 text-[0.9375rem] font-medium text-[var(--accent-foreground)] shadow-[var(--shadow-soft)] transition-all duration-200 hover:bg-[var(--accent-hover)] hover:shadow-[var(--shadow-lift)] active:scale-[0.98]"
          >
            Take out a new membership
            <Icon name="arrow-right" size={16} />
          </button>
        )}

        <button
          type="button"
          onClick={onUseAnotherAccount}
          className="inline-flex h-11 items-center justify-center whitespace-nowrap rounded-full border border-[var(--border-strong)] px-6 text-[0.9375rem] font-medium text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
        >
          Use a different Google account
        </button>
      </div>

      {owes && (
        <p className="text-xs leading-relaxed text-[var(--text-muted)]">
          Already transferred the money? A membership is activated by hand once the transfer is
          matched, usually within one working day.
        </p>
      )}
    </div>
  );
}

/** One line of the summary. A definition list rather than a table: it is a set
 * of labelled facts, and it has to stack on a phone. */
function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
      <dt className="shrink-0 text-[var(--text-muted)] sm:w-28">{label}</dt>
      <dd
        className={`min-w-0 break-words ${
          strong ? "font-medium text-[var(--text-primary)]" : "text-[var(--text-secondary)]"
        }`}
      >
        {value}
      </dd>
    </div>
  );
}
