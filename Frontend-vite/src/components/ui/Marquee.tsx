import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";

/**
 * A strip that scrolls its content past continuously, edge to edge.
 *
 * The naive version — two copies of the content, slide the track by -50% —
 * only looks continuous when the content is already wider than the screen.
 * With a short announcement or two sponsor logos you got the content, then a
 * screen-width of nothing, then the content again: it read as stopping rather
 * than flowing.
 *
 * So the content is measured and repeated as many times as it takes to fill
 * the strip, and only then duplicated for the loop. The track is therefore
 * always at least twice the visible width, and the -50% translate lands on a
 * pixel-identical frame, so the seam is invisible.
 *
 * Speed is set from the measured width rather than a fixed duration: a long
 * sponsor row and a five-word announcement now travel at the same pace, where
 * a shared `20s` made one race and the other crawl.
 */
export function Marquee({
  children,
  /** Pixels per second. Slow enough to read, quick enough not to feel stuck. */
  speed = 55,
  className,
  ariaLabel,
}: {
  children: ReactNode;
  speed?: number;
  className?: string;
  ariaLabel?: string;
}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const unitRef = useRef<HTMLDivElement>(null);
  const [repeats, setRepeats] = useState(1);
  const [duration, setDuration] = useState(20);
  // Bumped when late-arriving images change the measured width.
  const [measureKey, setMeasureKey] = useState(0);

  // Layout effect so the measurement happens before paint — a visible reflow
  // from 1 copy to 6 is worse than a frame of stillness.
  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    const unit = unitRef.current;
    if (!viewport || !unit) return;

    const measure = () => {
      const visible = viewport.offsetWidth;
      // One copy's width. `repeats` copies are rendered, so divide back out.
      const unitWidth = unit.offsetWidth / Math.max(1, repeats);
      if (visible <= 0 || unitWidth <= 0) return;

      // Enough copies to cover the strip, plus one so nothing is ever short.
      const needed = Math.max(1, Math.ceil(visible / unitWidth) + 1);
      if (needed !== repeats) setRepeats(needed);

      // One cycle moves the track by exactly one group.
      setDuration(Math.max(6, (unitWidth * needed) / speed));
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [repeats, speed, children, measureKey]);

  // Images arrive after first paint and change the width — remeasure once they
  // have, or a logo strip sizes itself from empty boxes.
  useEffect(() => {
    const unit = unitRef.current;
    if (!unit) return;
    const images = Array.from(unit.querySelectorAll("img"));
    const pending = images.filter((img) => !img.complete);
    if (pending.length === 0) return;
    const bump = () => setMeasureKey((k) => k + 1);
    pending.forEach((img) => img.addEventListener("load", bump, { once: true }));
    return () => pending.forEach((img) => img.removeEventListener("load", bump));
  }, [children]);

  const copies = Array.from({ length: repeats });

  return (
    <div ref={viewportRef} className={className} aria-label={ariaLabel} role={ariaLabel ? "group" : undefined}>
      <div className="overflow-hidden">
        <div
          className="marquee-track flex w-max"
          style={{ animationDuration: `${duration}s` }}
        >
          {/* Two identical groups: the loop slides by exactly one of them. */}
          <div ref={unitRef} className="flex shrink-0">
            {copies.map((_, i) => (
              <div key={i} className="flex shrink-0">
                {children}
              </div>
            ))}
          </div>
          <div className="flex shrink-0" aria-hidden="true">
            {copies.map((_, i) => (
              <div key={i} className="flex shrink-0">
                {children}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
