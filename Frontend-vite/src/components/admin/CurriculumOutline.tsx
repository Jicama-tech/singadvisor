import { useState } from "react";
import { AdminEmpty, Panel } from "@/components/admin/AdminUI";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { useOutlineDrag } from "@/hooks/useOutlineDrag";
import { ITEM_KINDS, formatMins, kindMeta, type CourseItemKind } from "@/lib/course-content";
import type { CurriculumTree } from "@/lib/courseContentClient";
import { cn } from "@/lib/utils";

/** Which record the editor pane has open. Never both, and `null` while the
 * builder has just loaded or the selected row has been deleted. */
export type OutlineSelection = { kind: "module" | "item"; id: string } | null;

/** Every mutation is CourseBuilder's to run — this pane holds nothing but
 * which modules are folded shut and which one has its "Add item" picker open.
 * Everything else arrives as a prop and goes back up as a call. */
type CurriculumOutlineProps = {
  tree: CurriculumTree;
  selected: OutlineSelection;
  /** A write is in flight; the tree is about to be replaced. */
  pending: boolean;
  onSelect: (sel: NonNullable<OutlineSelection>) => void;
  onAddModule: () => void | Promise<void>;
  onAddItem: (moduleId: string, kind: CourseItemKind) => void | Promise<void>;
  onSeedFromOutline: () => void | Promise<void>;
  /** Whole-outline reorder — the caller PATCHes it and reloads. */
  onReorder: (modules: { id: string; itemIds: string[] }[]) => void | Promise<void>;
  onDuplicateModule: (moduleId: string) => void | Promise<void>;
  onDuplicateItem: (itemId: string) => void | Promise<void>;
  onPublishAllInModule: (moduleId: string, published: boolean) => void | Promise<void>;
  onDeleteModule: (moduleId: string) => Promise<void>;
  onDeleteItem: (itemId: string) => Promise<void>;
  /** Clears an item's lessonHeading divider. */
  onClearLessonHeading: (itemId: string) => void | Promise<void>;
};

/** The 8×8 icon button every admin row cluster uses (CouponsPanel's edit
 * pencil, DeleteButton itself), plus Button.tsx's own disabled treatment — ▲▼
 * are disabled at the ends of their scope rather than hidden, so the cluster
 * never changes width as a row travels down a list. */
const ICON_BUTTON =
  "grid h-8 w-8 place-items-center rounded-lg text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-sunken)] hover:text-[var(--accent)] disabled:pointer-events-none disabled:opacity-40";

/**
 * Hover-revealed from lg up, where a cluster on every row would be noise;
 * always visible below it, because a touch screen has no hover and the builder
 * stacks to one column there.
 *
 * The group has to be NAMED: module cards contain item rows, so a bare
 * `group-hover:` on an item's cluster would also fire with the pointer
 * anywhere on the module card around it, revealing every item's buttons at
 * once.
 */
const MODULE_ACTIONS =
  "flex shrink-0 items-center gap-0.5 transition-opacity lg:opacity-0 lg:group-hover/module:opacity-100 lg:group-focus-within/module:opacity-100";
const ITEM_ACTIONS =
  "flex shrink-0 items-center gap-0.5 transition-opacity lg:opacity-0 lg:group-hover/item:opacity-100 lg:group-focus-within/item:opacity-100";

const ADD_ITEM_BUTTON =
  "flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[var(--border-strong)] py-3 text-sm text-[var(--text-muted)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:pointer-events-none disabled:opacity-50";

/** PostForm's "how do you want to create this?" choice card, reused for the
 * six item kinds — the same shape of decision, taken the same way. */
const CHOICE_CARD =
  "flex flex-col items-start gap-2 rounded-xl border border-[var(--border-strong)] p-5 text-left transition-colors hover:border-[var(--accent)] hover:bg-[var(--surface-sunken)] disabled:pointer-events-none disabled:opacity-50";

const itemCountLabel = (n: number) => `${n} item${n === 1 ? "" : "s"}`;

/**
 * The 2px insertion marker a drag would drop onto. Absolutely positioned into
 * the gap above or below its row rather than inserted as a sibling: a sibling
 * reflows every row beneath it the moment it appears, sliding the list out
 * from under the pointer so the marker flickers between two targets. The row
 * it sits in therefore carries `relative`, and this carries
 * `pointer-events-none` so it never swallows the dragover it is describing.
 */
function DropLine({ edge }: { edge: "above" | "below" }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-x-0 h-0.5 rounded-full bg-[var(--accent)]",
        edge === "above" ? "-top-1.5" : "-bottom-1.5",
      )}
    />
  );
}

