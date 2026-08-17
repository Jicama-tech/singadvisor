import { Link } from "react-router-dom";
import { EventCard, type EventCardData } from "@/components/cards/EventCard";
import { ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Section, SectionHeader } from "@/components/ui/Section";
import type { LandingVariant, ListContent } from "@/lib/landing-client";
import { formatDate } from "@/lib/utils";

export function EventsSection({
  content,
  variant,
  items,
}: {
  content: ListContent;
  variant: LandingVariant;
  items: EventCardData[];
}) {
  const header = (
    <div className="flex flex-wrap items-end justify-between gap-6">
      <SectionHeader eyebrow={content.eyebrow} title={content.title} description={content.description} />
      <ButtonLink href={content.ctaHref} variant="secondary">
        {content.ctaLabel}
        <Icon name="arrow-right" size={16} />
      </ButtonLink>
    </div>
  );

  if (variant === "minimal") {
    return (
      <Section>
        {header}
        <ul className="mt-10 flex flex-col divide-y divide-[var(--border-subtle)]">
          {items.map((e) => (
            <li key={e.slug}>
              <Link
                href={`/events/${e.slug}`}
                className="group flex flex-wrap items-center justify-between gap-3 py-4 transition-colors hover:text-[var(--accent)]"
              >
                <div>
                  <span className="font-medium text-[var(--text-primary)] group-hover:text-[var(--accent)]">
                    {e.title}
                  </span>
                  <span className="ml-3 text-sm text-[var(--text-muted)]">
                    {formatDate(e.startDate)} · {e.venue}
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
      <Section>
        {header}
        <div className="mt-12 grid gap-8 sm:grid-cols-2">
          {items.map((e) => (
            <EventCard key={e.slug} event={e} />
          ))}
        </div>
      </Section>
    );
  }

  // ---- modern (default) — unchanged from the original design ----
  return (
    <Section>
      {header}
      <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((e) => (
          <EventCard key={e.slug} event={e} />
        ))}
      </div>
    </Section>
  );
}
