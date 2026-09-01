import type { EventRow } from "@/lib/events-client";
import { AppImage as Image } from "@/components/ui/AppImage";
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
      {/* Two copies, each carrying its OWN trailing gap as padding rather than
          a flex `gap` between them: the keyframes slide by exactly -50%, which
          only lands on a pixel-identical frame when the repeated unit includes
          its spacing. A shared flex gap puts the seam mid-gap and the loop
          visibly jumps. */}
      <div className="flex w-max animate-[marquee_20s_linear_infinite] whitespace-nowrap text-sm font-medium">
        <span className="pr-16">{adBar.message}</span>
        <span className="pr-16" aria-hidden="true">
          {adBar.message}
        </span>
      </div>
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
      <div className="container-page">
        <p className="text-xs uppercase tracking-wide text-[var(--text-muted)]">
          Our sponsors
        </p>
        <div className="mt-3 overflow-hidden">
          {/* Two identical strips, each with its own trailing gap — see the
              ad bar above for why the spacing has to live inside the repeated
              unit. The second is a decorative duplicate, hidden from
              assistive tech. */}
          <div className="flex w-max animate-[marquee_20s_linear_infinite] items-center">
            {[0, 1].map((copy) => (
              <div
                key={copy}
                className="flex items-center gap-12 pr-12"
                aria-hidden={copy === 1 ? true : undefined}
              >
                {logos.map((logo, i) => (
                  <span key={`${logo}-${i}`} className="flex h-12 items-center">
                    <Image
                      src={withEventshUrl(logo)}
                      alt={copy === 0 ? `Sponsor ${i + 1}` : ""}
                      className="h-full w-auto object-contain"
                    />
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
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
