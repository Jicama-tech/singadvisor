import { useState, type DragEvent } from "react";
import type { CurriculumTree } from "@/lib/courseContentClient";

/**
 * Drag-to-reorder for the curriculum outline, on plain HTML5 drag events —
 * package.json carries no dnd library (konva is canvas-only) and this does not
 * justify adding one.
 *
 * This is an ENHANCEMENT, never the contract. CurriculumOutline's ▲▼ buttons
 * move a row one position and call the same `onReorder`; they are always
 * available and keyboard-reachable, and cross-module moves have their own
 * non-drag control (the "Move to module" select in CourseItemEditor). Nothing
 * here can be the only way to do anything.
 *
 * Like the buttons, a drop sends the WHOLE outline — every module, and every
 * item under the module it now sits in — because that is what the Backend's
 * reorder endpoint takes: it checks the payload names exactly the rows the
 * course holds today, so a stale tab cannot strand a row someone else added.
 */

/** What is being dragged: a whole module card, or one item row. */
export type OutlineDragSource = { kind: "module" | "item"; id: string };

/**
 * Where it would land. `zone` is the row the pointer is over and `edge` which
 * side of that row's midpoint it is on. `module-end` is the strip below a
 * module's last item — the only way to drop into a module holding no items at
 * all, and how an item lands after the last one; it always carries "below".
 */
export type OutlineDropTarget = {
  zone: "module" | "item" | "module-end";
  id: string;
  edge: "above" | "below";
};

/** The outline as both the buttons and a drop send it. */
type Outline = { id: string; itemIds: string[] }[];

/** Props for a row that both starts a drag and receives one. */
type RowDragProps = {
  draggable: boolean;
  onDragStart: (e: DragEvent<HTMLElement>) => void;
  onDragEnd: () => void;
  onDragOver: (e: DragEvent<HTMLElement>) => void;
  onDrop: (e: DragEvent<HTMLElement>) => void;
};

/** Props for a strip that only receives one. */
type ZoneDragProps = {
  onDragOver: (e: DragEvent<HTMLElement>) => void;
  onDrop: (e: DragEvent<HTMLElement>) => void;
};

const outlineOf = (tree: CurriculumTree): Outline =>
  tree.modules.map((m) => ({ id: m._id, itemIds: m.items.map((i) => i._id) }));

/** Dropping a row back where it started would otherwise cost a PATCH and a
 * full reload for no change. */
function sameOutline(a: Outline, b: Outline): boolean {
  return (
    a.length === b.length &&
    a.every((m, i) => m.id === b[i].id && m.itemIds.join() === b[i].itemIds.join())
  );
}

/**
 * The outline as it would be after this drop, or null if either end of the
 * move has gone missing (a reload landed mid-drag). Pure — the caller decides
 * whether it is worth sending.
 */
function outlineAfterDrop(
  tree: CurriculumTree,
  source: OutlineDragSource,
  target: OutlineDropTarget,
): Outline | null {
  const next = outlineOf(tree);

  if (source.kind === "module") {
    const from = next.findIndex((m) => m.id === source.id);
    if (from === -1) return null;
    const [moved] = next.splice(from, 1);
    // Find the target AFTER lifting the dragged module out, so the index is
    // the one in the list the row is about to be inserted into.
    const at = next.findIndex((m) => m.id === target.id);
    if (at === -1) return null;
    next.splice(target.edge === "below" ? at + 1 : at, 0, moved);
    return next;
  }

  // An item: lift it out of whichever module holds it, then insert into the
  // target's. Crossing modules is a reparent, which the reorder endpoint
  // handles in the same payload (and where it migrates a lesson heading the
  // departing item was carrying).
  for (const m of next) m.itemIds = m.itemIds.filter((id) => id !== source.id);

  if (target.zone === "module-end") {
    const dest = next.find((m) => m.id === target.id);
    if (!dest) return null;
    dest.itemIds.push(source.id);
    return next;
  }

  const dest = next.find((m) => m.itemIds.includes(target.id));
  if (!dest) return null;
  const at = dest.itemIds.indexOf(target.id);
  dest.itemIds.splice(target.edge === "below" ? at + 1 : at, 0, source.id);
  return next;
}

