import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import MarketingShell from "@/components/site/MarketingShell";
import { AppImage as Image } from "@/components/ui/AppImage";
import { TicketPurchaseForm } from "@/components/forms/TicketPurchaseForm";
import { SponsorApplicationForm } from "@/components/forms/SponsorApplicationForm";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { EventGallery } from "@/components/events/EventGallery";
import {
  EventAdBar,
  EventReels,
  EventSponsorBar,
} from "@/components/events/EventMedia";
import { EventSpaces } from "@/components/events/EventSpaces";
import { EventInfoCards } from "@/components/events/EventInfoCards";
import { EventSpeakerCarousel } from "@/components/events/EventSpeakerCarousel";
import { SlotBooking } from "@/components/events/SlotBooking";
import { EventVenueMap } from "@/components/events/EventVenueMap";
import { EventAddOns, EventWorkshops } from "@/components/events/EventExtras";
import {
  EventCustomSections,
  EventGoodToKnow,
  EventPolicies,
  EventSocialLinks,
  EventTicketTypes,
} from "@/components/events/EventInfo";
import {
  fetchEventBySlug,
  remainingCapacity,
  type EventRow,
} from "@/lib/events-client";
import { withEventshUrl } from "@/lib/media-url";
import {
  formatDateTime,
  formatPrice,
  formatTimeRange,
  isUpcoming,
} from "@/lib/utils";

/**
 * The public event page ("eventfront").
 *
 * Section order deliberately mirrors eventsh-v1's own eventfront, which is the
 * page organizers know: at-a-glance info cards under the hero, then gallery →
 * about → tags → speakers → workshops → ticket types, a full-width highlights
 * strip, and a tabbed block at the end for organizer / venue / speaker detail.
 *
 * The styling is NOT ported with it. eventsh hardcodes greys and reds
 * (`text-gray-900`, `bg-gray-50`) and is light-mode only; this uses the app's
 * design tokens, so the page keeps working in dark mode and sits alongside
 * Trainings, Blog and Careers without looking like a different product.
 */
