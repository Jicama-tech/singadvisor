import { AppImage as Image } from "@/components/ui/AppImage";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/Badge";
import { Card, CardBody } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { formatDuration, formatPrice } from "@/lib/utils";

export type TrainingCardData = {
  slug: string;
  title: string;
  summary: string;
  image: string;
  category: string;
  durationHrs: number;
  format: string;
  priceCents: number;
  currency: string;
};

export function TrainingCard({ training }: { training: TrainingCardData }) {
  return (
    <Card interactive>
      <div className="relative aspect-[16/10] overflow-hidden surface-sunken">
        <Image
          src={training.image}
          alt=""
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover transition-transform duration-500 hover:scale-105"
        />
        <div className="absolute left-3 top-3">
          <Badge tone="accent">{training.category}</Badge>
        </div>
      </div>

      <CardBody>
        <h3 className="text-lg leading-snug">
          {/* Stretched link keeps the whole card clickable without nesting
              interactive elements. */}
          <Link to={`/trainings/${training.slug}`} className="after:absolute after:inset-0">
            {training.title}
          </Link>
        </h3>
        <p className="line-clamp-3 text-sm leading-relaxed text-[var(--text-secondary)]">
          {training.summary}
        </p>

        <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-2 pt-3 text-xs text-[var(--text-muted)]">
          <span className="flex items-center gap-1.5">
            <Icon name="clock" size={14} />
            {formatDuration(training.durationHrs)}
          </span>
          <span className="flex items-center gap-1.5">
            <Icon name="map-pin" size={14} />
            {training.format}
          </span>
          <span className="ml-auto text-sm font-semibold text-[var(--text-primary)]">
            {formatPrice(training.priceCents, training.currency)}
          </span>
        </div>
      </CardBody>
    </Card>
  );
}
