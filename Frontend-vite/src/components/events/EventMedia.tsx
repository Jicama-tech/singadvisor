import type { EventRow } from "@/lib/events-client";
import { AppImage as Image } from "@/components/ui/AppImage";
import { Marquee } from "@/components/ui/Marquee";
import { withEventshUrl } from "@/lib/media-url";

/**
 * The three banner-adjacent media strips eventsh-v1's Eventfront shows and
 * this app's event page did not: the organizer's announcement bar, the sponsor
 * logo marquee, and the reel row. All three are already edited in the admin's
 * Media tab and already arrive on the wire — only the rendering was missing.
 */

/** Scrolling announcement strip above the banner — promo codes, early-bird
 * notices, last-minute updates. Colours come from the organizer, so both are
 * applied as inline styles with a sane fallback rather than tokens. */
export function EventAdBar({ adBar }: { adBar: EventRow["adBar"] }) {
  if (!adBar.visible || !adBar.message.trim()) return null;
  return (
    <div
      className="overflow-hidden py-2"
      style={{
        backgroundColor: adBar.bgColor || "var(--surface-inverse)",
        color: adBar.textColor || "var(--text-inverse)",
      }}
      role="status"
    >
      {/* One <Marquee>: it measures the message and repeats it enough times to
          fill the bar, so a short announcement flows continuously instead of
          scrolling once and leaving a screen of empty colour behind it. */}
      <Marquee ariaLabel="Announcement">
        <span className="whitespace-nowrap pr-16 text-sm font-medium">{adBar.message}</span>
      </Marquee>
    </div>
  );
}

/** Moving carousel of uploaded sponsor logos, shown below the event banner —
 * distinct from `sponsorTypes`, which are the sellable sponsorship tiers. */
export function EventSponsorBar({ event }: { event: EventRow }) {
  const logos = event.sponsors.filter(Boolean);
  if (!event.showSponsorBar || logos.length === 0) return null;

  return (
    <div className="border-y border-[var(--border-subtle)] surface-sunken py-4">
      {/* Only the label is held to the page's reading width. The marquee
          itself sits OUTSIDE container-page so it runs edge to edge — inside
          it, the logos were capped at the 80rem column and stopped well short
          of the screen on anything wide. */}
      <div className="container-page">
        <p className="text-xs uppercase tracking-wide text-[var(--text-muted)]">
          Our sponsors
        </p>
      </div>
      {/* Full-bleed (outside container-page) and continuous: the logos are
          repeated to fill the strip rather than padded out with blank space,
          so there is no dead stretch between passes. */}
      <Marquee className="mt-3" ariaLabel="Our sponsors">
        {logos.map((logo, i) => (
          <span key={`${logo}-${i}`} className="flex h-12 shrink-0 items-center pr-12">
            {/* Decorative: the strip repeats each logo several times to fill
                the width, so alt text here would be read out over and over.
                The region's own label carries the meaning. */}
            <Image
              src={withEventshUrl(logo)}
              alt=""
              className="h-full w-auto object-contain"
            />
          </span>
        ))}
      </Marquee>
    </div>
  );
}

/** Instagram reel / YouTube URL -> the embeddable player URL for it, or null
 * for anything neither platform recognises (organizers paste all sorts of
 * links; an un-embeddable one is skipped rather than rendered as a dead
 * frame). Instagram's `/p/`, `/reel/` and `/tv/` paths all embed through the
 * same `/p/<id>/embed/` route, which is what eventsh-v1 does too. */
function toEmbedSrc(url: string): string | null {
  const instagram = /instagram\.com\/(?:p|reel|reels|tv)\/([A-Za-z0-9_-]+)/.exec(url);
  if (instagram) return `https://www.instagram.com/p/${instagram[1]}/embed/`;

  const youtube =
    /(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/.exec(url);
  if (youtube) return `https://www.youtube.com/embed/${youtube[1]}`;

  return null;
}

export function EventReels({ reelLinks }: { reelLinks: string[] }) {
  const embeds = reelLinks
    .map((url) => ({ url, src: toEmbedSrc(url.trim()) }))
    .filter((e): e is { url: string; src: string } => Boolean(e.src));
  if (embeds.length === 0) return null;

  return (
    <section>
      <h2 className="text-2xl">Highlights</h2>
      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {embeds.map((e) => (
          <div
            key={e.url}
            className="overflow-hidden rounded-[var(--radius-card)] border border-[var(--border-subtle)] surface-sunken"
          >
            <iframe
              src={e.src}
              title={e.url}
              loading="lazy"
              allow="encrypted-media; picture-in-picture"
              allowFullScreen
              className="block h-[420px] w-full border-0"
            />
          </div>
        ))}
      </div>
    </section>
  );
}
