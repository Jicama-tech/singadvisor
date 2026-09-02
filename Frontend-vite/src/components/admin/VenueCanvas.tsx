
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Field, Input } from "@/components/ui/Field";
import VenueAnnotationLayer from "./VenueAnnotationLayer";
import { FacilityCourtLines } from "@/lib/facility-court-lines";
import type { AnnotationTool, VenueAnnotation } from "./VenueAnnotationLayer";

// react-konva's Stage touches Canvas/DOM APIs at mount time — the old
// next/dynamic + ssr:false wrapper existed purely because Next server-renders
// modules; a Vite SPA has no server phase, so this is a plain import now.

/**
 * Scoped port of eventsh-v1's VenueDesigner (CreateEventForm.tsx,
 * ~4,700 lines — the single largest piece of the whole event-form-parity
 * effort). Its core drag/select/resize logic is plain React + raw SVG/DOM
 * mouse events with zero external dependencies (confirmed by reading the
 * actual file before starting this port, not assumed) — genuinely portable.
 *
 * Deliberately NOT a 1:1 port. Built as a real, working MVP covering what
 * organizers actually need — place/drag/resize/rotate(90°)/remove each
 * template type on a venue plan — rather than eventsh's full feature set
 * (continuous-angle rotation, the "draw row" bulk seat tool, floor-plan
 * image import, measurement tools).
 *
 * Phase 8h adds the CAD annotation overlay (line/arrow/rect/text/dimension
 * draw tools, ported from eventsh's VenueAnnotationLayer.tsx as a
 * react-konva Stage layered over this SVG canvas) and a PDF export of the
 * finished layout.
 */

export type CanvasKind = "table" | "roundTable" | "scheduledSpace" | "speakerZone" | "seat";

export type CanvasTemplate = {
  templateId: string;
  kind: CanvasKind;
  name: string;
  width: number;
  height: number;
  isCircle: boolean;
  color: string;
  /** scheduledSpace-kind only: drives the court markings drawn on the item. */
  facilityType?: string;
};

export type PlacedItem = {
  positionId: string;
  templateId: string;
  kind: CanvasKind;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  isCircle: boolean;
  color: string;
  /** Seat-kind items only: the 1-based number within their seat row. */
  seatNumber?: number;
  /** scheduledSpace-kind only: drives the court markings drawn on the item. */
  facilityType?: string;
};

export type VenueConfigState = {
  width: number;
  height: number;
  gridSize: number;
  showGrid: boolean;
  /** Crop box, anchored at the origin — eventsh's own model, which has a
   * width and height but no x/y. With it on, the public venue plan shows only
   * this corner of the canvas and hides anything placed outside it, so a plan
   * drawn on a big canvas can be published tight to its contents. */
  cropped: boolean;
  cropWidth: number;
  cropHeight: number;
};

export type { AnnotationTool, VenueAnnotation } from "./VenueAnnotationLayer";

let placedCounter = 0;
const nextPlacedId = () => `pos-${Date.now()}-${++placedCounter}`;

/** Fixed size of an individually placed seat, matching eventsh's SEAT_SIZE. */
export const SEAT_SIZE = 26;

const KIND_LABEL: Record<CanvasKind, string> = {
  table: "Space",
  roundTable: "Round Table",
  scheduledSpace: "Scheduled Space",
  speakerZone: "Speaker Slot",
  seat: "Seat",
};

// eventsh's own CreateEventForm toolbar omits a "Text" button despite
// VenueAnnotationLayer fully supporting the "text" tool (click to place a
// label, opens an inline editor) — a pre-existing gap in its source, not
// intentional scope. Added here since the plan for this phase explicitly
// names text as one of the tools to port and the logic is already fully
// wired (verbatim-ported, not new).
const ANNOTATION_TOOLS: { t: AnnotationTool; label: string; icon: "move" | "pointer" | "minus" | "arrow-up-right" | "square" | "ruler" | "type" }[] = [
  { t: "none", label: "Move", icon: "move" },
  { t: "select", label: "Select", icon: "pointer" },
  { t: "text", label: "Text", icon: "type" },
  { t: "line", label: "Line", icon: "minus" },
  { t: "arrow", label: "Arrow", icon: "arrow-up-right" },
  { t: "rect", label: "Box", icon: "square" },
  { t: "dimension", label: "Dimension", icon: "ruler" },
];

