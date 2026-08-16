"use client";

import { useEffect, useRef, useState } from "react";
import {
  Stage,
  Layer,
  Line,
  Rect,
  Text as KText,
  Group,
  Circle,
  Arrow,
} from "react-konva";
import type Konva from "konva";

/**
 * AutoCAD-style annotation layer for the Space Layout canvas (Phase 8h) —
 * a near-verbatim port of eventsh-v1's VenueAnnotationLayer.tsx. The file
 * has zero eventsh-styling dependencies (no Tailwind classes tied to the
 * shadcn look, no imported UI components) — it's plain react-konva plus one
 * inline-styled `<input>` for the text editor overlay, so nothing needed
 * restyling here. Only addition: this default-exports (VenueCanvas.tsx
 * loads it via `next/dynamic(..., { ssr: false })`, matching the same
 * Next.js-specific adaptation already used for RichTextEditor/Quill —
 * react-konva's Stage touches the DOM/Canvas API at mount time and must
 * never run during server rendering).
 *
 * Renders on a Konva <Stage> that sits ON TOP of VenueCanvas's DOM-based
 * SVG canvas (spaces / round tables / scheduled spaces / speaker zones).
 * Annotations are stored in the SAME logical coordinate units as the
 * placed items; the layer scales by `scale` for display so a line drawn
 * next to a space stays put as the canvas resizes.
 *
 * Pointer events are only captured while an annotation tool is active
 * (`tool !== "none"`). In "none" mode the stage is pointer-events:none, so
 * the existing placement/drag interactions on the SVG layer below keep
 * working untouched.
 */

export type AnnotationTool =
  | "none"
  | "select"
  | "line"
  | "arrow"
  | "text"
  | "rect"
  | "dimension";

export interface VenueAnnotation {
  id: string;
  type: "line" | "arrow" | "text" | "rect" | "dimension";
  /** line / dimension: [x1, y1, x2, y2] in logical units */
  points?: number[];
  /** rect / text top-left + size in logical units */
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  text?: string;
  color?: string;
  fill?: string;
  strokeWidth?: number;
  fontSize?: number;
}

interface Props {
  /** Canvas size in screen px (already logical * scale). */
  width: number;
  height: number;
  /** Logical-unit -> screen-px factor. */
  scale: number;
  annotations: VenueAnnotation[];
  onChange?: (next: VenueAnnotation[]) => void;
  tool?: AnnotationTool;
  /** Stroke / text colour for newly drawn shapes. */
  color?: string;
  /** Read-only display. */
  readOnly?: boolean;
  /** Logical units -> metres, for dimension labels. 1 unit = 10 cm. */
  metersPerUnit?: number;
  /** Notifies the parent when a shape is selected (so it can show a delete btn). */
  onSelect?: (id: string | null) => void;
  zIndex?: number;
}

const rid = () => Math.random().toString(36).slice(2, 11);

