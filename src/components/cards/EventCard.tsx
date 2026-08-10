import { AppImage as Image } from "@/components/ui/AppImage";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Card, CardBody } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import {
  formatDate,
  formatPrice,
  formatTimeRange,
  isUpcoming,
  parseList,
} from "@/lib/utils";

export type EventCardData = {
  slug: string;
  title: string;
  summary: string;
  image: string;
  venue: string;
  startsAt: Date;
  endsAt: Date;
  speakers: string;
  priceCents: number;
  currency: string;
};

export function EventCard({ event }: { event: EventCardData }) {
  const upcoming = isUpcoming(event.startsAt);
  const speakers = parseList(event.speakers);
  const start = new Date(event.startsAt);

  return (
    <Card interactive>
      <div className="relative aspect-[16/9] overflow-hidden surface-sunken">
        <Image
          src={event.image}
          alt=""
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover transition-transform duration-500 hover:scale-105"
        />
        {/* Date chip reads at a glance without parsing the copy. */}
        <div className="absolute left-3 top-3 flex flex-col items-center rounded-xl bg-[var(--surface)]/95 px-3 py-2 shadow-[var(--shadow-soft)] backdrop-blur">
          <span className="text-lg font-bold leading-none text-[var(--text-primary)]">
            {start.getDate()}
          </span>
          <span className="mt-0.5 text-[0.65rem] font-semibold uppercase tracking-wider text-[var(--accent)]">
            {start.toLocaleString("en-SG", { month: "short" })}
          </span>
        </div>
        <div className="absolute right-3 top-3">
          <Badge tone={upcoming ? "success" : "neutral"}>
            {upcoming ? "Upcoming" : "Past event"}
          </Badge>
        </div>
      </div>

      <CardBody>
        <h3 className="text-lg leading-snug">
          <Link href={`/events/${event.slug}`} className="after:absolute after:inset-0">
            {event.title}
          </Link>
        </h3>
        <p className="line-clamp-2 text-sm leading-relaxed text-[var(--text-secondary)]">
          {event.summary}
        </p>

        <dl className="flex flex-col gap-1.5 pt-1 text-xs text-[var(--text-muted)]">
          <div className="flex items-center gap-1.5">
            <dt className="sr-only">Date and time</dt>
            <Icon name="calendar" size={14} />
            <dd>
              {formatDate(event.startsAt)} ·{" "}
              {formatTimeRange(event.startsAt, event.endsAt)}
            </dd>
          </div>
          <div className="flex items-center gap-1.5">
            <dt className="sr-only">Venue</dt>
            <Icon name="map-pin" size={14} />
            <dd className="truncate">{event.venue}</dd>
          </div>
          {speakers.length > 0 && (
            <div className="flex items-center gap-1.5">
              <dt className="sr-only">Speakers</dt>
              <Icon name="users" size={14} />
              <dd className="truncate">{speakers.join(", ")}</dd>
            </div>
          )}
        </dl>

        <div className="mt-auto pt-3 text-sm font-semibold text-[var(--text-primary)]">
          {formatPrice(event.priceCents, event.currency)}
        </div>
      </CardBody>
    </Card>
  );
}