export function VenueCanvas({
  venueConfig,
  onVenueConfigChange,
  templates,
  placedItems,
  onChange,
  annotations,
  onAnnotationsChange,
}: {
  venueConfig: VenueConfigState;
  onVenueConfigChange: (patch: Partial<VenueConfigState>) => void;
  templates: CanvasTemplate[];
  placedItems: PlacedItem[];
  onChange: (items: PlacedItem[]) => void;
  annotations: VenueAnnotation[];
  onAnnotationsChange: (next: VenueAnnotation[]) => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const dragState = useRef<{ id: string; offsetX: number; offsetY: number; mode: "move" | "resize" } | null>(null);
  // Dragging the crop handle is its own gesture: it moves nothing on the
  // canvas, it resizes the published window onto it.
  const cropDragging = useRef(false);

  // CAD annotation toolbar state (Phase 8h) — kept local to this component,
  // same as `selectedId` above for placed items, so EventForm.tsx only
  // needs to own the `annotations` data itself, not the tool/UI state.
  const [annotationTool, setAnnotationTool] = useState<AnnotationTool>("none");
  const [annotationColor, setAnnotationColor] = useState("#1e293b");
  const [selectedAnnId, setSelectedAnnId] = useState<string | null>(null);
  const [pdfBusy, setPdfBusy] = useState(false);

  // Screen-px size of the rendered SVG, tracked via ResizeObserver so the
  // Konva overlay stays pixel-aligned with the (responsive, fluid-width)
  // SVG canvas beneath it. Kept in sync with venueConfig's aspect ratio —
  // see the `aspect-ratio` style below, which guarantees no letterboxing
  // so a single uniform scale factor is always correct (no separate
  // scaleX/scaleY needed).
  const [overlay, setOverlay] = useState({ width: 0, height: 0, scale: 1 });

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && venueConfig.width > 0) {
        setOverlay({ width: rect.width, height: rect.height, scale: rect.width / venueConfig.width });
      }
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [venueConfig.width, venueConfig.height]);

  function svgPoint(clientX: number, clientY: number): { x: number; y: number } {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    const scaleX = venueConfig.width / rect.width;
    const scaleY = venueConfig.height / rect.height;
    return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
  }

  function addToCanvas(t: CanvasTemplate) {
    const isSeat = t.kind === "seat";
    // Seats are fixed-size; the seat number continues the row's count so a
    // row placed seat-by-seat numbers 1, 2, 3… (eventsh's placeSeatAt
    // convention). Palette clicks stack at the center — every seat is
    // immediately draggable into place.
    const seatNumber = isSeat
      ? placedItems.filter((p) => p.kind === "seat" && p.templateId === t.templateId).length + 1
      : undefined;
    const item: PlacedItem = {
      positionId: nextPlacedId(),
      templateId: t.templateId,
      kind: t.kind,
      name: t.name,
      x: Math.max(0, venueConfig.width / 2 - t.width / 2),
      y: Math.max(0, venueConfig.height / 2 - t.height / 2),
      width: t.width,
      height: t.height,
      rotation: 0,
      facilityType: t.facilityType,
      isCircle: t.isCircle,
      color: t.color,
      ...(seatNumber !== undefined ? { seatNumber } : {}),
    };
    onChange([...placedItems, item]);
    setSelectedId(item.positionId);
  }

  function removeFromCanvas(positionId: string) {
    onChange(placedItems.filter((p) => p.positionId !== positionId));
    if (selectedId === positionId) setSelectedId(null);
  }

  function rotate90(positionId: string) {
    onChange(
      placedItems.map((p) =>
        p.positionId === positionId
          ? { ...p, width: p.height, height: p.width, rotation: (p.rotation + 90) % 360 }
          : p,
      ),
    );
  }

  function startDrag(e: React.MouseEvent, item: PlacedItem, mode: "move" | "resize") {
    e.stopPropagation();
    setSelectedId(item.positionId);
    const pt = svgPoint(e.clientX, e.clientY);
    dragState.current = {
      id: item.positionId,
      offsetX: pt.x - item.x,
      offsetY: pt.y - item.y,
      mode,
    };
    window.addEventListener("mousemove", handleDragMove);
    window.addEventListener("mouseup", handleDragEnd);
  }

  function handleDragMove(e: MouseEvent) {
    const ds = dragState.current;
    if (!ds) return;
    const pt = svgPoint(e.clientX, e.clientY);
    onChange(
      placedItems.map((p) => {
        if (p.positionId !== ds.id) return p;
        if (ds.mode === "move") {
          const x = Math.min(Math.max(0, pt.x - ds.offsetX), venueConfig.width - p.width);
          const y = Math.min(Math.max(0, pt.y - ds.offsetY), venueConfig.height - p.height);
          return { ...p, x, y };
        }
        // resize: bottom-right corner follows the cursor.
        const width = Math.max(20, Math.min(pt.x - p.x, venueConfig.width - p.x));
        const height = Math.max(20, Math.min(pt.y - p.y, venueConfig.height - p.y));
        return { ...p, width, height };
      }),
    );
  }

  function handleDragEnd() {
    dragState.current = null;
    window.removeEventListener("mousemove", handleDragMove);
    window.removeEventListener("mouseup", handleDragEnd);
  }

  function startCropDrag(e: React.MouseEvent) {
    e.stopPropagation();
    cropDragging.current = true;
    window.addEventListener("mousemove", handleCropMove);
    window.addEventListener("mouseup", handleCropEnd);
  }

  function handleCropMove(e: MouseEvent) {
    if (!cropDragging.current) return;
    const pt = svgPoint(e.clientX, e.clientY);
    onVenueConfigChange({
      cropWidth: Math.round(Math.max(50, Math.min(pt.x, venueConfig.width))),
      cropHeight: Math.round(Math.max(50, Math.min(pt.y, venueConfig.height))),
    });
  }

  function handleCropEnd() {
    cropDragging.current = false;
    window.removeEventListener("mousemove", handleCropMove);
    window.removeEventListener("mouseup", handleCropEnd);
  }

  /** Shrinks the crop to the smallest box containing every placed item — the
   * common case, and far quicker than dragging to it by hand. */
  function cropToContents() {
    if (placedItems.length === 0) return;
    const right = Math.max(...placedItems.map((p) => p.x + p.width));
    const bottom = Math.max(...placedItems.map((p) => p.y + p.height));
    const PAD = 20;
    onVenueConfigChange({
      cropped: true,
      cropWidth: Math.round(Math.min(venueConfig.width, right + PAD)),
      cropHeight: Math.round(Math.min(venueConfig.height, bottom + PAD)),
    });
  }

  // Rasterise the canvas (placed items + annotations) and save it as a
  // PDF — mirrors eventsh's own `downloadVenuePdf`. Dynamic `import()`
  // here (not next/dynamic) since these are only needed inside a click
  // handler, never at render time.
  async function downloadVenuePdf() {
    const el = wrapRef.current;
    if (!el) return;
    setPdfBusy(true);
    try {
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);
      const canvas = await html2canvas(el, { backgroundColor: "#ffffff", scale: 2, useCORS: true });
      const img = canvas.toDataURL("image/png");
      const pxW = canvas.width;
      const pxH = canvas.height;
      const pdf = new jsPDF({ orientation: pxW >= pxH ? "landscape" : "portrait", unit: "pt", format: "a4" });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const margin = 28;
      const maxW = pageW - margin * 2;
      const maxH = pageH - margin * 2;
      const ratio = Math.min(maxW / pxW, maxH / pxH);
      const drawW = pxW * ratio;
      const drawH = pxH * ratio;
      const x = (pageW - drawW) / 2;
      const y = (pageH - drawH) / 2;
      pdf.addImage(img, "PNG", x, y, drawW, drawH);
      pdf.save("venue-layout.pdf");
    } catch {
      // Best-effort export — no form/canvas state to roll back on failure.
    } finally {
      setPdfBusy(false);
    }
  }

  const gridLines: { x1: number; y1: number; x2: number; y2: number }[] = [];
  if (venueConfig.showGrid && venueConfig.gridSize > 0) {
    for (let x = venueConfig.gridSize; x < venueConfig.width; x += venueConfig.gridSize) {
      gridLines.push({ x1: x, y1: 0, x2: x, y2: venueConfig.height });
    }
    for (let y = venueConfig.gridSize; y < venueConfig.height; y += venueConfig.gridSize) {
      gridLines.push({ x1: 0, y1: y, x2: venueConfig.width, y2: y });
    }
  }

  const selected = placedItems.find((p) => p.positionId === selectedId) || null;
  const unplacedTemplates = templates; // every defined template can be placed more than once (e.g. 4 identical booths)

  return (
    <div className="flex flex-col gap-4 lg:flex-row">
      <div className="flex flex-1 flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <Field label="Venue width (cm)" htmlFor="vc-width" className="max-w-36">
              <Input
                id="vc-width"
                type="number"
                min="100"
                value={venueConfig.width}
                onChange={(e) => onVenueConfigChange({ width: Math.max(100, Number(e.target.value) || 0) })}
              />
            </Field>
            <Field label="Venue height (cm)" htmlFor="vc-height" className="max-w-36">
              <Input
                id="vc-height"
                type="number"
                min="100"
                value={venueConfig.height}
                onChange={(e) => onVenueConfigChange({ height: Math.max(100, Number(e.target.value) || 0) })}
              />
            </Field>
            <label className="flex items-center gap-2 self-end pb-2.5 text-sm text-[var(--text-secondary)]">
              <input
                type="checkbox"
                checked={venueConfig.showGrid}
                onChange={(e) => onVenueConfigChange({ showGrid: e.target.checked })}
                className="h-4 w-4 rounded border-[var(--border-strong)] accent-[var(--accent)]"
              />
              Show grid
            </label>

            <label className="flex cursor-pointer items-center gap-2 text-sm text-[var(--text-secondary)]">
              <input
                type="checkbox"
                checked={venueConfig.cropped}
                onChange={(e) =>
                  onVenueConfigChange({
                    cropped: e.target.checked,
                    // First time on, start from the full canvas so the handle
                    // is somewhere findable rather than collapsed at 0,0.
                    ...(e.target.checked && venueConfig.cropWidth <= 0
                      ? { cropWidth: venueConfig.width, cropHeight: venueConfig.height }
                      : {}),
                  })
                }
                className="h-4 w-4 rounded border-[var(--border-strong)] accent-[var(--accent)]"
              />
              Crop
            </label>
            {venueConfig.cropped && (
              <>
                <Button type="button" variant="secondary" size="sm" onClick={cropToContents}>
                  Fit to contents
                </Button>
                <span className="text-xs text-[var(--text-muted)]">
                  {venueConfig.cropWidth} × {venueConfig.cropHeight} cm published
                </span>
              </>
            )}
          </div>
          <Button type="button" variant="secondary" size="sm" onClick={downloadVenuePdf} disabled={pdfBusy}>
            <Icon name="download" size={14} />
            {pdfBusy ? "Preparing…" : "Download PDF"}
          </Button>
        </div>

        {/* CAD annotation toolbar (Phase 8h) — switch between moving/placing
          templates and the drawing tools (line / arrow / box / dimension). */}
        <div className="flex flex-wrap items-center gap-1 rounded-lg border border-[var(--border-subtle)] p-1.5">
          {ANNOTATION_TOOLS.map(({ t, label, icon }) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                setAnnotationTool(t);
                setSelectedAnnId(null);
              }}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                annotationTool === t
                  ? "bg-[var(--accent)] text-white"
                  : "text-[var(--text-secondary)] hover:bg-[var(--surface-sunken)]"
              }`}
              title={t === "none" ? "Move / place items" : `Draw ${label.toLowerCase()}`}
            >
              <Icon name={icon} size={14} />
              {label}
            </button>
          ))}
          <div className="mx-1 h-5 w-px bg-[var(--border-subtle)]" />
          <label className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]" title="Drawing colour">
            <input
              type="color"
              value={annotationColor}
              onChange={(e) => setAnnotationColor(e.target.value)}
              className="h-6 w-7 cursor-pointer rounded border border-[var(--border-strong)] bg-transparent p-0"
            />
          </label>
          {selectedAnnId && annotationTool === "select" && (
            <>
              <div className="mx-1 h-5 w-px bg-[var(--border-subtle)]" />
              <button
                type="button"
                onClick={() => {
                  onAnnotationsChange(annotations.filter((a) => a.id !== selectedAnnId));
                  setSelectedAnnId(null);
                }}
                className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold text-red-500 transition-colors hover:bg-red-50 hover:text-red-600"
              >
                <Icon name="trash" size={14} />
                Delete
              </button>
            </>
          )}
          {annotationTool !== "none" && (
            <span className="ml-auto pr-1 text-[11px] text-[var(--text-muted)]">
              {annotationTool === "select"
                ? "Click a drawing to select · Del to remove"
                : "Click-drag on the canvas to draw"}
            </span>
          )}
        </div>

        <div ref={wrapRef} className="relative mx-auto w-full max-w-[900px]">
          <svg
            ref={svgRef}
            data-testid="venue-canvas"
            viewBox={`0 0 ${venueConfig.width} ${venueConfig.height}`}
            className="block w-full rounded-xl border border-[var(--border-strong)] bg-[var(--surface-sunken)]"
            style={{ aspectRatio: `${venueConfig.width} / ${venueConfig.height}` }}
            onMouseDown={() => setSelectedId(null)}
          >
            {gridLines.map((l, i) => (
              <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke="var(--border-subtle)" strokeWidth={1} />
            ))}
            {placedItems.map((p) => {
              const isSelected = p.positionId === selectedId;
              return (
                <g key={p.positionId}>
                  {p.isCircle ? (
                    <circle
                      data-testid="placed-item"
                      data-position-id={p.positionId}
                      cx={p.x + p.width / 2}
                      cy={p.y + p.height / 2}
                      r={p.width / 2}
                      fill={p.color}
                      fillOpacity={0.75}
                      stroke={isSelected ? "var(--accent)" : "#00000033"}
                      strokeWidth={isSelected ? 3 : 1}
                      onMouseDown={(e) => startDrag(e, p, "move")}
                      className="cursor-move"
                    />
                  ) : (
                    <rect
                      data-testid="placed-item"
                      data-position-id={p.positionId}
                      x={p.x}
                      y={p.y}
                      width={p.width}
                      height={p.height}
                      rx={p.kind === "seat" ? 3 : 4}
                      fill={p.color}
                      fillOpacity={0.75}
                      stroke={isSelected ? "var(--accent)" : "#00000033"}
                      strokeWidth={isSelected ? 3 : 1}
                      onMouseDown={(e) => startDrag(e, p, "move")}
                      className="cursor-move"
                    />
                  )}
                  {/* Court/field markings, so a Badminton Court reads as one
                      while it is being positioned — not just on the public
                      page. pointerEvents are off inside, so dragging still
                      works through them. */}
                  {p.kind === "scheduledSpace" && p.facilityType && (
                    <FacilityCourtLines
                      facilityType={p.facilityType}
                      x={p.x}
                      y={p.y}
                      width={p.width}
                      height={p.height}
                      isCircle={p.isCircle}
                      idSeed={p.positionId}
                    />
                  )}
                  <text
                    x={p.x + p.width / 2}
                    y={p.y + p.height / 2}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize={p.kind === "seat" ? 10 : 12}
                    fill="#111"
                    pointerEvents="none"
                  >
                    {p.kind === "seat" ? p.seatNumber : p.name}
                  </text>
                  {isSelected && !p.isCircle && p.kind !== "seat" && (
                    <rect
                      data-testid="resize-handle"
                      x={p.x + p.width - 8}
                      y={p.y + p.height - 8}
                      width={16}
                      height={16}
                      fill="var(--accent)"
                      className="cursor-nwse-resize"
                      onMouseDown={(e) => startDrag(e, p, "resize")}
                    />
                  )}
                </g>
              );
            })}
          </svg>

          {/* Crop overlay: everything outside the published window is dimmed,
              and the corner handle resizes it. Drawn after the items so it
              sits over them, but only the handle takes pointer events. */}
          {venueConfig.cropped && (
            <g>
              <path
                d={`M0,0 H${venueConfig.width} V${venueConfig.height} H0 Z M0,0 V${venueConfig.cropHeight} H${venueConfig.cropWidth} V0 Z`}
                fill="rgba(15,23,42,0.45)"
                fillRule="evenodd"
                pointerEvents="none"
              />
              <rect
                x={0}
                y={0}
                width={venueConfig.cropWidth}
                height={venueConfig.cropHeight}
                fill="none"
                stroke="var(--accent)"
                strokeWidth={2}
                strokeDasharray="8 5"
                pointerEvents="none"
              />
              <rect
                data-testid="crop-handle"
                x={venueConfig.cropWidth - 9}
                y={venueConfig.cropHeight - 9}
                width={18}
                height={18}
                rx={3}
                fill="var(--accent)"
                className="cursor-nwse-resize"
                onMouseDown={startCropDrag}
              />
            </g>
          )}

          {overlay.width > 0 && (
            <VenueAnnotationLayer
              width={overlay.width}
              height={overlay.height}
              scale={overlay.scale}
              annotations={annotations}
              onChange={onAnnotationsChange}
              tool={annotationTool}
              color={annotationColor}
              onSelect={setSelectedAnnId}
            />
          )}
        </div>

        {selected && (
          <div className="flex flex-wrap items-center gap-2 rounded-lg bg-[var(--surface-sunken)] p-2 text-sm">
            <span className="font-medium text-[var(--text-primary)]">{selected.name}</span>
            <span className="text-[var(--text-muted)]">({KIND_LABEL[selected.kind]})</span>
            <Button type="button" variant="secondary" size="sm" onClick={() => rotate90(selected.positionId)}>
              Rotate 90°
            </Button>
            <Button type="button" variant="danger" size="sm" onClick={() => removeFromCanvas(selected.positionId)}>
              <Icon name="x" size={14} />
              Remove
            </Button>
          </div>
        )}
      </div>

      <div className="w-full shrink-0 lg:w-56">
        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
          Add to canvas
        </p>
        {unplacedTemplates.length === 0 ? (
          <p className="text-xs text-[var(--text-muted)]">
            Define a Space, Round Table, Scheduled Space, Speaker slot, or Seat Row template first.
          </p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {unplacedTemplates.map((t) => (
              <button
                key={`${t.kind}-${t.templateId}`}
                type="button"
                onClick={() => addToCanvas(t)}
                className="flex items-center justify-between gap-2 rounded-lg border border-[var(--border-subtle)] px-3 py-2 text-left text-sm hover:border-[var(--accent)]"
              >
                <span className="truncate">
                  {t.name || "(unnamed)"}
                  <span className="block text-xs text-[var(--text-muted)]">{KIND_LABEL[t.kind]}</span>
                </span>
                <Icon name="plus" size={14} className="shrink-0 text-[var(--text-muted)]" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
