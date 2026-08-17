import { Link } from "react-router-dom";
import { TrainingCard, type TrainingCardData } from "@/components/cards/TrainingCard";
import { ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Section, SectionHeader } from "@/components/ui/Section";
import type { LandingVariant, ListContent } from "@/lib/landing-client";
import { formatDuration, formatPrice } from "@/lib/utils";

export function TrainingsSection({
  content,
  variant,
  items,
}: {
  content: ListContent;
  variant: LandingVariant;
  items: TrainingCardData[];
}) {
  const header = (
    <div className="flex flex-wrap items-end justify-between gap-6">
      <SectionHeader eyebrow={content.eyebrow} title={content.title} description={content.description} />
      <ButtonLink to={content.ctaHref} variant="secondary">
        {content.ctaLabel}
        <Icon name="arrow-right" size={16} />
      </ButtonLink>
    </div>
  );

  if (variant === "minimal") {
    return (
      <Section tone="sunken">
        {header}
        <ul className="mt-10 flex flex-col divide-y divide-[var(--border-subtle)]">
          {items.map((t) => (
            <li key={t.slug}>
              <Link
                to={`/trainings/${t.slug}`}
                className="group flex flex-wrap items-center justify-between gap-3 py-4 transition-colors hover:text-[var(--accent)]"
              >
                <div>
                  <span className="font-medium text-[var(--text-primary)] group-hover:text-[var(--accent)]">
                    {t.title}
                  </span>
                  <span className="ml-3 text-sm text-[var(--text-muted)]">
                    {formatDuration(t.durationHrs)} · {formatPrice(t.priceCents, t.currency)}
                  </span>
                </div>
                <Icon
                  name="arrow-right"
                  size={15}
                  className="shrink-0 text-[var(--text-muted)] transition-transform group-hover:translate-x-1 group-hover:text-[var(--accent)]"
                />
              </Link>
            </li>
          ))}
        </ul>
      </Section>
    );
  }

  if (variant === "bold") {
    return (
      <Section tone="sunken">
        {header}
        <div className="mt-12 grid gap-8 sm:grid-cols-2">
          {items.map((t) => (
            <TrainingCard key={t.slug} training={t} />
          ))}
        </div>
      </Section>
    );
  }

  // ---- modern (default) — unchanged from the original design ----
  return (
    <Section tone="sunken">
      {header}
      <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((t) => (
          <TrainingCard key={t.slug} training={t} />
        ))}
      </div>
    </Section>
  );
}
