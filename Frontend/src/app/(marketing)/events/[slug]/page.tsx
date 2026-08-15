import type { Metadata } from "next";
import { AppImage as Image } from "@/components/ui/AppImage";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TicketPurchaseForm } from "@/components/forms/TicketPurchaseForm";
import { SponsorApplicationForm } from "@/components/forms/SponsorApplicationForm";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { fetchEventBySlug, fetchPublishedEvents, remainingCapacity } from "@/lib/events-client";
import { withBackendUrl } from "@/lib/media-url";
import { formatDateTime, formatPrice, formatTimeRange, isUpcoming } from "@/lib/utils";

export const revalidate = 60;

type Params = Promise<{ slug: string }>;

export async function generateStaticParams() {
  const [upcoming, past] = await Promise.all([
    fetchPublishedEvents(),
    fetchPublishedEvents({ includePast: true }),
  ]);
  return [...upcoming, ...past].map(({ slug }) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug } = await params;
  const event = await fetchEventBySlug(slug);
  if (!event) return { title: "Event not found" };
  return {
    title: event.title,
    description: event.summary,
    openGraph: {
      title: event.title,
      description: event.summary,
      images: event.image ? [withBackendUrl(event.image)] : [],
    },
  };
}

export default async function EventDetailPage({ params }: { params: Params }) {
  const { slug } = await params;

  // `fetchEventBySlug` only ever returns published events (see
  // EventsService.findBySlug) — the old `!event.published` check here is
  // now redundant with that server-side filter, but harmless to keep.
  const event = await fetchEventBySlug(slug);
  if (!event) notFound();

  const speakers = event.speakers;
  const agenda = event.agenda;
  const upcoming = isUpcoming(event.startDate);

  // Ticket tiers carry their own inventory now — remaining capacity is a
  // pure function of the fetched event, no separate aggregate query needed.
  const remaining = remainingCapacity(event);
  const capacity = event.visitorTypes.reduce((sum, t) => sum + t.maxCount, 0);

  return (
    <>
      {/* ---- Hero ------------------------------------------------------ */}
      {/* The dark backdrop the hero text sits on. It extends past the image so
          a long title always has something legible behind it. */}
      <div className="relative bg-[var(--color-ink-950)]">
        <div className="absolute inset-x-0 top-0 h-64 overflow-hidden md:h-96">
          {event.image && (
            <Image
              src={withBackendUrl(event.image)}
              alt=""
              fill
              priority
              sizes="100vw"
              className="object-cover"
            />
          )}
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

          {event.speakerProfiles.length > 0 ? (
            <section>
              <h2 className="text-2xl">Speakers</h2>
              <div className="mt-5 grid gap-5 sm:grid-cols-2">
                {event.speakerProfiles.map((sp) => {
                  const socialEntries = Object.entries(sp.socialLinks).filter(([, v]) => v);
                  return (
                    <div
                      key={sp.id}
                      className="flex flex-col gap-3 rounded-[var(--radius-card)] surface-sunken p-5"
                    >
                      <div className="flex items-start gap-3">
                        {sp.photo ? (
                          <Image
                            src={withBackendUrl(sp.photo)}
                            alt=""
                            width={56}
                            height={56}
                            className="h-14 w-14 shrink-0 rounded-full object-cover"
                          />
                        ) : (
                          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-[var(--accent)] text-sm font-semibold text-[var(--accent-foreground)]">
                            {sp.name
                              .split(" ")
                              .map((w) => w[0])
                              .slice(0, 2)
                              .join("")}
                          </span>
                        )}
                        <div className="min-w-0">
                          <p className="font-medium text-[var(--text-primary)]">{sp.name}</p>
                          {(sp.role || sp.company) && (
                            <p className="text-sm text-[var(--text-secondary)]">
                              {[sp.role, sp.company].filter(Boolean).join(" · ")}
                            </p>
                          )}
                          {(sp.startTime || sp.endTime) && (
                            <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                              {sp.startTime}
                              {sp.startTime && sp.endTime && " – "}
                              {sp.endTime}
                            </p>
                          )}
                        </div>
                      </div>

                      <p className="text-sm font-medium text-[var(--accent)]">{sp.topic}</p>
                      {sp.description && (
                        <p className="text-sm leading-relaxed text-[var(--text-secondary)]">{sp.description}</p>
                      )}

                      {socialEntries.length > 0 && (
                        <div className="flex flex-wrap gap-3 pt-1">
                          {socialEntries.map(([platform, url]) => (
                            <a
                              key={platform}
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs font-medium text-[var(--text-muted)] hover:text-[var(--accent)]"
                            >
                              {platform === "linkedin" ? (
                                <Icon name="linkedin" size={13} />
                              ) : (
                                <Icon name="external" size={12} />
                              )}
                              <span className="capitalize">{platform}</span>
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          ) : (
            speakers.length > 0 && (
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
            )
          )}

          {event.sponsorTypes.length > 0 && (
            <section>
              <h2 className="text-2xl">Become a sponsor</h2>
              <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
                Support this event and get your brand in front of attendees.
              </p>
              <div className="mt-5 max-w-md">
                <SponsorApplicationForm eventId={event._id} sponsorTypes={event.sponsorTypes} />
              </div>
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
                    {formatDateTime(event.startDate)}
                  </dd>
                  <dd className="text-sm text-[var(--text-secondary)]">
                    {formatTimeRange(event.startDate, event.endDate)}
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
                    {formatPrice(Math.round((event.visitorTypes[0]?.price ?? 0) * 100), event.currency)}
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
                    {remaining === capacity
                      ? `All ${capacity} seats available.`
                      : `${remaining} of ${capacity} seats left.`}
                  </p>
                  <div className="mt-5">
                    <TicketPurchaseForm
                      eventId={event._id}
                      eventTitle={event.title}
                      visitorTypes={event.visitorTypes}
                      currency={event.currency}
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
