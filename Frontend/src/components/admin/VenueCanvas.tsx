"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Field, Input } from "@/components/ui/Field";

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
 * image import, measurement tools). The CAD annotation overlay (Phase 8h)
 * layers on top of this unchanged either way.
 */

export type CanvasKind = "table" | "roundTable" | "scheduledSpace" | "speakerZone";

export type CanvasTemplate = {
  templateId: string;
  kind: CanvasKind;
  name: string;
  width: number;
  height: number;
  isCircle: boolean;
  color: string;
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
};

export type VenueConfigState = {
  width: number;
  height: number;
  gridSize: number;
  showGrid: boolean;
};

let placedCounter = 0;
const nextPlacedId = () => `pos-${Date.now()}-${++placedCounter}`;

const KIND_LABEL: Record<CanvasKind, string> = {
  table: "Space",
  roundTable: "Round Table",
  scheduledSpace: "Scheduled Space",
  speakerZone: "Speaker Slot",
};

export function VenueCanvas({
  venueConfig,
  onVenueConfigChange,
  templates,
  placedItems,
  onChange,
}: {
  venueConfig: VenueConfigState;
  onVenueConfigChange: (patch: Partial<VenueConfigState>) => void;
  templates: CanvasTemplate[];
  placedItems: PlacedItem[];
  onChange: (items: PlacedItem[]) => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const dragState = useRef<{ id: string; offsetX: number; offsetY: number; mode: "move" | "resize" } | null>(null);

  function svgPoint(clientX: number, clientY: number): { x: number; y: number } {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    const scaleX = venueConfig.width / rect.width;
    const scaleY = venueConfig.height / rect.height;
    return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
  }

  function addToCanvas(t: CanvasTemplate) {
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
      isCircle: t.isCircle,
      color: t.color,
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
        </div>

        <svg
          ref={svgRef}
          data-testid="venue-canvas"
          viewBox={`0 0 ${venueConfig.width} ${venueConfig.height}`}
          className="w-full rounded-xl border border-[var(--border-strong)] bg-[var(--surface-sunken)]"
          style={{ maxHeight: 520 }}
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
                    rx={4}
                    fill={p.color}
                    fillOpacity={0.75}
                    stroke={isSelected ? "var(--accent)" : "#00000033"}
                    strokeWidth={isSelected ? 3 : 1}
                    onMouseDown={(e) => startDrag(e, p, "move")}
                    className="cursor-move"
                  />
                )}
                <text
                  x={p.x + p.width / 2}
                  y={p.y + p.height / 2}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={12}
                  fill="#111"
                  pointerEvents="none"
                >
                  {p.name}
                </text>
                {isSelected && !p.isCircle && (
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
            Define a Space, Round Table, Scheduled Space, or Speaker slot template first.
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