/**
 * The left pane of the course builder: every module, every item under it, and
 * the controls that change their order.
 *
 * Reorder is the ▲▼ buttons. They move one row one position within its scope —
 * a module among modules, an item within its module — and send the WHOLE
 * outline to `onReorder`, which is what the Backend's reorder endpoint takes.
 * They work with a keyboard, they work on a phone, and they are what the drag
 * layered over them (useOutlineDrag) degrades to. Moving an item to ANOTHER
 * module without dragging is the "Move to module" select in CourseItemEditor,
 * not anything here.
 *
 * Coursera's "lesson" level is a divider, not a record: an item's non-null
 * lessonHeading opens a group, and every item after it belongs to that group
 * until the next heading. So a heading renders above its item's row and the x
 * on it clears that one field. Renaming one is editing the item that carries
 * it, which happens in the item editor.
 */
export function CurriculumOutline({
  tree,
  selected,
  pending,
  onSelect,
  onAddModule,
  onAddItem,
  onSeedFromOutline,
  onReorder,
  onDuplicateModule,
  onDuplicateItem,
  onPublishAllInModule,
  onDeleteModule,
  onDeleteItem,
  onClearLessonHeading,
}: CurriculumOutlineProps) {
  // Keyed by module id, so folding survives the reload every mutation does.
  const [folded, setFolded] = useState<Record<string, boolean>>({});
  const [picking, setPicking] = useState<string | null>(null);

  const drag = useOutlineDrag(tree, onReorder, !pending);

  const isDrop = (zone: "module" | "item" | "module-end", id: string, edge: "above" | "below") =>
    drag.dropTarget?.zone === zone && drag.dropTarget.id === id && drag.dropTarget.edge === edge;

  const outline = () =>
    tree.modules.map((m) => ({ id: m._id, itemIds: m.items.map((i) => i._id) }));

  /** One position among the modules. The whole outline goes up either way —
   * the endpoint renumbers everything it is given. */
  function moveModule(index: number, delta: number) {
    const next = outline();
    const to = index + delta;
    if (to < 0 || to >= next.length) return;
    const [moved] = next.splice(index, 1);
    next.splice(to, 0, moved);
    void onReorder(next);
  }

  /** One position within the module. ▲▼ deliberately do not spill into the
   * neighbouring module at the ends — that is a reparent, and it has its own
   * control in the item editor. */
  function moveItem(moduleIndex: number, itemIndex: number, delta: number) {
    const next = outline();
    const ids = next[moduleIndex].itemIds;
    const to = itemIndex + delta;
    if (to < 0 || to >= ids.length) return;
    const [moved] = ids.splice(itemIndex, 1);
    ids.splice(to, 0, moved);
    void onReorder(next);
  }

  if (tree.modules.length === 0) {
    return (
      <Panel>
        <AdminEmpty
          title="No content yet"
          message="Start with a module — a week, a unit or a theme. Videos, readings and quizzes go inside it."
        />
        <div className="-mt-8 flex flex-wrap items-center justify-center gap-2 px-4 pb-12">
          <Button type="button" size="sm" disabled={pending} onClick={() => void onAddModule()}>
            <Icon name="plus" size={16} />
            Add the first module
          </Button>
          {/* The brochure "Session outline" the public page already shows.
              One way only: this reads Training.modules to bootstrap a
              curriculum, and nothing here ever writes it back. */}
          {tree.training.modules.length > 0 && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={pending}
              onClick={() => void onSeedFromOutline()}
            >
              <Icon name="layers" size={16} />
              Start from the Session outline ({tree.training.modules.length} items)
            </Button>
          )}
        </div>
      </Panel>
    );
  }

  return (
    <Panel className="p-4">
      <div className="flex flex-col gap-3">
        {tree.modules.map((module, moduleIndex) => {
          const open = !folded[module._id];
          const mins = module.items.reduce((sum, i) => sum + i.estimatedMins, 0);
          const moduleSelected = selected?.kind === "module" && selected.id === module._id;
          const moduleDragged =
            drag.dragging?.kind === "module" && drag.dragging.id === module._id;

          return (
            <div
              key={module._id}
              {...drag.handlers.module(module._id)}
              className={cn(
                "group/module relative rounded-[var(--radius-card)] border p-4 transition-colors",
                moduleSelected ? "border-[var(--accent)]" : "border-[var(--border-subtle)]",
                moduleDragged && "opacity-40",
              )}
            >
              {isDrop("module", module._id, "above") && <DropLine edge="above" />}
              {isDrop("module", module._id, "below") && <DropLine edge="below" />}

              {/* The caps "Module 3" label shares its line with the action
                  cluster so the title beneath gets the full card width — at
                  20rem the two cannot sit side by side. */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setFolded((prev) => ({ ...prev, [module._id]: open }))}
                  aria-expanded={open}
                  aria-label={open ? `Collapse ${module.title}` : `Expand ${module.title}`}
                  className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-sunken)] hover:text-[var(--text-primary)]"
                >
                  <Icon
                    name="chevron-down"
                    size={14}
                    className={cn("transition-transform", !open && "-rotate-90")}
                  />
                </button>
                <Icon
                  name="move"
                  size={14}
                  className="shrink-0 cursor-grab text-[var(--text-muted)]"
                />
                <span className="min-w-0 flex-1 truncate text-[0.7rem] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  Module {moduleIndex + 1}
                </span>
                {/* draggable={false} so a mousedown on one of these buttons
                    drags nothing rather than picking the whole card up. */}
                <div className={MODULE_ACTIONS} draggable={false}>
                  <button
                    type="button"
                    disabled={pending || moduleIndex === 0}
                    onClick={() => moveModule(moduleIndex, -1)}
                    aria-label={`Move ${module.title} up`}
                    title="Move up"
                    className={ICON_BUTTON}
                  >
                    {/* There is no chevron-up glyph — it is this one, turned. */}
                    <Icon name="chevron-down" size={15} className="rotate-180" />
                  </button>
                  <button
                    type="button"
                    disabled={pending || moduleIndex === tree.modules.length - 1}
                    onClick={() => moveModule(moduleIndex, 1)}
                    aria-label={`Move ${module.title} down`}
                    title="Move down"
                    className={ICON_BUTTON}
                  >
                    <Icon name="chevron-down" size={15} />
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => void onPublishAllInModule(module._id, !module.published)}
                    aria-label={
                      module.published
                        ? `Unpublish everything in ${module.title}`
                        : `Publish everything in ${module.title}`
                    }
                    title={
                      module.published
                        ? "Unpublish everything in this module"
                        : "Publish everything in this module"
                    }
                    className={ICON_BUTTON}
                  >
                    <Icon name="layers" size={15} />
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => void onDuplicateModule(module._id)}
                    aria-label={`Duplicate ${module.title}`}
                    title="Duplicate"
                    className={ICON_BUTTON}
                  >
                    <Icon name="plus" size={15} />
                  </button>
                  <DeleteButton
                    id={module._id}
                    action={onDeleteModule}
                    label={module.title}
                    consequence={
                      module.items.length === 0
                        ? "This module is empty. Deleting it cannot be undone."
                        : `This also deletes the ${itemCountLabel(module.items.length)} inside it and cannot be undone.`
                    }
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={() => onSelect({ kind: "module", id: module._id })}
                aria-current={moduleSelected || undefined}
                className={cn(
                  "mt-1 block w-full rounded-lg px-2 py-1.5 text-left transition-colors",
                  moduleSelected
                    ? "bg-[var(--accent-soft)] text-[var(--accent-on-soft)]"
                    : "hover:bg-[var(--surface-sunken)]",
                )}
              >
                <span className="block truncate text-sm font-medium">{module.title}</span>
                <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  <Badge tone="neutral">
                    {itemCountLabel(module.items.length)}
                    {mins > 0 && ` · ${formatMins(mins)}`}
                  </Badge>
                  {!module.published && <Badge tone="neutral">Draft</Badge>}
                </span>
              </button>

              {open && (
                <>
                  <div className="mt-2 flex flex-col gap-1 pl-2">
                    {module.items.length === 0 && (
                      <p className="px-2 py-1.5 text-xs text-[var(--text-muted)]">
                        Nothing in this module yet.
                      </p>
                    )}
                    {module.items.map((item, itemIndex) => {
                      const meta = kindMeta(item.kind);
                      const itemSelected = selected?.kind === "item" && selected.id === item._id;
                      const itemDragged =
                        drag.dragging?.kind === "item" && drag.dragging.id === item._id;

                      return (
                        <div
                          key={item._id}
                          {...drag.handlers.item(item._id)}
                          className={cn(
                            "group/item relative rounded-lg transition-colors",
                            itemDragged ? "opacity-40" : !item.published && "opacity-60",
                          )}
                        >
                          {isDrop("item", item._id, "above") && <DropLine edge="above" />}
                          {isDrop("item", item._id, "below") && <DropLine edge="below" />}

                          {/* The divider belongs to the item below it and
                              travels with it, so it lives inside the same row
                              the drop marker brackets. */}
                          {item.lessonHeading !== null && (
                            <div className="group/heading flex items-center gap-1.5 px-2 pb-0.5 pt-1">
                              <span className="min-w-0 flex-1 truncate text-[0.7rem] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                                {item.lessonHeading}
                              </span>
                              <button
                                type="button"
                                draggable={false}
                                disabled={pending}
                                onClick={() => void onClearLessonHeading(item._id)}
                                aria-label={`Remove the lesson heading “${item.lessonHeading}”`}
                                title="Remove this lesson heading"
                                className="grid h-5 w-5 shrink-0 place-items-center rounded text-[var(--text-muted)] transition-opacity hover:text-red-600 disabled:pointer-events-none disabled:opacity-40 lg:opacity-0 lg:group-hover/heading:opacity-100 lg:group-focus-within/heading:opacity-100 dark:hover:text-red-400"
                              >
                                <Icon name="x" size={12} />
                              </button>
                            </div>
                          )}

                          <div
                            className={cn(
                              "flex items-center gap-1 rounded-lg pr-1 transition-colors",
                              itemSelected
                                ? "bg-[var(--accent-soft)] text-[var(--accent-on-soft)]"
                                : "hover:bg-[var(--surface-sunken)]",
                            )}
                          >
                            <button
                              type="button"
                              onClick={() => onSelect({ kind: "item", id: item._id })}
                              aria-current={itemSelected || undefined}
                              className="flex min-w-0 flex-1 items-start gap-2 rounded-lg px-2 py-1.5 text-left"
                            >
                              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-[var(--accent-soft)] text-[var(--accent-on-soft)]">
                                <Icon name={meta.icon} size={14} />
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="flex items-baseline gap-2">
                                  <span className="min-w-0 flex-1 truncate text-sm">
                                    {item.title}
                                  </span>
                                  <span className="shrink-0 text-xs text-[var(--text-muted)]">
                                    {formatMins(item.estimatedMins)}
                                  </span>
                                </span>
                                {(item.graded || item.previewFree) && (
                                  <span className="mt-1 flex flex-wrap items-center gap-1.5">
                                    {item.graded && <Badge tone="warn">{item.gradeWeight}%</Badge>}
                                    {item.previewFree && <Badge tone="accent">Preview</Badge>}
                                  </span>
                                )}
                              </span>
                            </button>
                            <div className={ITEM_ACTIONS} draggable={false}>
                              <button
                                type="button"
                                disabled={pending || itemIndex === 0}
                                onClick={() => moveItem(moduleIndex, itemIndex, -1)}
                                aria-label={`Move ${item.title} up`}
                                title="Move up"
                                className={ICON_BUTTON}
                              >
                                <Icon name="chevron-down" size={15} className="rotate-180" />
                              </button>
                              <button
                                type="button"
                                disabled={pending || itemIndex === module.items.length - 1}
                                onClick={() => moveItem(moduleIndex, itemIndex, 1)}
                                aria-label={`Move ${item.title} down`}
                                title="Move down"
                                className={ICON_BUTTON}
                              >
                                <Icon name="chevron-down" size={15} />
                              </button>
                              <button
                                type="button"
                                disabled={pending}
                                onClick={() => void onDuplicateItem(item._id)}
                                aria-label={`Duplicate ${item.title}`}
                                title="Duplicate"
                                className={ICON_BUTTON}
                              >
                                <Icon name="plus" size={15} />
                              </button>
                              <DeleteButton
                                id={item._id}
                                action={onDeleteItem}
                                label={item.title}
                                consequence="This deletes the item and everything on it — questions, attachments and all — and cannot be undone."
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Also the drop strip for the tail of this module — the
                      only way to drag an item into one holding none. */}
                  <div
                    className="relative mt-3 flex flex-col gap-2"
                    {...drag.handlers.moduleEnd(module._id)}
                  >
                    {isDrop("module-end", module._id, "below") && <DropLine edge="above" />}
                    {picking === module._id ? (
                      <>
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-[0.7rem] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                            Add an item
                          </p>
                          <button
                            type="button"
                            onClick={() => setPicking(null)}
                            aria-label="Close the item picker"
                            className="grid h-7 w-7 place-items-center rounded-md text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-sunken)] hover:text-[var(--text-primary)]"
                          >
                            <Icon name="x" size={14} />
                          </button>
                        </div>
                        {/* Expand-in-place rather than a dialog: this admin has
                            no Dialog primitive and CouponsPanel already set the
                            convention. Choosing a kind creates the item and
                            selects it, so you are typing one click later. */}
                        <div className="grid gap-2">
                          {ITEM_KINDS.map((kind) => (
                            <button
                              key={kind.kind}
                              type="button"
                              disabled={pending}
                              onClick={() => {
                                setPicking(null);
                                void onAddItem(module._id, kind.kind);
                              }}
                              className={CHOICE_CARD}
                            >
                              <Icon name={kind.icon} size={22} className="text-[var(--accent)]" />
                              <span className="font-semibold text-[var(--text-primary)]">
                                {kind.label}
                              </span>
                              <span className="text-sm text-[var(--text-muted)]">{kind.blurb}</span>
                            </button>
                          ))}
                        </div>
                      </>
                    ) : (
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => setPicking(module._id)}
                        className={ADD_ITEM_BUTTON}
                      >
                        <Icon name="plus" size={14} />
                        Add item
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-4">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={pending}
          onClick={() => void onAddModule()}
        >
          <Icon name="plus" size={14} />
          Add module
        </Button>
      </div>
    </Panel>
  );
}
