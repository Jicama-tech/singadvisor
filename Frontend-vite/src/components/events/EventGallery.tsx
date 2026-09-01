import { useEffect, useState } from "react";
import { AppImage as Image } from "@/components/ui/AppImage";
import { Icon } from "@/components/ui/Icon";
import { withEventshUrl } from "@/lib/media-url";

/**
 * Event Gallery carousel — the piece eventsh-v1's Eventfront has (its
 * `eventFront.tsx` "Event Gallery" section) that this app's public event page
 * was missing entirely: `EventRow.gallery` has been read off the wire by the
 * adapter since Phase 4, but nothing ever rendered it.
 *
 * Behaviour matched to eventsh-v1 deliberately: a fixed, screen-relative
 * frame height so the frame never collapses while an image loads, the image
 * sized with `object-contain` so the WHOLE upload is visible (organizers
 * upload posters and portrait shots, not cover crops), prev/next chevrons and
 * a thumbnail strip once there is more than one image, and a 4s auto-advance
 * whose timer restarts on every manual change so a click always gets a full
 * interval before the next slide.
 */
export function EventGallery({ gallery }: { gallery: string[] }) {
  const [index, setIndex] = useState(0);

  // Restarting on `index` (not just on length) is what gives a manual
  // click its full interval — see the component doc comment.
  useEffect(() => {
    if (gallery.length <= 1) return;
    const timer = setInterval(() => {
      setIndex((prev) => (prev === gallery.length - 1 ? 0 : prev + 1));
    }, 4000);
    return () => clearInterval(timer);
  }, [gallery.length, index]);

  if (gallery.length === 0) return null;

  // An event edited down to fewer images while this page is open would
  // otherwise index past the end and render a blank frame.
  const safeIndex = Math.min(index, gallery.length - 1);
  const prev = () => setIndex((i) => (i === 0 ? gallery.length - 1 : i - 1));
  const next = () => setIndex((i) => (i === gallery.length - 1 ? 0 : i + 1));

  return (
    <section>
      <h2 className="text-2xl">Event gallery</h2>
      <div
        className="relative mt-5 flex items-center justify-center overflow-hidden rounded-[var(--radius-card)] surface-sunken"
        style={{ height: "clamp(220px, 60vw, 460px)" }}
      >
        <Image
          key={safeIndex}
          src={withEventshUrl(gallery[safeIndex])}
          alt={`Gallery image ${safeIndex + 1} of ${gallery.length}`}
          className="h-full w-full object-contain"
        />
        {gallery.length > 1 && (
          <>
            <button
              type="button"
              onClick={prev}
              aria-label="Previous image"
              className="absolute left-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-[var(--surface-raised)]/90 text-[var(--text-primary)] shadow-[var(--shadow-soft)] transition-colors hover:bg-[var(--surface-raised)]"
            >
              <Icon name="chevron-left" size={16} />
            </button>
            <button
              type="button"
              onClick={next}
              aria-label="Next image"
              className="absolute right-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-[var(--surface-raised)]/90 text-[var(--text-primary)] shadow-[var(--shadow-soft)] transition-colors hover:bg-[var(--surface-raised)]"
            >
              <Icon name="chevron-right" size={16} />
            </button>
          </>
        )}
      </div>

      {gallery.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {gallery.map((img, i) => (
            <button
              key={`${img}-${i}`}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Show image ${i + 1}`}
              aria-current={i === safeIndex}
              className="shrink-0 overflow-hidden rounded-[var(--radius-card)] border-2 transition-all"
              style={{
                borderColor: i === safeIndex ? "var(--accent)" : "transparent",
                opacity: i === safeIndex ? 1 : 0.55,
              }}
            >
              <Image
                src={withEventshUrl(img)}
                alt=""
                className="h-16 w-20 object-cover sm:h-20 sm:w-24"
              />
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
