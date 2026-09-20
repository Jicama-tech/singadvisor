import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Icon } from "@/components/ui/Icon";
import { fetchPublicPlans, type MembershipPlanDoc } from "@/lib/membershipsClient";
import { formatPrice } from "@/lib/utils";

/**
 * The membership advert, dropped into the middle of an article.
 *
 * Two rules it keeps, because an in-content advert that breaks either is worse
 * than no advert at all:
 *
 * 1. It never advertises something nobody can buy. If no plan is published, it
 *    renders NOTHING — not a placeholder, not "coming soon". The same is true
 *    while the plans are still loading, so the article never reflows around a
 *    box that turns out to be empty.
 *
 * 2. It quotes a real price, taken from the cheapest published plan rather than
 *    written into the copy. A hardcoded "from $120" is a promise that goes
 *    stale the first time someone edits a plan, in the one place a reader is
 *    most likely to hold it against you.
 *
 * It says nothing about course prices. Membership does not change what a course
 * costs — the percentage discount that once did was removed — so the offer is
 * the writing, not a cheaper place.
 *
 * It is deliberately quiet: one accent-tinted card, no animation, no dismiss
 * button. A reader who does not want it should be able to skim past it in one
 * beat, and a dismiss control would need storage and a decision about what
 * "dismissed" means across articles.
 */
export function MembershipPromo({ className }: { className?: string }) {
  const [plans, setPlans] = useState<MembershipPlanDoc[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const loaded = await fetchPublicPlans();
        if (!cancelled) setPlans(loaded);
      } catch {
        // An advert is the least important thing on the page. A failed fetch
        // leaves it absent rather than showing an error inside someone's article.
        if (!cancelled) setPlans([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Still loading, or nothing on sale — either way, show nothing.
  if (!plans || plans.length === 0) return null;

  // Cheapest first is how the public list is already sorted, but this does not
  // rely on that: the entry price is the claim being made, so it is computed.
  const cheapest = plans.reduce((low, plan) => (plan.priceCents < low.priceCents ? plan : low));

  const price =
    cheapest.priceCents > 0 ? formatPrice(cheapest.priceCents, cheapest.currency) : "free";

  return (
    <aside
      // `aside` and the label: a screen reader should be able to tell this is
      // an aside from the author's argument, not the next paragraph of it.
      aria-label="Membership"
      className={[
        "not-prose my-10 flex flex-col gap-4 rounded-[var(--radius-card)] border border-[var(--accent)]/25 bg-[var(--accent-soft)] p-6 sm:flex-row sm:items-center sm:gap-6",
        className ?? "",
      ].join(" ")}
    >
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[var(--surface)] text-[var(--accent)] shadow-[var(--shadow-soft)]">
        <Icon name="star" size={20} />
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium uppercase tracking-wide text-[var(--accent)]">
          Membership
        </p>
        <p className="mt-1 text-base font-medium text-[var(--text-primary)]">
          Members read what we write first
        </p>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          {cheapest.priceCents > 0
            ? `From ${price} — ${cheapest.name}.`
            : `Start free with ${cheapest.name}.`}
        </p>
      </div>

      <Link
        to="/membership"
        className="inline-flex h-11 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full bg-[var(--accent)] px-6 text-[0.9375rem] font-medium text-[var(--accent-foreground)] shadow-[var(--shadow-soft)] transition-all duration-200 hover:bg-[var(--accent-hover)] hover:shadow-[var(--shadow-lift)] active:scale-[0.98]"
      >
        See plans
        <Icon name="arrow-right" size={16} />
      </Link>
    </aside>
  );
}
