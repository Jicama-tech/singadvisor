import type { ReactNode } from "react";

/**
 * Court and field markings for a placed Scheduled Space, so a Badminton Court
 * reads as a badminton court on the venue plan instead of a plain coloured
 * box.
 *
 * Ported from eventsh-v1's `lib/facilityCourtLines.tsx`, keeping its 0–100
 * coordinate grid and its translucent-white stroke so the same facility looks
 * the same in both products. The one change is how it is mounted: eventsh
 * overlays an absolutely-positioned `<svg>` on an HTML div, while both of this
 * app's venue renderers (the admin's VenueCanvas and the public EventVenueMap)
 * are a single `<svg>` — so the markings go in as a transformed `<g>` instead.
 *
 * A facility type with no markings defined (including "Other" and any custom
 * name) renders nothing: there is nothing sensible to draw for a name we do
 * not recognise.
 */

/** The facility types offered when creating a scheduled space. Same list, in
 * the same order, as eventsh's own SCHEDULED_SPACE_FACILITY_TYPES so an event
 * authored in either product means the same thing in the other. */
export const SCHEDULED_SPACE_FACILITY_TYPES = [
  "Tennis Court",
  "Cricket Ground",
  "Badminton Court",
  "Basketball Court",
  "Football Ground",
  "Volleyball Court",
  "Swimming Pool",
  "Chess Court",
  "Table Tennis Court",
  "Squash Court",
  "Other",
] as const;

const STROKE = "rgba(255,255,255,0.85)";
const SW = 1.6;

