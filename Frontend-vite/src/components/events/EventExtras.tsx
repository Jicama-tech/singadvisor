import type { EventRow } from "@/lib/events-client";
import { AppImage as Image } from "@/components/ui/AppImage";
import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
import { withEventshUrl } from "@/lib/media-url";
import { formatPrice } from "@/lib/utils";

/**
 * The two "extras" an organizer sells alongside a ticket — workshop sessions
 * (and the packages that bundle them) and add-on items. Both come off the wire
 * already (Phase 8) and are editable in the admin's Workshops / Spaces tabs;
 * neither was ever rendered on the public event page.
 */

export function EventWorkshops({ event }: { event: EventRow }) {
  // `order` is the organizer's own arrangement from the admin — respect it
  // rather than the arbitrary array order the API happens to return.
  const sessions = [...event.workshopSessions].sort((a, b) => a.order - b.order);
  const packages = [...event.workshopPackages].sort((a, b) => a.order - b.order);
  if (sessions.length === 0 && packages.length === 0) return null;

  const money = (amount: number) => formatPrice(Math.round(amount * 100), event.currency);

  return (
    <section>
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-2xl">Workshops</h2>
        {event.workshopHostingOpen && <Badge tone="accent">Hosting applications open</Badge>}
      </div>

      {sessions.length > 0 && (
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          {sessions.map((w) => (
            <div
              key={w.id}
              className="flex flex-col overflow-hidden rounded-[var(--radius-card)] surface-sunken"
            >
              {w.image && (
                <Image
                  src={withEventshUrl(w.image)}
                  alt=""
                  className="h-36 w-full object-cover"
                />
              )}
              <div className="flex flex-1 flex-col gap-2 p-5">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="font-medium text-[var(--text-primary)]">{w.name}</p>
                  <p className="shrink-0 text-sm font-semibold text-[var(--accent)]">
                    {money(w.price)}
                  </p>
                </div>
                {w.facilitator && (
                  <p className="text-sm text-[var(--text-secondary)]">with {w.facilitator}</p>
                )}
                {(w.startTime || w.endTime) && (
                  <p className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
                    <Icon name="clock" size={13} className="text-[var(--accent)]" />
                    {w.startTime}
                    {w.startTime && w.endTime && "–"}
                    {w.endTime}
                  </p>
                )}
                {w.description && (
                  <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
                    {w.description}
                  </p>
                )}
                {w.maxSeats > 0 && (
                  <p className="mt-auto pt-1 text-xs text-[var(--text-muted)]">
                    {w.maxSeats} seats
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {packages.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            Bundles
          </h3>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            {packages.map((p) => {
              const included = p.sessionIds
                .map((id) => sessions.find((s) => s.id === id)?.name)
                .filter(Boolean) as string[];
              return (
                <div
                  key={p.id}
                  className="flex flex-col gap-2 rounded-[var(--radius-card)] surface-sunken p-5"
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="font-medium text-[var(--text-primary)]">{p.name}</p>
                    <p className="shrink-0 text-sm font-semibold text-[var(--accent)]">
                      {money(p.price)}
                    </p>
                  </div>
                  {p.description && (
                    <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
                      {p.description}
                    </p>
                  )}
                  {included.length > 0 && (
                    <p className="text-xs text-[var(--text-muted)]">
                      Includes: {included.join(", ")}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}

export function EventAddOns({ event }: { event: EventRow }) {
  if (event.addOnItems.length === 0) return null;

  return (
    <section>
      <h2 className="text-2xl">Add-ons</h2>
      <p className="mt-2 text-sm text-[var(--text-secondary)]">
        Extras you can add to a stall or a booking.
      </p>
      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {event.addOnItems.map((item) => (
          <div
            key={item.id}
            className="flex flex-col overflow-hidden rounded-[var(--radius-card)] surface-sunken"
          >
            {item.addOnImage && (
              <Image
                src={withEventshUrl(item.addOnImage)}
                alt=""
                className="h-28 w-full object-cover"
              />
            )}
            <div className="flex flex-1 flex-col gap-1.5 p-4">
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-sm font-medium text-[var(--text-primary)]">{item.name}</p>
                <p className="shrink-0 text-sm font-semibold text-[var(--accent)]">
                  {formatPrice(Math.round(item.price * 100), event.currency)}
                </p>
              </div>
              {item.description && (
                <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
                  {item.description}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
