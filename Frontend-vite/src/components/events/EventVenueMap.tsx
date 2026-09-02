import type { EventRow, VenueAnnotation } from "@/lib/events-client";
import { formatPrice } from "@/lib/utils";
import { FacilityCourtLines } from "@/lib/facility-court-lines";

/**
 * Read-only public rendering of the Space Layout an organizer built in the
 * admin (components/admin/VenueCanvas.tsx) — eventsh-v1's Eventfront shows the
 * same plan to visitors, this app showed nothing at all.
 *
 * Deliberately NOT a reuse of VenueCanvas: that component is an *editor*
 * (drag/resize state, a CAD toolbar, a react-konva annotation Stage, a PDF
 * exporter). A visitor needs none of it, and pulling konva into the public
 * bundle for a static picture would be the wrong trade. The shapes, colours
 * and label placement below mirror VenueCanvas's own SVG so the published plan
 * looks like what the organizer laid out.
 *
 * Annotation coordinates are already in venue units (VenueAnnotationLayer
 * divides pointer positions by its display scale before storing), so they drop
 * straight into this viewBox with no conversion.
 *
 * Rotation is intentionally NOT applied as an SVG transform: this app's own
 * editor implements "rotate 90 degrees" by swapping width/height, so the
 * stored geometry already reflects the rotation and transforming again would
 * double it.
 */

const MAIN_STAGE_COLOR = "#334155";
/** VenueAnnotationLayer's own default — dimension labels are metres. */
const METERS_PER_UNIT = 0.1;
/** Matches VenueCanvas's SEAT_SIZE — seats are a fixed size there, so the wire
 * shape carries no per-seat dimensions to read. */
const SEAT_SIZE = 26;

type Shape = {
  key: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  isCircle: boolean;
  color: string;
  fontSize: number;
  /** Scheduled spaces only — drives the court markings drawn on the shape. */
  facilityType?: string;
};

/** One legend row — a space type a visitor can actually book, with its price. */
type LegendEntry = { name: string; color: string; price: number; unit?: string };

function placedShapes(event: EventRow): Shape[] {
  return [
    ...event.venueTables.map((t) => ({
      key: `table-${t.positionId}`,
      label: t.tableName || t.name,
      x: t.x,
      y: t.y,
      width: t.width,
      height: t.height,
      isCircle: false,
      color: "#6366f1",
      fontSize: 12,
    })),
    ...event.venueRoundTables.map((t) => ({
      key: `round-${t.positionId}`,
      label: t.name,
      x: t.x,
      y: t.y,
      width: t.tableDiameter || 150,
      height: t.tableDiameter || 150,
      isCircle: true,
      color: t.color || "#4f46e5",
      fontSize: 12,
    })),
    ...event.venueScheduledSpaces.map((s) => ({
      key: `sched-${s.positionId}`,
      label: s.name,
      x: s.x,
      y: s.y,
      width: s.shape === "Circle" ? s.diameter || 150 : s.width || 200,
      height: s.shape === "Circle" ? s.diameter || 150 : s.height || 100,
      isCircle: s.shape === "Circle",
      color: s.color || "#0ea5e9",
      fontSize: 12,
      facilityType: s.facilityType,
    })),
    ...event.venueSpeakerZones.map((z) => ({
      key: `zone-${z.positionId}`,
      label: z.name,
      x: z.x,
      y: z.y,
      width: z.width || 150,
      height: z.height || 100,
      isCircle: false,
      color: "#f59e0b",
      fontSize: 12,
    })),
    ...event.venueSeats.map((s) => ({
      key: `seat-${s.id}`,
      label: String(s.seatNumber ?? ""),
      x: s.x,
      y: s.y,
      width: SEAT_SIZE,
      height: SEAT_SIZE,
      isCircle: false,
      color:
        s.color ||
        event.seatRowTemplates.find((r) => r.id === s.rowId)?.color ||
        "#8b5cf6",
      fontSize: 10,
    })),
  ];
}

/** Prices for the *types* actually placed on the plan, deduped by name — many
 * identical stalls collapse to one swatch, same as eventsh-v1's own legend.
 * Round tables the organizer marked not-for-sale are reference furniture, not
 * something to advertise a price for, so they are skipped. */