export function useOutlineDrag(
  tree: CurriculumTree,
  onReorder: (modules: Outline) => void | Promise<void>,
  /** False while a write is in flight — the tree is about to be replaced, so
   * a drop computed against this one would be reordering stale rows. */
  enabled: boolean,
) {
  const [dragging, setDragging] = useState<OutlineDragSource | null>(null);
  const [dropTarget, setDropTarget] = useState<OutlineDropTarget | null>(null);

  function clear() {
    setDragging(null);
    setDropTarget(null);
  }

  function edgeOf(e: DragEvent<HTMLElement>): "above" | "below" {
    const box = e.currentTarget.getBoundingClientRect();
    return e.clientY < box.top + box.height / 2 ? "above" : "below";
  }

  /**
   * Whether what is being dragged may land on this zone at all: a module only
   * reorders among modules, an item only among items, and neither may land on
   * itself. When it may not we simply do NOT call preventDefault — that is how
   * HTML5 drag says "no drop here", and it lets the event bubble to the module
   * card behind the row, which is what makes dragging a module over another
   * module's items still read as "above/below that module".
   */
  function accepts(zone: OutlineDropTarget["zone"], id: string): boolean {
    if (!enabled || !dragging) return false;
    if (dragging.kind === "module") return zone === "module" && dragging.id !== id;
    return zone !== "module" && !(zone === "item" && dragging.id === id);
  }

  function start(source: OutlineDragSource, e: DragEvent<HTMLElement>) {
    // Item rows sit inside the draggable module card, so dragstart bubbles to
    // it and would overwrite the source with the module.
    e.stopPropagation();
    // Firefox refuses to start a drag whose dataTransfer carries nothing.
    e.dataTransfer.setData("text/plain", source.id);
    e.dataTransfer.effectAllowed = "move";
    setDragging(source);
  }

  function over(target: OutlineDropTarget, e: DragEvent<HTMLElement>) {
    if (!accepts(target.zone, target.id)) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "move";
    // dragover fires continuously; only re-render when the marker actually
    // has somewhere new to be.
    setDropTarget((prev) =>
      prev && prev.zone === target.zone && prev.id === target.id && prev.edge === target.edge
        ? prev
        : target,
    );
  }

  function drop(target: OutlineDropTarget, e: DragEvent<HTMLElement>) {
    if (!dragging || !accepts(target.zone, target.id)) return;
    e.preventDefault();
    e.stopPropagation();
    const next = outlineAfterDrop(tree, dragging, target);
    clear();
    if (next && !sameOutline(next, outlineOf(tree))) void onReorder(next);
  }

  // No onDragLeave anywhere: it fires every time the pointer crosses into a
  // child element, so clearing on it makes the insertion marker strobe as you
  // move down a row. The marker follows dragover instead and is cleared by
  // the drop or by dragend, which always fires.
  return {
    dragging,
    dropTarget,
    handlers: {
      module: (id: string): RowDragProps => ({
        draggable: enabled,
        onDragStart: (e) => start({ kind: "module", id }, e),
        onDragEnd: clear,
        onDragOver: (e) => over({ zone: "module", id, edge: edgeOf(e) }, e),
        onDrop: (e) => drop({ zone: "module", id, edge: edgeOf(e) }, e),
      }),
      item: (id: string): RowDragProps => ({
        draggable: enabled,
        onDragStart: (e) => start({ kind: "item", id }, e),
        onDragEnd: clear,
        onDragOver: (e) => over({ zone: "item", id, edge: edgeOf(e) }, e),
        onDrop: (e) => drop({ zone: "item", id, edge: edgeOf(e) }, e),
      }),
      moduleEnd: (id: string): ZoneDragProps => ({
        onDragOver: (e) => over({ zone: "module-end", id, edge: "below" }, e),
        onDrop: (e) => drop({ zone: "module-end", id, edge: "below" }, e),
      }),
    },
  };
}
