import type { Metadata } from "next";
import Link from "next/link";
import { EventCard } from "@/components/cards/EventCard";
import { EmptyState, PageHero } from "@/components/ui/Section";
import { db } from "@/lib/db";
import { cn } from "@/lib/utils";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Events",
  description:
    "Masterclasses, bootcamps and community evenings hosted by SingAdvisor across Singapore.",
};

type SearchParams = Promise<{ show?: string }>;

export default async function EventsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { show } = await searchParams;
  const showPast = show === "past";
  const now = new Date();

  const [events, upcomingCount, pastCount] = await Promise.all([
    db.event.findMany({
      where: {
        published: true,
        startsAt: showPast ? { lt: now } : { gte: now },
      },
      // Upcoming reads soonest-first; past reads most-recent-first.
      orderBy: { startsAt: showPast ? "desc" : "asc" },
    }),
    db.event.count({ where: { published: true, startsAt: { gte: now } } }),
    db.event.count({ where: { published: true, startsAt: { lt: now } } }),
  ]);

  return (
    <>
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
          <Tab href="/events" active={!showPast}>
            Upcoming ({upcomingCount})
          </Tab>
          <Tab href="/events?show=past" active={showPast}>
            Past ({pastCount})
          </Tab>
        </nav>

        {events.length === 0 ? (
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
                    href="/events"
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
            {events.map((e) => (
              <EventCard key={e.id} event={e} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function Tab({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
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
