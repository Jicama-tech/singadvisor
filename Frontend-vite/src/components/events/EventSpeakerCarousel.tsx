import { useRef } from "react";
import { AppImage as Image } from "@/components/ui/AppImage";
import { Icon } from "@/components/ui/Icon";
import type { SpeakerProfile } from "@/lib/events-client";
import { withEventshUrl } from "@/lib/media-url";

/**
 * Speakers as a horizontal card row, matching eventsh-v1's eventfront.
 *
 * The Prev/Next buttons are not decoration: eventsh added them because native
 * touch-swipe works on a real phone but leaves no affordance that more cards
 * exist, and gives a mouse-driven desktop no way to advance at all. Same
 * reasoning applies here, so the same control is kept.
 *
 * This is the summary row; the full profiles (bio, session times, socials)
 * live in the Speakers tab further down, exactly as eventsh splits them.
 */
const CARD_STEP = 272; // w-64 (256px) + gap-4 (16px)

export function EventSpeakerCarousel({ speakers }: { speakers: SpeakerProfile[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  if (speakers.length === 0) return null;

  const scrollBy = (direction: -1 | 1) =>
    scrollRef.current?.scrollBy({ left: direction * CARD_STEP, behavior: "smooth" });

  return (
    <section>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-2xl">Speakers</h2>
        {speakers.length > 1 && (
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => scrollBy(-1)}
              aria-label="Previous speakers"
              className="grid h-9 w-9 place-items-center rounded-full border border-[var(--border-strong)] text-[var(--text-secondary)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
            >
              <Icon name="chevron-left" size={16} />
            </button>
            <button
              type="button"
              onClick={() => scrollBy(1)}
              aria-label="Next speakers"
              className="grid h-9 w-9 place-items-center rounded-full border border-[var(--border-strong)] text-[var(--text-secondary)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
            >
              <Icon name="chevron-right" size={16} />
            </button>
          </div>
        )}
      </div>

      <div
        ref={scrollRef}
        className="mt-5 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 [&::-webkit-scrollbar]:hidden"
      >
        {speakers.map((sp) => (
          <div
            key={sp.id || sp.name}
            className="flex w-64 shrink-0 snap-start flex-col gap-3 rounded-[var(--radius-card)] surface-sunken p-5"
          >
            {sp.photo ? (
              <Image
                src={withEventshUrl(sp.photo)}
                alt=""
                className="h-20 w-20 rounded-full object-cover"
              />
            ) : (
              <span className="grid h-20 w-20 place-items-center rounded-full bg-[var(--accent)] text-lg font-semibold text-[var(--accent-foreground)]">
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
            </div>
            {sp.topic && (
              <p className="text-sm font-medium text-[var(--accent)]">{sp.topic}</p>
            )}
            {(sp.startTime || sp.endTime) && (
              <p className="mt-auto flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
                <Icon name="clock" size={13} />
                {sp.startTime}
                {sp.startTime && sp.endTime && " – "}
                {sp.endTime}
              </p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
