import { useEffect, useState, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import MarketingShell from "@/components/site/MarketingShell";
import { EventCard } from "@/components/cards/EventCard";
import { EmptyState, PageHero } from "@/components/ui/Section";
import {
  fetchPublishedEvents,
  toEventCardData,
  type EventRow,
} from "@/lib/events-client";
import { cn } from "@/lib/utils";

type EventsData = {
  events: EventRow[];
  upcomingCount: number;
  pastCount: number;
};

export default function EventsIndex() {
  const [searchParams] = useSearchParams();
  const show = searchParams.get("show");
  const showPast = show === "past";

  const [data, setData] = useState<EventsData | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      // The Backend's `/events` already filters to published + upcoming (or,
      // with `includePast`, published + past) and sorts accordingly. Both
      // counts come from one extra fetch of the other direction rather than
      // a dedicated count endpoint.
      const [events, otherDirection] = await Promise.all([
        fetchPublishedEvents({ includePast: showPast }),
        fetchPublishedEvents({ includePast: !showPast }),
      ]);

      if (cancelled) return;

      setData({
        events,
        upcomingCount: showPast ? otherDirection.length : events.length,
        pastCount: showPast ? events.length : otherDirection.length,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [showPast]);

  if (!data) {
    return (
      <MarketingShell>
        <div className="container-page py-24">
          <div className="h-6 w-1/3 animate-pulse rounded bg-[var(--surface-sunken)]" />
        </div>
      </MarketingShell>
    );
  }

  return (
    <MarketingShell>
      <Helmet>
        <title>Events — SingAdvisor</title>
        <meta
          name="description"
          content="Masterclasses, bootcamps and community evenings hosted by SingAdvisor across Singapore."
        />
      </Helmet>

      <PageHero
        eyebrow="Events"
        title="Show up, learn something, meet someone"
        description="Half-day masterclasses, full-day bootcamps and evening gatherings. Most are free; the paid ones are priced to cover the room and the food."
      />

      <div className="container-page py-12 md:py-16">
        <nav
          aria-label="Filter events"
          className="inline-flex rounded-full surface-sunken p-1"
        >
          <Tab to="/events" active={!showPast}>
            Upcoming ({data.upcomingCount})
          </Tab>
          <Tab to="/events?show=past" active={showPast}>
            Past ({data.pastCount})
          </Tab>
        </nav>

        {data.events.length === 0 ? (
          <div className="mt-10">
            <EmptyState
              title={showPast ? "No past events yet" : "Nothing scheduled right now"}
              description={
                showPast
                  ? "Once events have taken place they'll be archived here."
                  : "We're planning the next round. Join the newsletter and you'll hear about it first."
              }
              action={
                showPast ? (
                  <Link
                    to="/events"
                    className="text-sm font-medium text-[var(--accent)] hover:underline"
                  >
                    See upcoming events
                  </Link>
                ) : undefined
              }
            />
          </div>
        ) : (
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {data.events.map((e) => (
              <EventCard key={e._id} event={toEventCardData(e)} />
            ))}
          </div>
        )}
      </div>
    </MarketingShell>
  );
}

function Tab({
  to,
  active,
  children,
}: {
  to: string;
  active: boolean;
  children: ReactNode;
}) {
  return (
    <Link
      to={to}
      aria-current={active ? "true" : undefined}
      className={cn(
        "rounded-full px-5 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-[var(--surface)] text-[var(--text-primary)] shadow-[var(--shadow-soft)]"
          : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
      )}
    >
      {children}
    </Link>
  );
}