export default function VenueAnnotationLayer({
  width,
  height,
  scale,
  annotations,
  onChange,
  tool = "none",
  color = "#1e293b",
  readOnly = false,
  metersPerUnit = 0.1,
  onSelect,
  zIndex = 20,
}: Props) {
  const interactive = !readOnly && tool !== "none";
  const stageRef = useRef<Konva.Stage>(null);

  // In-progress shape while dragging out a new line/rect/dimension.
  const [draft, setDraft] = useState<VenueAnnotation | null>(null);
  const drawingRef = useRef(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Inline text editor overlay (screen-px positioned over the stage).
  const [editing, setEditing] = useState<{
    id: string;
    value: string;
    left: number;
    top: number;
  } | null>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  // Reliably focus + select the editor when it opens. Intentionally NOT
  // using the native `autoFocus` attribute here — it focuses the input
  // synchronously the instant it's inserted into the DOM, which is still
  // mid-gesture: the editor is created from a Konva `mousedown` (via
  // `openEditor`, called from `handleMouseDown`'s "text" branch), and the
  // SAME click's `mouseup`/`click` hasn't landed yet. Whatever native focus
  // resolution that completing click does next reliably blurs the
  // just-autofocused input closed again before a user can type a single
  // character (confirmed directly: autoFocus's immediate focus was
  // consistently followed by a blur within the same task, before this
  // effect's own deferred attempt ever got to run). Deferring the focus
  // call past the click's own event dispatch — a plain setTimeout 0, not
  // rAF; this needs to run after event handling settles, not merely before
  // the next paint — lets it go last and actually stick.
  useEffect(() => {
    if (editing) {
      const id = window.setTimeout(() => {
        const el = editInputRef.current;
        if (el) {
          el.focus();
          el.select();
        }
      }, 0);
      return () => window.clearTimeout(id);
    }
    // Deliberately keyed on the editor's id only, not the whole `editing`
    // object — refocusing on every keystroke (which updates editing.value)
    // would steal the cursor position back to the end on each character.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing?.id]);

  useEffect(() => {
    if (tool !== "select") {
      setSelectedId(null);
      onSelect?.(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tool]);

  // Allow the parent (toolbar) to delete the selected shape via
  // Delete/Backspace when something is selected.
  useEffect(() => {
    if (readOnly) return;
    const onKey = (e: KeyboardEvent) => {
      if (
        (e.key === "Delete" || e.key === "Backspace") &&
        selectedId &&
        !editing
      ) {
        const target = e.target as HTMLElement | null;
        const tag = target?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || target?.isContentEditable)
          return;
        e.preventDefault();
        commit(annotations.filter((a) => a.id !== selectedId));
        setSelectedId(null);
        onSelect?.(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, annotations, editing, readOnly]);

  const commit = (next: VenueAnnotation[]) => onChange?.(next);

  // Screen px (relative to stage) -> logical units.
  const toLogical = (p: { x: number; y: number }) => ({
    x: p.x / scale,
    y: p.y / scale,
  });

  const pointer = () => {
    const stage = stageRef.current;
    if (!stage) return null;
    const p = stage.getPointerPosition();
    return p ? toLogical(p) : null;
  };

  // Shared by mouse AND touch (Stage's onTouchStart/Move/End below pass
  // these straight through) — only `e.target` is used, which exists on
  // both event flavours, so a union type here avoids an `any` cast.
  const handleMouseDown = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    if (!interactive) return;
    // Clicking empty canvas in select mode clears the selection.
    const clickedEmpty = e.target === e.target.getStage();
    if (tool === "select") {
      if (clickedEmpty) {
        setSelectedId(null);
        onSelect?.(null);
      }
      return;
    }
    const p = pointer();
    if (!p) return;

    if (tool === "text") {
      const id = rid();
      // Seed with a visible default so a label always appears on click,
      // even before typing; the editor opens with it pre-selected.
      const a: VenueAnnotation = {
        id,
        type: "text",
        x: p.x,
        y: p.y,
        text: "Text",
        color,
        fontSize: 16,
      };
      commit([...annotations, a]);
      setSelectedId(id);
      onSelect?.(id);
      openEditor(a);
      return;
    }

    drawingRef.current = true;
    if (tool === "rect") {
      setDraft({
        id: rid(),
        type: "rect",
        x: p.x,
        y: p.y,
        width: 0,
        height: 0,
        color,
        fill: color + "22",
        strokeWidth: 2,
      });
    } else {
      setDraft({
        id: rid(),
        type:
          tool === "dimension"
            ? "dimension"
            : tool === "arrow"
              ? "arrow"
              : "line",
        points: [p.x, p.y, p.x, p.y],
        color,
        strokeWidth: 2,
      });
    }
  };

  const handleMouseMove = () => {
    if (!interactive || !drawingRef.current || !draft) return;
    const p = pointer();
    if (!p) return;
    if (draft.type === "rect") {
      setDraft({
        ...draft,
        width: p.x - (draft.x ?? 0),
        height: p.y - (draft.y ?? 0),
      });
    } else {
      const [x1, y1] = draft.points!;
      setDraft({ ...draft, points: [x1, y1, p.x, p.y] });
    }
  };

  const handleMouseUp = () => {
    if (!interactive || !drawingRef.current || !draft) return;
    drawingRef.current = false;
    let shape = draft;
    setDraft(null);
    // Normalise a rect drawn up/left so width/height are positive.
    if (shape.type === "rect") {
      let { x = 0, y = 0, width = 0, height = 0 } = shape;
      if (width < 0) {
        x += width;
        width = -width;
      }
      if (height < 0) {
        y += height;
        height = -height;
      }
      if (width < 4 || height < 4) return; // ignore accidental taps
      shape = { ...shape, x, y, width, height };
    } else {
      const [x1, y1, x2, y2] = shape.points!;
      if (Math.hypot(x2 - x1, y2 - y1) < 6) return; // ignore tiny lines
    }
    commit([...annotations, shape]);
    setSelectedId(shape.id);
    onSelect?.(shape.id);
  };

  // --- text editor overlay ---
  const openEditor = (a: VenueAnnotation) => {
    setEditing({
      id: a.id,
      value: a.text ?? "",
      left: (a.x ?? 0) * scale,
      top: (a.y ?? 0) * scale,
    });
  };
  const closeEditor = (save: boolean) => {
    if (!editing) return;
    if (save) {
      // Keep a non-empty label (fall back to "Text" rather than deleting on
      // blur, so a placed label never silently vanishes). Use the toolbar's
      // Delete button in Select mode to remove it.
      const v = editing.value.trim() || "Text";
      commit(
        annotations.map((a) =>
          a.id === editing.id ? { ...a, text: v } : a,
        ),
      );
    }
    setEditing(null);
  };

  const select = (id: string) => {
    if (tool !== "select") return;
    setSelectedId(id);
    onSelect?.(id);
  };

  // Drag-move a whole shape; writes the delta back in logical units.
  const onDragEnd = (
    a: VenueAnnotation,
    e: Konva.KonvaEventObject<DragEvent>,
  ) => {
    const node = e.target;
    const dx = node.x() / scale;
    const dy = node.y() / scale;
    node.position({ x: 0, y: 0 }); // reset; we bake the delta into coords
    let updated: VenueAnnotation;
    if (a.type === "rect" || a.type === "text") {
      updated = { ...a, x: (a.x ?? 0) + dx, y: (a.y ?? 0) + dy };
    } else {
      const [x1, y1, x2, y2] = a.points!;
      updated = { ...a, points: [x1 + dx, y1 + dy, x2 + dx, y2 + dy] };
    }
    commit(annotations.map((x) => (x.id === a.id ? updated : x)));
  };

  // Drag a line / dimension endpoint.
  const onEndpointDrag = (
    a: VenueAnnotation,
    which: 0 | 1,
    e: Konva.KonvaEventObject<DragEvent>,
  ) => {
    const node = e.target;
    const lx = node.x() / scale;
    const ly = node.y() / scale;
    const pts = [...a.points!];
    pts[which * 2] = lx;
    pts[which * 2 + 1] = ly;
    commit(annotations.map((x) => (x.id === a.id ? { ...a, points: pts } : x)));
  };

  const dimLabel = (len: number) => `${(len * metersPerUnit).toFixed(2)} m`;

  const renderShape = (a: VenueAnnotation, isDraft = false) => {
    const selected = !isDraft && selectedId === a.id;
    const draggable = interactive && tool === "select" && !isDraft;
    const stroke = a.color || color;
    const sw = (a.strokeWidth ?? 2) / scale; // keep visual weight constant

    if (a.type === "rect") {
      return (
        <Group key={a.id}>
          <Rect
            x={a.x}
            y={a.y}
            width={a.width}
            height={a.height}
            stroke={stroke}
            strokeWidth={sw}
            fill={a.fill || "transparent"}
            cornerRadius={2 / scale}
            draggable={draggable}
            onMouseDown={() => select(a.id)}
            onTap={() => select(a.id)}
            onDragEnd={(e) => onDragEnd(a, e)}
            shadowColor={selected ? "#2563eb" : undefined}
            shadowBlur={selected ? 8 / scale : 0}
            dash={selected ? [6 / scale, 4 / scale] : undefined}
          />
        </Group>
      );
    }

    if (a.type === "text") {
      return (
        <KText
          key={a.id}
          x={a.x}
          y={a.y}
          text={a.text || " "}
          fontSize={(a.fontSize ?? 16) / scale}
          fontStyle="bold"
          fill={stroke}
          draggable={draggable}
          onMouseDown={() => select(a.id)}
          onTap={() => select(a.id)}
          onDblClick={() => interactive && openEditor(a)}
          onDblTap={() => interactive && openEditor(a)}
          onDragEnd={(e) => onDragEnd(a, e)}
        />
      );
    }

    // line / dimension
    const [x1, y1, x2, y2] = a.points!;
    const len = Math.hypot(x2 - x1, y2 - y1);
    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;
    const isDim = a.type === "dimension";
    const isArrow = a.type === "arrow";
    return (
      <Group key={a.id}>
        {/* Fat invisible hit line so thin lines are easy to grab. */}
        {!isDraft && (
          <Line
            points={a.points ?? []}
            stroke="transparent"
            strokeWidth={14 / scale}
            draggable={draggable}
            onMouseDown={() => select(a.id)}
            onTap={() => select(a.id)}
            onDragEnd={(e) => onDragEnd(a, e)}
          />
        )}
        {isDim || isArrow ? (
          // Dimension = double-headed arrow (both ends); Arrow = single
          // arrowhead at the end so it points in the drawn direction.
          <Arrow
            points={a.points ?? []}
            stroke={stroke}
            fill={stroke}
            strokeWidth={sw}
            pointerAtBeginning={isDim}
            pointerAtEnding
            pointerLength={(isArrow ? 12 : 8) / scale}
            pointerWidth={(isArrow ? 12 : 8) / scale}
            lineCap="round"
            listening={false}
          />
        ) : (
          <Line
            points={a.points ?? []}
            stroke={stroke}
            strokeWidth={sw}
            lineCap="round"
            listening={false}
          />
        )}
        {isDim && (
          <KText
            x={midX - 22 / scale}
            y={midY - 16 / scale}
            text={dimLabel(len)}
            fontSize={12 / scale}
            fontStyle="bold"
            fill={stroke}
            listening={false}
          />
        )}
        {selected &&
          (
            [
              [x1, y1, 0],
              [x2, y2, 1],
            ] as const
          ).map(([hx, hy, idx]) => (
            <Circle
              key={idx}
              x={hx}
              y={hy}
              radius={6 / scale}
              fill="#ffffff"
              stroke="#2563eb"
              strokeWidth={2 / scale}
              draggable
              onDragMove={(e) => onEndpointDrag(a, idx as 0 | 1, e)}
              onDragEnd={(e) => onEndpointDrag(a, idx as 0 | 1, e)}
            />
          ))}
      </Group>
    );
  };

  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width,
        height,
        // Pass through to the SVG layer below unless a tool is active.
        pointerEvents: interactive ? "auto" : "none",
        zIndex,
      }}
    >
      <Stage
        ref={stageRef}
        width={width}
        height={height}
        listening={interactive}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onTouchStart={handleMouseDown}
        onTouchMove={handleMouseMove}
        onTouchEnd={handleMouseUp}
        style={{
          cursor:
            tool === "select" || tool === "none" ? "default" : "crosshair",
        }}
      >
        <Layer scaleX={scale} scaleY={scale}>
          {annotations.map((a) => renderShape(a))}
          {draft && renderShape(draft, true)}
        </Layer>
      </Stage>

      {editing && (
        <input
          ref={editInputRef}
          value={editing.value}
          onChange={(e) =>
            setEditing({ ...editing, value: e.target.value })
          }
          onBlur={() => closeEditor(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter") closeEditor(true);
            if (e.key === "Escape") closeEditor(false);
          }}
          placeholder="Type label…"
          style={{
            position: "absolute",
            left: editing.left,
            top: editing.top,
            transform: "translateY(-2px)",
            font: "bold 16px sans-serif",
            color,
            border: "1px solid #2563eb",
            borderRadius: 4,
            padding: "2px 6px",
            outline: "none",
            background: "white",
            zIndex: 30,
            minWidth: 120,
          }}
        />
      )}
    </div>
  );
}
