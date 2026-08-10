import type { Metadata } from "next";
import { AppImage as Image } from "@/components/ui/AppImage";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RegistrationForm } from "@/components/forms/RegistrationForm";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { db } from "@/lib/db";
import {
  formatDateTime,
  formatPrice,
  formatTimeRange,
  isUpcoming,
  parseAgenda,
  parseList,
} from "@/lib/utils";

export const revalidate = 60;

type Params = Promise<{ slug: string }>;

export async function generateStaticParams() {
  const events = await db.event.findMany({
    where: { published: true },
    select: { slug: true },
  });
  return events.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug } = await params;
  const event = await db.event.findUnique({
    where: { slug },
    select: { title: true, summary: true, image: true },
  });
  if (!event) return { title: "Event not found" };
  return {
    title: event.title,
    description: event.summary,
    openGraph: {
      title: event.title,
      description: event.summary,
      images: [event.image],
    },
  };
}

export default async function EventDetailPage({ params }: { params: Params }) {
  const { slug } = await params;

  const event = await db.event.findUnique({ where: { slug } });
  if (!event || !event.published) notFound();

  const speakers = parseList(event.speakers);
  const agenda = parseAgenda(event.agenda);
  const upcoming = isUpcoming(event.startsAt);

  // Seats remaining drives both the badge and the form's max, so the two
  // can never disagree.
  const taken = await db.registration.aggregate({
    where: { eventId: event.id, status: { not: "cancelled" } },
    _sum: { seats: true },
  });
  const remaining = Math.max(0, event.capacity - (taken._sum.seats ?? 0));

  return (
    <>
      {/* ---- Hero ------------------------------------------------------ */}
      {/* The dark backdrop the hero text sits on. It extends past the image so
          a long title always has something legible behind it. */}
      <div className="relative bg-[var(--color-ink-950)]">
        <div className="absolute inset-x-0 top-0 h-64 overflow-hidden md:h-96">
          <Image
            src={event.image}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-ink-950)] via-[var(--color-ink-950)]/70 to-[var(--color-ink-950)]/20" />
        </div>

        {/* Sits INSIDE the dark hero rather than being pulled up over its
            edge with a negative margin: a two-line title used to overflow the
            image and render white-on-white, making it unreadable. The wrapper
            below supplies the dark backing for however tall this grows. */}
        <div className="container-page relative pt-44 pb-10 md:pt-72">
          <nav aria-label="Breadcrumb" className="mb-4 text-sm text-white/70">
            <ol className="flex flex-wrap items-center gap-2">
              <li>
                <Link href="/events" className="hover:text-white">
                  Events
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li aria-current="page" className="text-white">
                {event.title}
              </li>
            </ol>
          </nav>

          <div className="flex flex-wrap gap-2">
            <Badge tone={upcoming ? "success" : "neutral"}>
              {upcoming ? "Upcoming" : "Past event"}
            </Badge>
            {upcoming && remaining > 0 && remaining <= 20 && (
              <Badge tone="warn">Only {remaining} seats left</Badge>
            )}
            {upcoming && remaining === 0 && <Badge tone="danger">Fully booked</Badge>}
          </div>

          <h1 className="mt-4 max-w-3xl text-3xl text-white md:text-5xl">
            {event.title}
          </h1>
        </div>
      </div>

      {/* ---- Body ------------------------------------------------------ */}
      <div className="container-page grid gap-12 py-12 lg:grid-cols-[1.5fr_1fr] lg:gap-16">
        <div className="flex flex-col gap-12">
          <section>
            <p className="text-lg leading-relaxed text-[var(--text-secondary)]">
              {event.summary}
            </p>
            <div className="prose-body mt-5">
              <p>{event.description}</p>
            </div>
          </section>

          {agenda.length > 0 && (
            <section>
              <h2 className="text-2xl">Agenda</h2>
              <ol className="mt-5 flex flex-col gap-0">
                {agenda.map((item) => (
                  <li
                    key={item.time + item.title}
                    className="flex flex-col gap-1 border-b border-[var(--border-subtle)] py-4 last:border-0 sm:flex-row sm:gap-8"
                  >
                    <span className="w-28 shrink-0 text-sm font-semibold text-[var(--accent)]">
                      {item.time}
                    </span>
                    <span className="text-[var(--text-primary)]">{item.title}</span>
                  </li>
                ))}
              </ol>
            </section>
          )}

          {speakers.length > 0 && (
            <section>
              <h2 className="text-2xl">Speakers</h2>
              <ul className="mt-5 flex flex-wrap gap-3">
                {speakers.map((s) => (
                  <li
                    key={s}
                    className="flex items-center gap-3 rounded-full surface-sunken py-2 pl-2 pr-5"
                  >
                    <span className="grid h-9 w-9 place-items-center rounded-full bg-[var(--accent)] text-sm font-semibold text-[var(--accent-foreground)]">
                      {s
                        .split(" ")
                        .map((w) => w[0])
                        .slice(0, 2)
                        .join("")}
                    </span>
                    <span className="font-medium text-[var(--text-primary)]">{s}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section>
            <h2 className="text-2xl">Getting there</h2>
            <div className="mt-4 flex items-start gap-3 rounded-[var(--radius-card)] surface-sunken p-5">
              <Icon name="map-pin" className="mt-0.5 shrink-0 text-[var(--accent)]" />
              <div>
                <p className="font-medium text-[var(--text-primary)]">{event.venue}</p>
                <p className="text-sm text-[var(--text-secondary)]">{event.address}</p>
                <a
                  href={`https://maps.google.com/?q=${encodeURIComponent(event.address)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-[var(--accent)] hover:underline"
                >
                  Open in Maps
                  <Icon name="external" size={14} />
                </a>
              </div>
            </div>
          </section>
        </div>

        {/* ---- Registration -------------------------------------------- */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] surface-raised p-6 shadow-[var(--shadow-soft)]">
            <dl className="flex flex-col gap-4 border-b border-[var(--border-subtle)] pb-5">
              <div className="flex items-start gap-3">
                <Icon name="calendar" className="mt-0.5 shrink-0 text-[var(--accent)]" />
                <div>
                  <dt className="text-xs uppercase tracking-wide text-[var(--text-muted)]">
                    When
                  </dt>
                  <dd className="font-medium text-[var(--text-primary)]">
                    {formatDateTime(event.startsAt)}
                  </dd>
                  <dd className="text-sm text-[var(--text-secondary)]">
                    {formatTimeRange(event.startsAt, event.endsAt)}
                  </dd>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Icon name="sparkles" className="mt-0.5 shrink-0 text-[var(--accent)]" />
                <div>
                  <dt className="text-xs uppercase tracking-wide text-[var(--text-muted)]">
                    Admission
                  </dt>
                  <dd className="font-medium text-[var(--text-primary)]">
                    {formatPrice(event.priceCents, event.currency)}
                  </dd>
                </div>
              </div>
            </dl>

            <div className="mt-6">
              {!upcoming ? (
                <div className="flex flex-col items-center gap-4 py-6 text-center">
                  <p className="text-sm text-[var(--text-secondary)]">
                    This event has already taken place.
                  </p>
                  <ButtonLink href="/events" variant="secondary">
                    See upcoming events
                  </ButtonLink>
                </div>
              ) : remaining === 0 ? (
                <div className="flex flex-col items-center gap-4 py-6 text-center">
                  <p className="text-sm text-[var(--text-secondary)]">
                    Every seat is taken. Get in touch and we&apos;ll add you to the
                    waitlist.
                  </p>
                  <ButtonLink href="/contact" variant="secondary">
                    Join the waitlist
                  </ButtonLink>
                </div>
              ) : (
                <>
                  <h2 className="text-xl">Register</h2>
                  <p className="mt-1 text-sm text-[var(--text-secondary)]">
                    {remaining === event.capacity
                      ? `All ${event.capacity} seats available.`
                      : `${remaining} of ${event.capacity} seats left.`}
                  </p>
                  <div className="mt-5">
                    <RegistrationForm
                      kind="event"
                      id={event.id}
                      title={event.title}
                      maxSeats={remaining}
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}