/** The markings themselves, on a 0–100 grid. */
export function renderFacilityCourtLines(facilityType: string): ReactNode {
  const stroke = STROKE;
  const sw = SW;
  switch (facilityType) {
    case "Tennis Court":
      return (
        <>
          <line x1={8} y1={0} x2={8} y2={100} stroke={stroke} strokeWidth={sw} />
          <line x1={92} y1={0} x2={92} y2={100} stroke={stroke} strokeWidth={sw} />
          <line x1={0} y1={50} x2={100} y2={50} stroke={stroke} strokeWidth={sw + 0.4} />
          <line x1={8} y1={25} x2={92} y2={25} stroke={stroke} strokeWidth={sw} />
          <line x1={8} y1={75} x2={92} y2={75} stroke={stroke} strokeWidth={sw} />
          <line x1={50} y1={25} x2={50} y2={75} stroke={stroke} strokeWidth={sw} />
        </>
      );
    case "Badminton Court":
      return (
        <>
          <line x1={5} y1={0} x2={5} y2={100} stroke={stroke} strokeWidth={sw} />
          <line x1={95} y1={0} x2={95} y2={100} stroke={stroke} strokeWidth={sw} />
          <line x1={0} y1={50} x2={100} y2={50} stroke={stroke} strokeWidth={sw + 0.4} />
          <line x1={5} y1={20} x2={95} y2={20} stroke={stroke} strokeWidth={sw} />
          <line x1={5} y1={80} x2={95} y2={80} stroke={stroke} strokeWidth={sw} />
          <line x1={50} y1={0} x2={50} y2={20} stroke={stroke} strokeWidth={sw} />
          <line x1={50} y1={80} x2={50} y2={100} stroke={stroke} strokeWidth={sw} />
        </>
      );
    case "Basketball Court":
      return (
        <>
          <line x1={0} y1={50} x2={100} y2={50} stroke={stroke} strokeWidth={sw} />
          <circle cx={50} cy={50} r={12} stroke={stroke} strokeWidth={sw} fill="none" />
          <rect x={35} y={0} width={30} height={19} stroke={stroke} strokeWidth={sw} fill="none" />
          <circle cx={50} cy={19} r={12} stroke={stroke} strokeWidth={sw} fill="none" />
          <rect x={35} y={81} width={30} height={19} stroke={stroke} strokeWidth={sw} fill="none" />
          <circle cx={50} cy={81} r={12} stroke={stroke} strokeWidth={sw} fill="none" />
        </>
      );
    case "Football Ground":
      return (
        <>
          <line x1={0} y1={50} x2={100} y2={50} stroke={stroke} strokeWidth={sw} />
          <circle cx={50} cy={50} r={10} stroke={stroke} strokeWidth={sw} fill="none" />
          <circle cx={50} cy={50} r={1.2} fill={stroke} />
          <rect x={20} y={0} width={60} height={15} stroke={stroke} strokeWidth={sw} fill="none" />
          <rect x={35} y={0} width={30} height={6} stroke={stroke} strokeWidth={sw} fill="none" />
          <rect x={20} y={85} width={60} height={15} stroke={stroke} strokeWidth={sw} fill="none" />
          <rect x={35} y={94} width={30} height={6} stroke={stroke} strokeWidth={sw} fill="none" />
        </>
      );
    case "Volleyball Court":
      return (
        <>
          <line x1={0} y1={50} x2={100} y2={50} stroke={stroke} strokeWidth={sw + 0.6} />
          <line x1={0} y1={33} x2={100} y2={33} stroke={stroke} strokeWidth={sw} />
          <line x1={0} y1={67} x2={100} y2={67} stroke={stroke} strokeWidth={sw} />
        </>
      );
    case "Swimming Pool":
      return (
        <>
          {[16.6, 33.3, 50, 66.6, 83.3].map((x) => (
            <line
              key={x}
              x1={x}
              y1={2}
              x2={x}
              y2={98}
              stroke={stroke}
              strokeWidth={sw}
              strokeDasharray="4 3"
            />
          ))}
        </>
      );
    case "Table Tennis Court":
      return (
        <>
          <line x1={0} y1={50} x2={100} y2={50} stroke={stroke} strokeWidth={sw + 0.8} />
          <line x1={50} y1={0} x2={50} y2={100} stroke={stroke} strokeWidth={sw * 0.7} />
        </>
      );
    case "Squash Court":
      return (
        <>
          <line x1={0} y1={90} x2={100} y2={90} stroke={stroke} strokeWidth={sw} />
          <line x1={0} y1={50} x2={100} y2={50} stroke={stroke} strokeWidth={sw} />
          <rect x={10} y={50} width={25} height={16} stroke={stroke} strokeWidth={sw} fill="none" />
          <rect x={65} y={50} width={25} height={16} stroke={stroke} strokeWidth={sw} fill="none" />
        </>
      );
    case "Cricket Ground":
      return (
        <>
          <rect x={42} y={8} width={16} height={84} stroke={stroke} strokeWidth={sw} fill="none" />
          <line x1={42} y1={16} x2={58} y2={16} stroke={stroke} strokeWidth={sw} />
          <line x1={42} y1={84} x2={58} y2={84} stroke={stroke} strokeWidth={sw} />
        </>
      );
    case "Chess Court":
      return (
        <>
          {Array.from({ length: 4 }).flatMap((_, row) =>
            Array.from({ length: 4 }).map((_, col) =>
              (row + col) % 2 === 0 ? (
                <rect
                  key={`${row}-${col}`}
                  x={col * 25}
                  y={row * 25}
                  width={25}
                  height={25}
                  fill="rgba(255,255,255,0.25)"
                />
              ) : null,
            ),
          )}
        </>
      );
    default:
      return null;
  }
}

/**
 * Drops the markings onto a placed item already drawn on an `<svg>` canvas.
 *
 * The 0–100 grid is stretched onto the item's real box with a transform, so
 * the markings resize with it — the same behaviour eventsh gets from
 * `preserveAspectRatio="none"`, including strokes thickening with the box.
 *
 * `pointerEvents="none"` matters on the admin canvas: without it the markings
 * would swallow the mousedown that drags the space around.
 */
export function FacilityCourtLines({
  facilityType,
  x,
  y,
  width,
  height,
  isCircle,
  idSeed,
}: {
  facilityType: string;
  x: number;
  y: number;
  width: number;
  height: number;
  isCircle: boolean;
  /** Unique per placed instance — becomes the clipPath id, so two facilities
   * on the same plan never clip each other. */
  idSeed: string;
}) {
  const lines = renderFacilityCourtLines(facilityType);
  if (!lines || width <= 0 || height <= 0) return null;

  const clipId = `facility-clip-${idSeed}`;
  return (
    <g pointerEvents="none">
      {isCircle && (
        <defs>
          <clipPath id={clipId} clipPathUnits="objectBoundingBox">
            <circle cx={0.5} cy={0.5} r={0.5} />
          </clipPath>
        </defs>
      )}
      <g
        transform={`translate(${x} ${y}) scale(${width / 100} ${height / 100})`}
        clipPath={isCircle ? `url(#${clipId})` : undefined}
      >
        {lines}
      </g>
    </g>
  );
}
