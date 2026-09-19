import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import MarketingShell from "@/components/site/MarketingShell";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Section } from "@/components/ui/Section";
import { MembershipPurchaseForm } from "@/components/forms/MembershipPurchaseForm";
import {
  fetchPerkOptions,
  fetchPublicPlans,
  type MembershipPerkOption,
  type MembershipPlanDoc,
} from "@/lib/membershipsClient";
import { formatPrice } from "@/lib/utils";

/** Days → the words a person thinks in. Anything unrecognised keeps its day
 * count, which is honest for a custom term rather than rounding it into a lie. */
function formatTerm(days: number): string {
  const known: Record<number, string> = {
    30: "a month",
    90: "3 months",
    180: "6 months",
    365: "a year",
    730: "2 years",
  };
  return known[days] ?? `${days} days`;
}

export default function MembershipPage() {
  const [plans, setPlans] = useState<MembershipPlanDoc[] | null>(null);
  const [perkOptions, setPerkOptions] = useState<MembershipPerkOption[]>([]);
  const [chosen, setChosen] = useState<MembershipPlanDoc | null>(null);
  /** Distinct from `plans === null`. An unreachable API and an empty catalogue
   * are different things to tell a visitor, and they were the same thing. */
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [loadedPlans, loadedPerks] = await Promise.all([
          fetchPublicPlans(),
          fetchPerkOptions(),
        ]);
        if (cancelled) return;
        setPlans(loadedPlans);
        setPerkOptions(loadedPerks);
      } catch {
        // fetchPublicPlans does not catch — a backend that is down, restarting
        // or unreachable rejects, the rejection escapes this async IIFE, and
        // setPlans is never called. `plans` stays null and the page sits on
        // "Loading plans…" for as long as it is open.
        //
        // Landing on the EMPTY branch instead would be worse than the hang:
        // it says "Membership is opening soon", which tells a visitor the
        // product does not exist rather than that we could not reach it.
        if (cancelled) return;
        setPlans([]);
        setLoadFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const perkLabel = useMemo(
    () => (key: string) => perkOptions.find((p) => p.key === key)?.label ?? key,
    [perkOptions],
  );

  return (
    <MarketingShell>
      <Helmet>
        <title>Membership — SingAdvisor</title>
        <meta
          name="description"
          content="Join SingAdvisor for members-only articles and issues, and read what we write next before anyone else."
        />
      </Helmet>

      <Section>
        <div className="container-page">
          <div className="max-w-2xl">
            <p className="text-sm font-medium uppercase tracking-wide text-[var(--accent)]">
              Membership
            </p>
            <h1 className="mt-3 text-4xl md:text-5xl">Join us for the year</h1>
            <p className="mt-4 text-lg leading-relaxed text-[var(--text-secondary)]">
              One payment a year, and the things we write for members reach you first —
              members-only articles and issues, straight to your inbox.
            </p>
          </div>

          {/* Choosing a plan swaps the grid for the form rather than opening a
              dialog: the decision has already been made by this point, and a
              modal over a page of alternatives invites people to re-open it. */}
          {chosen ? (
            <div className="mt-10 max-w-xl">
              <div className="mb-6 rounded-[var(--radius-card)] border border-[var(--border-subtle)] surface-sunken px-5 py-4">
                <p className="text-xs uppercase tracking-wide text-[var(--text-muted)]">
                  You&apos;re joining
                </p>
                <p className="mt-1 text-lg font-medium text-[var(--text-primary)]">{chosen.name}</p>
                <p className="text-sm text-[var(--text-secondary)]">
                  {chosen.priceCents > 0
                    ? `${formatPrice(chosen.priceCents, chosen.currency)} for ${formatTerm(chosen.durationDays)}`
                    : `Free for ${formatTerm(chosen.durationDays)}`}
                </p>
              </div>

              <MembershipPurchaseForm
                planId={chosen._id}
                planName={chosen.name}
                onCancel={() => setChosen(null)}
              />
            </div>
          ) : (
            <div className="mt-10">
              {plans === null ? (
                <p className="text-sm text-[var(--text-secondary)]">Loading plans…</p>
              ) : loadFailed ? (
                <div className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] surface-sunken px-6 py-12 text-center">
                  <p className="font-medium text-[var(--text-primary)]">
                    We could not load the plans
                  </p>
                  <p className="mx-auto mt-2 max-w-sm text-sm text-[var(--text-secondary)]">
                    Something went wrong at our end rather than yours. Please try again in a
                    moment.
                  </p>
                  <button
                    type="button"
                    onClick={() => window.location.reload()}
                    className="mt-5 inline-flex h-11 items-center justify-center rounded-full bg-[var(--accent)] px-6 text-[0.9375rem] font-medium text-[var(--accent-foreground)] shadow-[var(--shadow-soft)] transition-all duration-200 hover:bg-[var(--accent-hover)]"
                  >
                    Try again
                  </button>
                </div>
              ) : plans.length === 0 ? (
                /* No plans published yet. Says so plainly rather than showing an
                   empty grid that reads as a broken page. */
                <div className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] surface-sunken px-6 py-12 text-center">
                  <p className="font-medium text-[var(--text-primary)]">
                    Membership is opening soon
                  </p>
                  <p className="mx-auto mt-2 max-w-sm text-sm text-[var(--text-secondary)]">
                    We&apos;re putting the finishing touches to it. In the meantime, everything on
                    the site is open to everyone.
                  </p>
                </div>
              ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {plans.map((plan) => (
                    <article
                      key={plan._id}
                      className="flex flex-col rounded-[var(--radius-card)] border border-[var(--border-subtle)] surface-raised p-6 shadow-[var(--shadow-soft)]"
                    >
                      <h2 className="text-xl">{plan.name}</h2>
                      {plan.description && (
                        <p className="mt-2 text-sm text-[var(--text-secondary)]">
                          {plan.description}
                        </p>
                      )}

                      <p className="mt-5 flex items-baseline gap-2">
                        <span className="text-3xl font-semibold text-[var(--text-primary)]">
                          {plan.priceCents > 0
                            ? formatPrice(plan.priceCents, plan.currency)
                            : "Free"}
                        </span>
                        <span className="text-sm text-[var(--text-muted)]">
                          for {formatTerm(plan.durationDays)}
                        </span>
                      </p>

                      {plan.perks.length > 0 && (
                        <ul className="mt-5 flex flex-1 flex-col gap-2.5">
                          {plan.perks.map((key) => (
                            <li key={key} className="flex items-start gap-2.5 text-sm">
                              <span className="mt-0.5 text-[var(--accent)]">
                                <Icon name="check" size={16} />
                              </span>
                              <span className="text-[var(--text-secondary)]">
                                {perkLabel(key)}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}

                      <Button
                        type="button"
                        className="mt-6 w-full"
                        onClick={() => setChosen(plan)}
                      >
                        {plan.priceCents > 0 ? `Join ${plan.name}` : "Join for free"}
                      </Button>
                    </article>
                  ))}
                </div>
              )}
            </div>
          )}

          <p className="mt-10 max-w-2xl text-sm text-[var(--text-muted)]">
            Payment is by PayNow transfer, which we match by hand — so a paid membership starts once
            we&apos;ve found your transfer, usually within one working day. Your membership is tied
            to the Google account you join with, which is how members-only articles and issues open
            for you.
          </p>
        </div>
      </Section>
    </MarketingShell>
  );
}
