import type { ReactNode } from "react";
import { Icon, type IconName } from "@/components/ui/Icon";
import type { EventRow } from "@/lib/events-client";
import { formatDate, formatPrice, formatTimeRange } from "@/lib/utils";

/**
 * The row of at-a-glance cards directly under the hero — when, where, price,
 * how many seats are left.
 *
 * Ported in structure from eventsh-v1's eventfront, which opens with the same
 * four facts before any prose, so someone can decide whether the event is
 * relevant without reading. Styled with this app's tokens rather than
 * eventsh's hardcoded greys, so it keeps working in dark mode and matches the
 * rest of the site.
 */
function InfoCard({
  icon,
  label,
  children,
}: {
  icon: IconName;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 rounded-[var(--radius-card)] border border-[var(--border-subtle)] surface-raised p-4 shadow-[var(--shadow-soft)]">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent-on-soft)]">
        <Icon name={icon} size={18} />
      </span>
      <div className="min-w-0">
        <p className="text-xs uppercase tracking-wide text-[var(--text-muted)]">{label}</p>
        <div className="mt-0.5 text-sm font-medium text-[var(--text-primary)]">{children}</div>
      </div>
    </div>
  );
}

export function EventInfoCards({
  event,
  remaining,
  capacity,
  upcoming,
  sellsTickets,
  hasBookableSpaces,
}: {
  event: EventRow;
  remaining: number;
  capacity: number;
  upcoming: boolean;
  /** False when the event has no active ticket tiers — it may still be
   * bookable by space or slot, so nothing here may claim it is sold out. */
  sellsTickets: boolean;
  hasBookableSpaces: boolean;
}) {
  // "From" the cheapest active tier, not the first one — with several tiers
  // the first is rarely the one worth advertising.
  const activePrices = event.visitorTypes.filter((t) => t.isActive).map((t) => t.price);
  const from = activePrices.length > 0 ? Math.min(...activePrices) : 0;

  return (
    // The page wraps this in container-page; nesting a second one here
    // doubled the max-width and the horizontal padding.
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <InfoCard icon="calendar" label="When">
        {formatDate(event.startDate)}
        <span className="block text-xs font-normal text-[var(--text-secondary)]">
          {formatTimeRange(event.startDate, event.endDate)}
        </span>
      </InfoCard>

      <InfoCard icon="map-pin" label="Where">
        <span className="block truncate">{event.venue || "To be announced"}</span>
        {event.address && (
          <span className="block truncate text-xs font-normal text-[var(--text-secondary)]">
            {event.address}
          </span>
        )}
      </InfoCard>

      <InfoCard icon="sparkles" label="Admission">
        {sellsTickets
          ? `${activePrices.length > 1 ? "From " : ""}${formatPrice(Math.round(from * 100), event.currency)}`
          : hasBookableSpaces
            ? "Priced per space"
            : "Free entry"}
      </InfoCard>

      <InfoCard
        icon="users"
        label={!upcoming ? "Status" : sellsTickets ? "Availability" : "Entry"}
      >
        {!upcoming
          ? "Event has ended"
          : !sellsTickets
            ? hasBookableSpaces
              ? "Book a space below"
              : "Open to all"
            : remaining === 0
              ? "Fully booked"
              : `${remaining} of ${capacity} left`}
      </InfoCard>
    </div>
  );
}
