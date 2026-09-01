import type { ReactNode } from "react";
import type { EventRow } from "@/lib/events-client";
import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
import { formatDate, formatPrice } from "@/lib/utils";

/**
 * Everything an organizer can sell *floor space* for — what eventsh-v1 calls
 * stalls and this app's admin calls Spaces (EventForm's "Spaces", "Round
 * Tables", "Schedule" and Speakers tabs). All of it has been arriving on the
 * wire since Phase 8 and being written back by the admin, but the public event
 * page rendered none of it, so an organizer who set up stalls had nothing to
 * point a vendor at.
 *
 * Prices honour the organizer's `showSpacePricesOnEventfront` switch, matching
 * eventsh-v1's own gate on that same field — with it off, the space types are
 * still listed (a vendor needs to know what exists) but every price is
 * replaced by a "price on request" line.
 */

/** Shared card shell so the four different space kinds read as one set. */
function SpaceCard({
  name,
  meta,
  price,
  children,
}: {
  name: string;
  meta?: string;
  price?: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-[var(--radius-card)] surface-sunken p-5">
      <div className="flex items-baseline justify-between gap-3">
        <p className="font-medium text-[var(--text-primary)]">{name}</p>
        {price && (
          <p className="shrink-0 text-sm font-semibold text-[var(--accent)]">{price}</p>
        )}
      </div>
      {meta && <p className="text-sm text-[var(--text-secondary)]">{meta}</p>}
      {children}
    </div>
  );
}

export function EventSpaces({ event }: { event: EventRow }) {
  const showPrices = event.showSpacePricesOnEventfront;
  const money = (amount: number) =>
    showPrices ? formatPrice(Math.round(amount * 100), event.currency) : "Price on request";

  const spaces = event.tableTemplates;
  const roundTables = event.roundTableTemplates;
  const scheduled = event.scheduledSpaceTemplates;
  const speakerSlots = event.speakerSlotTemplates.filter((s) => s.openForApplications);

  if (
    spaces.length === 0 &&
    roundTables.length === 0 &&
    scheduled.length === 0 &&
    speakerSlots.length === 0
  ) {
    return null;
  }

  return (
    <section>
      <h2 className="text-2xl">Stalls &amp; spaces</h2>
      <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
        Space available to book at this event. Get in touch with the organizer to
        reserve one.
      </p>

      {spaces.length > 0 && (
        <div className="mt-5">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            Stalls
          </h3>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            {spaces.map((t) => (
              <SpaceCard
                key={t.id}
                name={t.name}
                meta={`${t.width} × ${t.height}`}
                price={money(t.tablePrice)}
              >
                {showPrices && (t.bookingPrice > 0 || t.depositPrice > 0) && (
                  <p className="text-xs text-[var(--text-muted)]">
                    {[
                      t.bookingPrice > 0 &&
                        `Booking fee ${formatPrice(Math.round(t.bookingPrice * 100), event.currency)}`,
                      t.depositPrice > 0 &&
                        `Deposit ${formatPrice(Math.round(t.depositPrice * 100), event.currency)}`,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                )}
              </SpaceCard>
            ))}
          </div>
        </div>
      )}

      {roundTables.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            Round tables
          </h3>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            {roundTables.map((rt) => {
              const perChair = rt.sellingMode === "chair";
              const base = perChair ? rt.chairPrice : rt.tablePrice;
              // Member pricing only reads as a discount when it is actually
              // lower — organizers sometimes leave the member field at 0/equal.
              const member = perChair ? rt.memberChairPrice : rt.memberTablePrice;
              const hasMemberPrice =
                showPrices && member != null && member > 0 && member !== base;
              return (
                <SpaceCard
                  key={rt.id}
                  name={rt.category || rt.name}
                  meta={`${rt.numberOfChairs} seats · sold ${perChair ? "by the seat" : "as a whole table"}`}
                  price={`${money(base)}${showPrices && perChair ? " / seat" : ""}`}
                >
                  {hasMemberPrice && (
                    <p className="text-xs text-[var(--text-muted)]">
                      Members {formatPrice(Math.round(member * 100), event.currency)}
                      {perChair ? " / seat" : ""}
                    </p>
                  )}
                  {/* Absent on legacy/eventsh-authored data — only an
                      explicit false means the organizer marked it unsellable. */}
                  {rt.forSale === false && (
                    <Badge tone="neutral">Not available to book</Badge>
                  )}
                </SpaceCard>
              );
            })}
          </div>
        </div>
      )}

      {scheduled.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            Bookable by time slot
          </h3>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            {scheduled.map((s) => (
              <SpaceCard
                key={s.id}
                name={s.name}
                meta={[s.facilityType, s.shape === "Circle" ? `⌀ ${s.diameter}` : `${s.width} × ${s.height}`]
                  .filter(Boolean)
                  .join(" · ")}
                price={money(s.price)}
              >
                {s.slots.length > 0 && (
                  <ul className="flex flex-col gap-1 pt-1">
                    {s.slots.map((slot) => (
                      <li
                        key={slot.id || `${slot.date}-${slot.startTime}`}
                        className="flex items-center gap-2 text-xs text-[var(--text-secondary)]"
                      >
                        <Icon name="clock" size={13} className="shrink-0 text-[var(--accent)]" />
                        <span>
                          {slot.label ? `${slot.label} — ` : ""}
                          {slot.date ? formatDate(slot.date) : ""}
                          {slot.startTime && ` ${slot.startTime}`}
                          {slot.endTime && `–${slot.endTime}`}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </SpaceCard>
            ))}
          </div>
        </div>
      )}

      {speakerSlots.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            Speaking slots open for applications
          </h3>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            {speakerSlots.map((slot) => (
              <SpaceCard
                key={slot.id}
                name={slot.name}
                meta={[
                  slot.startTime && `${slot.startTime}${slot.endTime ? `–${slot.endTime}` : ""}`,
                  slot.isMainStage && "Main stage",
                  slot.maxSpeakers > 0 && `${slot.maxSpeakers} speakers`,
                ]
                  .filter(Boolean)
                  .join(" · ")}
                price={slot.slotPrice > 0 ? money(slot.slotPrice) : undefined}
              >
                {slot.description && (
                  <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
                    {slot.description}
                  </p>
                )}
              </SpaceCard>
            ))}
          </div>
        </div>
      )}

      {event.maxSpacesPerVendor > 0 && spaces.length > 0 && (
        <p className="mt-4 text-xs text-[var(--text-muted)]">
          Up to {event.maxSpacesPerVendor} space
          {event.maxSpacesPerVendor === 1 ? "" : "s"} per vendor.
        </p>
      )}

      {event.termsAndConditionsforStalls.length > 0 && (
        <div className="mt-6 rounded-[var(--radius-card)] border border-[var(--border-subtle)] p-5">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
            Terms for stallholders
          </h3>
          <ul className="mt-3 flex flex-col gap-2">
            {event.termsAndConditionsforStalls.map((term, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                <Icon name="check" size={14} className="mt-1 shrink-0 text-[var(--accent)]" />
                <span>
                  {term.text}
                  {term.isMandatory && (
                    <span className="ml-2 text-xs font-medium text-[var(--text-muted)]">
                      (required)
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