function legendEntries(
  event: EventRow,
  inCrop: (x: number, y: number) => boolean,
): LegendEntry[] {
  const entries = new Map<string, LegendEntry>();
  const add = (e: LegendEntry) => {
    if (!entries.has(e.name)) entries.set(e.name, e);
  };
  for (const t of event.venueTables) {
    if (!inCrop(t.x, t.y)) continue;
    const tpl = event.tableTemplates.find((x) => x.id === t.id);
    add({
      name: tpl?.name || t.name || "Space",
      color: "#6366f1",
      price: t.tablePrice ?? tpl?.tablePrice ?? 0,
    });
  }
  for (const rt of event.venueRoundTables) {
    if (rt.forSale === false) continue;
    if (!inCrop(rt.x, rt.y)) continue;
    const perChair = rt.sellingMode === "chair";
    add({
      name: rt.category || rt.name || "Round table",
      color: rt.color || "#4f46e5",
      price: perChair ? rt.chairPrice : rt.tablePrice,
      unit: perChair ? "per seat" : undefined,
    });
  }
  for (const s of event.venueScheduledSpaces) {
    if (!inCrop(s.x, s.y)) continue;
    add({
      name: s.name || s.facilityType || "Scheduled space",
      color: s.color || "#0ea5e9",
      price: s.price ?? 0,
    });
  }
  return [...entries.values()];
}