export default function EventDetail() {
  const { slug } = useParams();
  const [event, setEvent] = useState<EventRow | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!slug) {
        setEvent(null);
        return;
      }
      const found = await fetchEventBySlug(slug);
      if (cancelled) return;
      // `fetchEventBySlug` only ever returns published events — the old
      // `!event.published` check is redundant with that server-side filter.
      setEvent(found);
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (!event) {
    if (event === undefined) {
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
          <title>Event not found — SingAdvisor</title>
        </Helmet>
        <div className="container-page py-24 text-center">
          <h1 className="text-3xl">Page not found</h1>
          <p className="mt-3 text-[var(--text-secondary)]">
            This event doesn&apos;t exist or is no longer listed.
          </p>
          <Link
            to="/events"
            className="mt-6 inline-block rounded-full bg-[var(--accent)] px-6 py-3 text-sm font-medium text-[var(--accent-foreground)] transition-colors hover:bg-[var(--accent-hover)]"
          >
            Back to events
          </Link>
        </div>
      </MarketingShell>
    );
  }

  const agenda = event.agenda;
  const upcoming = isUpcoming(event.endDate || event.startDate);

  // Ticket tiers carry their own inventory now — remaining capacity is a
  // pure function of the fetched event.
  //
  // An event does not have to sell tickets at all: plenty are booked purely by
  // space or by court slot. "No tickets" and "sold out" both leave `remaining`
  // at zero, so everything below asks `sellsTickets` first — without that, an
  // event with no visitor types announced itself as Fully booked and offered a
  // waitlist for seats that never existed.
  const hasVenue =
    event.venueTables.length +
      event.venueRoundTables.length +
      event.venueScheduledSpaces.length +
      event.venueSeats.length >
    0;
  const hasSpaces =
    event.tableTemplates.length +
      event.roundTableTemplates.length +
      event.scheduledSpaceTemplates.length >
    0;
  const hasSpeakers = event.speakerProfiles.length > 0;

  const remaining = remainingCapacity(event);
  const activeTiers = event.visitorTypes.filter((t) => t.isActive);
  const sellsTickets = activeTiers.length > 0;
  // Counted across ACTIVE tiers only, to match `remaining` — totalling every
  // tier meant one switched-off tier still contributed its seats.
  const capacity = activeTiers.reduce((sum, t) => sum + t.maxCount, 0);


  return (
    <MarketingShell>
      <Helmet>
        <title>{event.title} — SingAdvisor</title>
        <meta name="description" content={event.summary} />
      </Helmet>

      {/* Organizer announcement strip — above everything, same placement as
          eventsh-v1's Eventfront. */}
      <EventAdBar adBar={event.adBar} />

      {/* ---- Hero ------------------------------------------------------ */}
      {/* The dark backdrop the hero text sits on. It extends past the image so
          a long title always has something legible behind it. */}
      <div className="relative bg-[var(--color-ink-950)]">
        <div className="absolute inset-x-0 top-0 h-64 overflow-hidden md:h-96">
          {event.image && (
            <Image
              src={withEventshUrl(event.image)}
              alt=""
              fill
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
        <div className="container-page relative pt-44 pb-16 md:pt-72">
          <nav aria-label="Breadcrumb" className="mb-4 text-sm text-white/70">
            <ol className="flex flex-wrap items-center gap-2">
              <li>
                <Link to="/events" className="hover:text-white">
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
            {upcoming && sellsTickets && remaining > 0 && remaining <= 20 && (
              <Badge tone="warn">Only {remaining} seats left</Badge>
            )}
            {upcoming && sellsTickets && remaining === 0 && (
              <Badge tone="danger">Fully booked</Badge>
            )}
          </div>

          <h1 className="mt-4 max-w-3xl text-3xl text-white md:text-5xl">
            {event.title}
          </h1>
        </div>
      </div>

      {/* At-a-glance facts, overlapping the hero's lower edge — eventsh opens
          the same way, before any prose. */}
      <div className="container-page mt-12">
        <EventInfoCards
          event={event}
          remaining={remaining}
          capacity={capacity}
          upcoming={upcoming}
          sellsTickets={sellsTickets}
          hasBookableSpaces={hasSpaces}
        />
      </div>

      {/* Sponsor logos sit directly under the banner (full-bleed, so outside
          the body grid) — the placement the admin's Media tab promises. */}
      <div className="mt-10">
        <EventSponsorBar event={event} />
      </div>

      {/* ---- Body ------------------------------------------------------ */}
      <div className="container-page grid gap-12 py-12 lg:grid-cols-[1.5fr_1fr] lg:gap-16">
        <div className="flex flex-col gap-12">
          {/* eventsh's order: gallery first, so mobile sees visuals before a
              wall of text. */}
          <EventGallery gallery={event.gallery} />

          <section>
            <h2 className="text-2xl">About this event</h2>
            <p className="mt-4 text-lg leading-relaxed text-[var(--text-secondary)]">
              {event.summary}
            </p>
            {event.description && event.description !== event.summary && (
              <div className="prose-body mt-5">
                <p>{event.description}</p>
              </div>
            )}
            <EventSocialLinks socialMedia={event.socialMedia} />
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
                    <span className="text-[var(--text-primary)]">
                      {item.title}
                    </span>
                  </li>
                ))}
              </ol>
            </section>
          )}

          <EventSpeakerCarousel speakers={event.speakerProfiles} />

          <EventWorkshops event={event} />

          <EventTicketTypes event={event} />

          <div id="book">
            <EventSpaces event={event} />
          </div>

          {/* Sits right after the read-only list of spaces: that section says
              what exists, this one actually takes the booking. */}
          <SlotBooking eventId={event._id} currency={event.currency} />

          <EventAddOns event={event} />

          <EventGoodToKnow event={event} />

          <EventCustomSections sections={event.customSections} />

          {event.sponsorTypes.length > 0 && (
            <section>
              <h2 className="text-2xl">Become a sponsor</h2>
              <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
                Support this event and get your brand in front of attendees.
              </p>
              <div className="mt-5 max-w-md">
                <SponsorApplicationForm
                  eventId={event._id}
                  sponsorTypes={event.sponsorTypes}
                />
              </div>
            </section>
          )}

          <EventPolicies event={event} />
        </div>

        {/* ---- Registration -------------------------------------------- */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] surface-raised p-6 shadow-[var(--shadow-soft)]">
            <dl className="flex flex-col gap-4 border-b border-[var(--border-subtle)] pb-5">
              <div className="flex items-start gap-3">
                <Icon
                  name="calendar"
                  className="mt-0.5 shrink-0 text-[var(--accent)]"
                />
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
                <Icon
                  name="sparkles"
                  className="mt-0.5 shrink-0 text-[var(--accent)]"
                />
                <div>
                  <dt className="text-xs uppercase tracking-wide text-[var(--text-muted)]">
                    Admission
                  </dt>
                  <dd className="font-medium text-[var(--text-primary)]">
                    {formatPrice(
                      Math.round((event.visitorTypes[0]?.price ?? 0) * 100),
                      event.currency,
                    )}
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
                  <ButtonLink to="/events" variant="secondary">
                    See upcoming events
                  </ButtonLink>
                </div>
              ) : !sellsTickets ? (
                // No ticket tiers at all. The event is still bookable if it
                // sells space or court slots, so point at that rather than
                // claiming it is sold out.
                <div className="flex flex-col items-center gap-4 py-6 text-center">
                  <p className="text-sm text-[var(--text-secondary)]">
                    {hasSpaces
                      ? "This event is booked by space rather than by ticket."
                      : "No ticket is needed for this event."}
                  </p>
                  {hasSpaces ? (
                    <a
                      href="#book"
                      className="inline-flex h-10 items-center justify-center rounded-full border border-[var(--border-strong)] px-5 text-sm font-medium text-[var(--text-primary)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
                    >
                      See what&apos;s available
                    </a>
                  ) : (
                    <ButtonLink to="/contact" variant="secondary">
                      Ask a question
                    </ButtonLink>
                  )}
                </div>
              ) : remaining === 0 ? (
                <div className="flex flex-col items-center gap-4 py-6 text-center">
                  <p className="text-sm text-[var(--text-secondary)]">
                    Every seat is taken. Get in touch and we&apos;ll add you to
                    the waitlist.
                  </p>
                  <ButtonLink to="/contact" variant="secondary">
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

      {/* ---- Highlights ------------------------------------------------ */}
      {/* Full width and outside the body grid, matching where eventsh puts its
          reel strip: below the main content, before the tabs. */}
      <div className="border-t border-[var(--border-subtle)] surface-sunken">
        <div className="container-page py-12">
          <EventReels reelLinks={event.reelLinks} />
        </div>
      </div>

      {/* ---- Detail tabs ----------------------------------------------- */}
      {/* eventsh closes its eventfront with a tabbed block rather than yet
          more stacked sections — the detail most visitors do not need, kept
          one click away. Tabs with nothing behind them are not rendered. */}
      <div className="container-page py-12">
        <Tabs defaultValue="organizer">
          <TabsList>
            <TabsTrigger value="organizer">Organizer</TabsTrigger>
            {(hasVenue || hasSpaces) && (
              <TabsTrigger value="venue">Venue layout</TabsTrigger>
            )}
            {hasSpeakers && (
              <TabsTrigger value="speakers">Speakers</TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="organizer" className="mt-6">
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="rounded-[var(--radius-card)] surface-sunken p-5">
                <h3 className="text-lg">Getting there</h3>
                <div className="mt-3 flex items-start gap-3">
                  <Icon
                    name="map-pin"
                    className="mt-0.5 shrink-0 text-[var(--accent)]"
                  />
                  <div>
                    <p className="font-medium text-[var(--text-primary)]">
                      {event.venue}
                    </p>
                    <p className="text-sm text-[var(--text-secondary)]">
                      {event.address}
                    </p>
                    {event.address && (
                      <a
                        href={`https://maps.google.com/?q=${encodeURIComponent(event.address)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-[var(--accent)] hover:underline"
                      >
                        Open in Maps
                        <Icon name="external" size={14} />
                      </a>
                    )}
                  </div>
                </div>
              </div>

              <div className="rounded-[var(--radius-card)] surface-sunken p-5">
                <h3 className="text-lg">Questions about this event?</h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
                  Get in touch and we&apos;ll come back to you.
                </p>
                <ButtonLink to="/contact" variant="secondary" className="mt-4">
                  Contact us
                </ButtonLink>
                <EventSocialLinks socialMedia={event.socialMedia} />
              </div>
            </div>
          </TabsContent>

          {(hasVenue || hasSpaces) && (
            <TabsContent value="venue" className="mt-6">
              <div className="flex flex-col gap-12">
                <EventVenueMap event={event} />
              </div>
            </TabsContent>
          )}

          {hasSpeakers && (
            <TabsContent value="speakers" className="mt-6">
              <div className="grid gap-5 sm:grid-cols-2">
                {event.speakerProfiles.map((sp) => {
                  const socialEntries = Object.entries(sp.socialLinks).filter(
                    ([, v]) => v,
                  );
                  return (
                    <div
                      key={sp.id || sp.name}
                      className="flex flex-col gap-3 rounded-[var(--radius-card)] surface-sunken p-5"
                    >
                      <div className="flex items-start gap-3">
                        {sp.photo ? (
                          <Image
                            src={withEventshUrl(sp.photo)}
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
                          <p className="font-medium text-[var(--text-primary)]">
                            {sp.name}
                          </p>
                          {(sp.role || sp.company) && (
                            <p className="text-sm text-[var(--text-secondary)]">
                              {[sp.role, sp.company]
                                .filter(Boolean)
                                .join(" · ")}
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

                      {sp.topic && (
                        <p className="text-sm font-medium text-[var(--accent)]">
                          {sp.topic}
                        </p>
                      )}
                      {sp.description && (
                        <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
                          {sp.description}
                        </p>
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
            </TabsContent>
          )}
        </Tabs>
      </div>
    </MarketingShell>
  );
}