export function EventVenueMap({ event }: { event: EventRow }) {
  const shapes = placedShapes(event);
  if (shapes.length === 0) return null;

  // This app has one layout per event (see EventForm's `firstVenueConfig`) —
  // eventsh's multi-layout selector has no equivalent here.
  const config = event.venueConfig[0];
  const width = config?.width || 800;
  const height = config?.height || 500;
  const gridSize = config?.gridSize || 50;
  const showGrid = config?.showGrid ?? true;

  // The published window onto the plan. eventsh anchors its crop at the
  // origin — a width and height, no x/y — and hides anything placed outside
  // it, so a layout drawn on a big canvas can be published tight to its
  // contents. Same rule here: `x < cropWidth && y < cropHeight`.
  const cropActive =
    Boolean(config?.cropped) && (config?.cropWidth ?? 0) > 0 && (config?.cropHeight ?? 0) > 0;
  const viewWidth = cropActive ? Math.min(config!.cropWidth!, width) : width;
  const viewHeight = cropActive ? Math.min(config!.cropHeight!, height) : height;
  const inCrop = (x: number, y: number) => !cropActive || (x < viewWidth && y < viewHeight);

  const gridLines: { x1: number; y1: number; x2: number; y2: number }[] = [];
  if (showGrid && gridSize > 0) {
    for (let x = gridSize; x < viewWidth; x += gridSize) {
      gridLines.push({ x1: x, y1: 0, x2: x, y2: viewHeight });
    }
    for (let y = gridSize; y < viewHeight; y += gridSize) {
      gridLines.push({ x1: 0, y1: y, x2: viewWidth, y2: y });
    }
  }

  // Only price what is actually on the published plan — a stall cropped out
  // of view should not still advertise a price beneath it. The predicate is
  // passed down rather than matching on rendered labels, which are not the
  // same strings as the template names the legend is keyed on.
  const legend = event.showSpacePricesOnEventfront ? legendEntries(event, inCrop) : [];

  return (
    <section>
      <h2 className="text-2xl">Venue layout</h2>
      <p className="mt-2 text-sm text-[var(--text-secondary)]">
        How the floor is laid out for this event.
      </p>

      {/* Horizontal scroll container so a wide plan never forces the page
          itself to scroll sideways on a phone. */}
      <div className="mt-5 overflow-x-auto">
        <svg
          viewBox={`0 0 ${viewWidth} ${viewHeight}`}
          role="img"
          aria-label={`Venue layout for ${event.title}`}
          className="block w-full min-w-[520px] rounded-[var(--radius-card)] border border-[var(--border-strong)] surface-sunken"
          style={{ aspectRatio: `${viewWidth} / ${viewHeight}` }}
        >
          {gridLines.map((l, i) => (
            <line
              key={i}
              x1={l.x1}
              y1={l.y1}
              x2={l.x2}
              y2={l.y2}
              stroke="var(--border-subtle)"
              strokeWidth={1}
            />
          ))}

          {config?.hasMainStage && (
            <g>
              <rect
                x={config.mainStageX ?? 0}
                y={config.mainStageY ?? 0}
                width={config.mainStageWidth ?? 200}
                height={config.mainStageHeight ?? 80}
                rx={4}
                fill={MAIN_STAGE_COLOR}
                fillOpacity={0.85}
              />
              <text
                x={(config.mainStageX ?? 0) + (config.mainStageWidth ?? 200) / 2}
                y={(config.mainStageY ?? 0) + (config.mainStageHeight ?? 80) / 2}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={14}
                fill="#fff"
              >
                {config.mainStageLabel || "Main stage"}
              </text>
            </g>
          )}

          {shapes.filter((s) => inCrop(s.x, s.y)).map((s) => (
            <g key={s.key}>
              {s.isCircle ? (
                <circle
                  cx={s.x + s.width / 2}
                  cy={s.y + s.height / 2}
                  r={s.width / 2}
                  fill={s.color}
                  fillOpacity={0.75}
                  stroke="#00000033"
                  strokeWidth={1}
                />
              ) : (
                <rect
                  x={s.x}
                  y={s.y}
                  width={s.width}
                  height={s.height}
                  rx={4}
                  fill={s.color}
                  fillOpacity={0.75}
                  stroke="#00000033"
                  strokeWidth={1}
                />
              )}
              {/* Court/field markings — the same shapes eventsh draws, so a
                  Badminton Court looks like one on both products' plans. */}
              {s.facilityType && (
                <FacilityCourtLines
                  facilityType={s.facilityType}
                  x={s.x}
                  y={s.y}
                  width={s.width}
                  height={s.height}
                  isCircle={s.isCircle}
                  idSeed={s.key}
                />
              )}
              <text
                x={s.x + s.width / 2}
                y={s.y + s.height / 2}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={s.fontSize}
                fill="#111"
              >
                {s.label}
              </text>
            </g>
          ))}

          {event.venueAnnotations.map((a) => (
            <Annotation key={a.id} annotation={a} />
          ))}
        </svg>
      </div>

      {legend.length > 0 && (
        <ul className="mt-4 flex flex-wrap gap-2">
          {legend.map((e) => (
            <li
              key={e.name}
              className="flex items-center gap-2 rounded-full surface-sunken px-3 py-1.5 text-xs"
            >
              <span
                className="h-3 w-3 shrink-0 rounded-full"
                style={{ backgroundColor: e.color }}
              />
              <span className="font-medium text-[var(--text-primary)]">{e.name}</span>
              <span className="text-[var(--text-secondary)]">
                {formatPrice(Math.round(e.price * 100), event.currency)}
                {e.unit ? ` ${e.unit}` : ""}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** SVG equivalent of one VenueAnnotationLayer shape (that layer draws with
 * react-konva, which the public page deliberately does not load). */
function Annotation({ annotation: a }: { annotation: VenueAnnotation }) {
  const stroke = a.color || "#1e293b";
  const strokeWidth = a.strokeWidth ?? 2;

  if (a.type === "rect") {
    return (
      <rect
        x={a.x}
        y={a.y}
        width={a.width}
        height={a.height}
        rx={2}
        fill={a.fill || "transparent"}
        stroke={stroke}
        strokeWidth={strokeWidth}
      />
    );
  }

  if (a.type === "text") {
    return (
      // Konva's Text draws from the top-left of its box; SVG text sits on a
      // baseline, so hang it to match where the organizer placed it.
      <text
        x={a.x}
        y={a.y}
        fontSize={a.fontSize ?? 16}
        fontWeight="bold"
        fill={stroke}
        dominantBaseline="hanging"
      >
        {a.text}
      </text>
    );
  }

  const [x1, y1, x2, y2] = a.points ?? [0, 0, 0, 0];
  const isDimension = a.type === "dimension";
  const isArrow = a.type === "arrow";
  const length = Math.hypot(x2 - x1, y2 - y1);
  // Arrowheads are drawn explicitly rather than with a <marker> so the head
  // size matches the konva original's pointerLength/pointerWidth exactly.
  const headSize = isArrow ? 12 : 8;

  return (
    <g>
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      {(isArrow || isDimension) && (
        <ArrowHead x={x2} y={y2} fromX={x1} fromY={y1} size={headSize} fill={stroke} />
      )}
      {isDimension && (
        <ArrowHead x={x1} y={y1} fromX={x2} fromY={y2} size={headSize} fill={stroke} />
      )}
      {isDimension && (
        <text
          x={(x1 + x2) / 2}
          y={(y1 + y2) / 2 - 6}
          textAnchor="middle"
          fontSize={12}
          fontWeight="bold"
          fill={stroke}
        >
          {(length * METERS_PER_UNIT).toFixed(2)} m
        </text>
      )}
    </g>
  );
}

function ArrowHead({
  x,
  y,
  fromX,
  fromY,
  size,
  fill,
}: {
  x: number;
  y: number;
  fromX: number;
  fromY: number;
  size: number;
  fill: string;
}) {
  const angle = (Math.atan2(y - fromY, x - fromX) * 180) / Math.PI;
  return (
    <polygon
      points={`0,0 ${-size},${-size / 2} ${-size},${size / 2}`}
      fill={fill}
      transform={`translate(${x} ${y}) rotate(${angle})`}
    />
  );
}
