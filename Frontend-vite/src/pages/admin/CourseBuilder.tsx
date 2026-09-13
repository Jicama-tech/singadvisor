import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { AdminEmpty, PageHeading, Panel } from "@/components/admin/AdminUI";
import { CourseItemEditor, ModuleEditor } from "@/components/admin/CourseItemEditor";
import {
  CurriculumOutline,
  type OutlineSelection,
} from "@/components/admin/CurriculumOutline";
import TrainingsShell from "@/components/admin/TrainingsShell";
import { FormError } from "@/components/forms/FormShell";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { formatMins, kindMeta, type CourseItemKind } from "@/lib/course-content";
import {
  createItem,
  createModule,
  deleteItem,
  deleteModule,
  duplicateItem,
  duplicateModule,
  fetchCurriculum,
  publishAllInModule,
  reorderOutline,
  seedFromOutline,
  updateItem,
  updateModule,
  type CourseItemDoc,
  type CourseItemInput,
  type CourseModuleDoc,
  type CourseModuleInput,
  type CurriculumTree,
} from "@/lib/courseContentClient";
import { formatDuration } from "@/lib/utils";

/**
 * /admin/trainings/content/:id — the course builder.
 *
 * This page owns ALL of the state: the tree, which record is selected, the
 * editing draft of it, the pristine copy that draft was forked from, whether
 * the two have diverged, whether a write is in flight, the last error, and the
 * Edit|Preview mode. CurriculumOutline and the two editors below it are
 * presentational — they render what they are given and call back.
 *
 * Every mutation awaits its client call and then reloads the whole tree. The
 * Backend renumbers sortOrder, migrates lesson headings when an item leaves a
 * module, and refuses incoherent writes, so guessing at the new shape locally
 * would be guessing wrong; what the screen shows after a write is what the
 * server now holds.
 *
 * There is no autosave, and that is the load-bearing decision here. Every
 * other editor in this admin is an AdminForm with a Save button; a debounced
 * patch dropped by a selection change would be silent data loss on the one
 * screen with no Save button to fall back on. So each pane saves explicitly,
 * a selection change while dirty asks first, a click out of the builder asks
 * the same question, and a reload while dirty warns.
 */

/** The editing copy of whichever record the outline has selected, and the
 * shape `baseline` holds alongside it. The draft is the server's row until the
 * first keystroke and diverges from the tree from then until Save or Discard;
 * the baseline stays where it was forked, and Save is the difference between
 * the two. Both are only ever REPLACED, never mutated in place — the editors
 * below rebuild every array and object they touch — so the two can safely be
 * seeded from one value. */
type Draft =
  | { kind: "module"; value: CourseModuleDoc }
  | { kind: "item"; value: CourseItemDoc };

/** The one question this screen asks about unsaved work. Shared, so the two
 * places that have to ask it — a selection change and a click out of the
 * builder — ask it in the same words. */
const DISCARD_PROMPT = "You have unsaved changes to this item. Discard them?";

/** Badge's `warn` tokens as a block rather than a pill — the publish-all
 * report is a list of sentences, and this app has no callout primitive. */
const warnNote =
  "rounded-xl bg-amber-50 px-4 py-3 text-xs text-amber-800 ring-1 ring-inset ring-amber-200 dark:bg-amber-950/50 dark:text-amber-200 dark:ring-amber-800/60";

/**
 * A module row without its items. The tree carries the two together, but the
 * module editor only ever writes the module's own fields — keeping a copy of
 * the item list in the draft would freeze a stale outline into the next save.
 */
function moduleDraft(row: CurriculumTree["modules"][number]): CourseModuleDoc {
  return {
    _id: row._id,
    trainingId: row.trainingId,
    sortOrder: row.sortOrder,
    title: row.title,
    summary: row.summary,
    published: row.published,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/** The three fields UpdateCourseModuleDto declares. A module's items are not
 * among them — they are rows of their own, reordered through the outline. */
const MODULE_WRITABLE: readonly (keyof CourseModuleDoc & keyof CourseModuleInput)[] = [
  "title",
  "summary",
  "published",
];

/**
 * Exactly the fields UpdateCourseItemDto declares, spelled out rather than read
 * off the draft's own keys. The global ValidationPipe runs with
 * `whitelist: true`, so an undeclared key is stripped in silence — but
 * `sortOrder` IS declared, and posting the copy this tab happens to hold would
 * undo a reorder made anywhere else. `kind` is not writable at all: an item's
 * payload fields would be nonsense under a different one.
 */
const ITEM_WRITABLE: readonly (keyof CourseItemDoc & keyof CourseItemInput)[] = [
  "title",
  "summary",
  "lessonHeading",
  "estimatedMins",
  "releaseRule",
  "releaseOnDay",
  "optional",
  "previewFree",
  "published",
  "graded",
  "gradeWeight",
  "passMarkPct",
  "videoUrl",
  "videoProvider",
  "body",
  "questions",
  "attemptsAllowed",
  "shuffleQuestions",
  "submissionType",
  "dueOnDay",
  "attachments",
];

/**
 * The listed keys whose value differs between the draft and the row it was
 * forked from — the payload of a Save.
 *
 * By VALUE, not by identity: QuizQuestionsEditor and AttachmentsEditor rebuild
 * their whole array on every keystroke, so `questions` and `attachments` are a
 * fresh reference even on a draft nobody has touched, and an identity check
 * would call every item changed.
 *
 * JSON is comparison enough here. Both records came out of the same response
 * and every edit since has been a spread, so key order is stable and there are
 * no dates, no cycles and no undefined. The one way it can be wrong is by
 * calling two equal values different, which costs a field being written back
 * as it already was — never an edit being dropped.
 */
function changedFields<T extends object, K extends keyof T>(
  draft: T,
  baseline: T,
  keys: readonly K[],
): Partial<Pick<T, K>> {
  const patch: Partial<Pick<T, K>> = {};
  for (const key of keys) {
    if (JSON.stringify(draft[key]) !== JSON.stringify(baseline[key])) {
      patch[key] = draft[key];
    }
  }
  return patch;
}

export default function CourseBuilder() {
  const { user } = useAuth();
  const { id: trainingId = "" } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [tree, setTree] = useState<CurriculumTree | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  // The record as the server last handed it over. Save posts the difference
  // between this and the draft, so a field the operator never touched is left
  // alone by the write — see handleSave.
  const [baseline, setBaseline] = useState<Draft | null>(null);
  const [dirty, setDirty] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [skipped, setSkipped] = useState<{ title: string; reason: string }[]>([]);
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const editorRef = useRef<HTMLDivElement>(null);
  // Which record the draft was seeded from, so a reload can tell "the operator
  // moved to another row" from "the tree came back after a write".
  const seededFor = useRef<string | null>(null);

  const selectedId = searchParams.get("item");

  /**
   * One query param covers both kinds: an id resolves to whichever collection
   * holds it, so ?item= is enough to make a builder screen linkable and to
   * survive a refresh — and a row deleted out from under it simply stops
   * resolving, which is exactly the right outcome.
   */
  const selected = useMemo<OutlineSelection>(() => {
    if (!tree || !selectedId) return null;
    if (tree.modules.some((m) => m._id === selectedId)) {
      return { kind: "module", id: selectedId };
    }
    const isItem = tree.modules.some((m) => m.items.some((i) => i._id === selectedId));
    return isItem ? { kind: "item", id: selectedId } : null;
  }, [tree, selectedId]);

  /** Re-reads the whole tree after a write. See the file docblock for why
   * nothing here is patched in place. */
  const reload = useCallback(async () => {
    setTree(await fetchCurriculum(trainingId));
  }, [trainingId]);

  useEffect(() => {
    // Clearing first matters: the Content tab links straight from one course
    // to another, and this page stays mounted across that, so without it the
    // previous course's outline renders for a frame under the new id.
    setTree(null);
    setError(null);
    let cancelled = false;
    void (async () => {
      try {
        const next = await fetchCurriculum(trainingId);
        if (!cancelled) setTree(next);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not open this course.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [trainingId]);

  useEffect(() => {
    if (!tree || !selected) {
      seededFor.current = null;
      setDraft(null);
      setBaseline(null);
      setDirty(false);
      return;
    }
    // Every mutation reloads the whole tree, including ones with nothing to do
    // with the open record — a reorder, a duplicate, a publish-all on another
    // module. Reseeding on those would throw away whatever is half-typed, so
    // the draft is replaced only when the selection actually moved, or when
    // there is nothing unsaved to lose.
    const moved = seededFor.current !== selected.id;
    if (!moved && dirty) return;

    // One seed for both: the draft starts life identical to the baseline, and
    // neither is ever mutated in place, so there is nothing to keep apart.
    // This is also where a successful save resets the baseline a second time —
    // clearing `dirty` lets this effect run against the tree the write
    // returned.
    let seed: Draft;
    if (selected.kind === "module") {
      const row = tree.modules.find((m) => m._id === selected.id);
      if (!row) return;
      seed = { kind: "module", value: moduleDraft(row) };
    } else {
      const row = tree.modules.flatMap((m) => m.items).find((i) => i._id === selected.id);
      if (!row) return;
      seed = { kind: "item", value: { ...row } };
    }
    setDraft(seed);
    setBaseline(seed);
    // A newly opened record opens in Edit; a save leaves Preview where it was.
    if (moved) setMode("edit");
    seededFor.current = selected.id;
    setDirty(false);
  }, [tree, selected, dirty]);

  /**
   * The way out of this screen that is not a selection change, guarded in two
   * halves because the two kinds of exit are nothing alike.
   *
   * `beforeunload` covers a real unload — a reload, the browser Back button,
   * closing the tab, a link to another origin — and the browser writes its own
   * wording.
   *
   * Everything else is an in-app <Link>: the Trainings nested nav this page
   * renders around itself (Courses, Facilitators, Content), AdminShell's
   * primary sidebar, "Course settings" in this page's own heading. None of
   * those unloads anything — they swap the route, unmount the builder and take
   * the draft with it, silently. React Router's useBlocker is the tool for
   * exactly this and is NOT available: it reads the data-router context, and
   * App.tsx mounts <BrowserRouter> + <Routes>, so calling it here throws. So
   * the click is caught instead, on document in the CAPTURE phase — ahead of
   * the Link's own handler, which React attaches at the root below. Only
   * anchors are looked at, and every control the builder owns is a <button>,
   * so none of them can reach this.
   */
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // Chrome still needs returnValue set for its own prompt to appear.
      e.returnValue = "";
    };
    const guardLinks = (e: MouseEvent) => {
      // A modified or non-primary click opens a second tab or a context menu,
      // and something upstream that has already cancelled the event is not
      // navigating either.
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      if (e.defaultPrevented) return;
      const link = e.target instanceof Element ? e.target.closest("a[href]") : null;
      // Not HTMLAnchorElement is an SVG <a>, which has none of the properties
      // below — and nothing in this admin is one.
      if (!(link instanceof HTMLAnchorElement)) return;
      // A new tab and a download both leave this page standing, and another
      // origin is an unload, which the handler above already asks about.
      if (link.download || (link.target && link.target !== "_self")) return;
      if (link.origin !== window.location.origin) return;
      // A link back to where we already are changes nothing — including the
      // ?item= this page writes its own selection into.
      if (
        link.pathname === window.location.pathname &&
        link.search === window.location.search
      ) {
        return;
      }
      if (confirm(DISCARD_PROMPT)) {
        // Agreed to: let the click run on. The draft goes with the unmount,
        // and clearing the flag now stops this guard re-arming on the way out.
        setDirty(false);
        return;
      }
      // Refused. Cancelling in the capture phase means the Link's own handler
      // never runs, so the route does not move and the draft stays put.
      e.preventDefault();
      e.stopPropagation();
    };
    window.addEventListener("beforeunload", warn);
    document.addEventListener("click", guardLinks, true);
    return () => {
      window.removeEventListener("beforeunload", warn);
      document.removeEventListener("click", guardLinks, true);
    };
  }, [dirty]);

  /**
   * Every mutation goes through here: one place that flags the write, clears
   * the last message, surfaces the Backend's own words on a refusal, and
   * re-reads the tree. Returns whether the write actually landed, because a
   * refused save has to leave the draft dirty — the work is still on screen
   * and the message is about fixing it.
   *
   * Some of these endpoints already hand the new tree back (reorder,
   * duplicate, seed-from-outline, publish-all). Re-reading anyway keeps one
   * path through this screen and picks up anything that changed beside it.
   */
  async function run(mutate: () => Promise<unknown>): Promise<boolean> {
    setPending(true);
    setError(null);
    setSkipped([]);
    try {
      await mutate();
      await reload();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "That change could not be saved.");
      return false;
    } finally {
      setPending(false);
    }
  }

  /** The dirty guard for a selection change — the moment unsaved work would
   * disappear inside the builder. Leaving it entirely is the effect above. */
  function confirmDiscard(): boolean {
    return !dirty || confirm(DISCARD_PROMPT);
  }

  /** Below lg the two panes stack, outline first — so selecting a row on a
   * phone otherwise changes something a whole screen further down. */
  function scrollEditorIntoView() {
    if (window.matchMedia("(min-width: 1024px)").matches) return;
    editorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  /** Moves the selection without asking — for the rows this page has just
   * created, where the operator's edits were already dealt with. */
  function openRecord(id: string) {
    const next = new URLSearchParams(searchParams);
    next.set("item", id);
    // Replace rather than push: Back should leave the builder, not walk one
    // row at a time back through everything that was clicked inside it.
    setSearchParams(next, { replace: true });
  }

  function clearSelection() {
    setDirty(false);
    const next = new URLSearchParams(searchParams);
    next.delete("item");
    setSearchParams(next, { replace: true });
  }

  function handleSelect(sel: NonNullable<OutlineSelection>) {
    if (!confirmDiscard()) return;
    setDirty(false);
    openRecord(sel.id);
    scrollEditorIntoView();
  }

  function handleChangeModule(patch: Partial<CourseModuleDoc>) {
    setDraft((prev) =>
      prev?.kind === "module" ? { kind: "module", value: { ...prev.value, ...patch } } : prev,
    );
    setDirty(true);
  }

  function handleChangeItem(patch: Partial<CourseItemDoc>) {
    setDraft((prev) =>
      prev?.kind === "item" ? { kind: "item", value: { ...prev.value, ...patch } } : prev,
    );
    setDirty(true);
  }

  /** Reseeding is the effect above's job — clearing `dirty` is what lets it
   * run again, and it reads the record straight back off the tree. */
  function handleDiscard() {
    setDirty(false);
  }

  /**
   * Saves the DIFFERENCE, never the whole draft.
   *
   * Other controls on this screen write to the very record this pane has open:
   * publish-all flips `published` on every item in a module, and a
   * cross-module move makes the Backend hand an item's lesson heading to the
   * row it left behind. The reload after each of those deliberately leaves a
   * dirty draft alone (see the seeding effect), so the draft still holds the
   * copy it forked BEFORE any of that — and PATCHing all of it would post
   * those stale fields back and quietly undo the server's write: the module
   * un-publishes, the bequeathed heading vanishes.
   *
   * UpdateCourse*Dto are PartialTypes and the service copies only the keys
   * actually sent (pickFields), so a payload of just what the operator typed
   * is exactly right — everything else stays as the server now holds it. The
   * response is the whole saved record, which becomes the new baseline without
   * waiting for the reload behind it.
   *
   * An empty difference is a real outcome — a character typed and deleted
   * again — and there is nothing to write, so the pane just stops being dirty.
   */
  async function handleSave() {
    if (!draft || !baseline) return;

    // The two are seeded together from one row in one pass, so their kinds can
    // never disagree — each still has to be narrowed for the diff to be typed
    // against a single record shape.
    let changed: object;
    let write: () => Promise<void>;
    if (draft.kind === "module" && baseline.kind === "module") {
      const patch = changedFields(draft.value, baseline.value, MODULE_WRITABLE);
      const { _id } = draft.value;
      changed = patch;
      write = async () => {
        setBaseline({ kind: "module", value: await updateModule(_id, patch) });
      };
    } else if (draft.kind === "item" && baseline.kind === "item") {
      const patch = changedFields(draft.value, baseline.value, ITEM_WRITABLE);
      const { _id } = draft.value;
      changed = patch;
      write = async () => {
        setBaseline({ kind: "item", value: await updateItem(_id, patch) });
      };
    } else {
      return;
    }

    if (Object.keys(changed).length === 0) {
      setDirty(false);
      return;
    }
    if (await run(write)) setDirty(false);
  }

  async function handleAddModule() {
    if (!confirmDiscard()) return;
    setDirty(false);
    await run(async () => {
      const created = await createModule(trainingId, { title: "Untitled module" });
      openRecord(created._id);
    });
  }

  async function handleAddItem(moduleId: string, kind: CourseItemKind) {
    if (!confirmDiscard()) return;
    setDirty(false);
    await run(async () => {
      // Titled rather than left blank: the outline row has to say something,
      // and the editor opens with the title field first so it can be replaced
      // one click after choosing the kind.
      const created = await createItem(moduleId, {
        kind,
        title: `Untitled ${kindMeta(kind).label.toLowerCase()}`,
      });
      openRecord(created._id);
    });
    scrollEditorIntoView();
  }

  async function handleSeedFromOutline() {
    await run(() => seedFromOutline(trainingId));
  }

  async function handleReorder(modules: { id: string; itemIds: string[] }[]) {
    await run(() => reorderOutline(trainingId, { modules }));
  }

  async function handleDuplicateModule(moduleId: string) {
    await run(() => duplicateModule(moduleId));
  }

  async function handleDuplicateItem(itemId: string) {
    await run(() => duplicateItem(itemId));
  }

  async function handlePublishAllInModule(moduleId: string, published: boolean) {
    await run(async () => {
      const result = await publishAllInModule(moduleId, published);
      // Partial by design: refusing forty items because item seven has no
      // video link would be the wrong tool. What was refused has to be said
      // out loud, or a half-done publish looks like a finished one.
      setSkipped(result.skipped);
    });
  }

  async function handleDeleteModule(moduleId: string) {
    // The module takes its items with it, so a selection pointing at anything
    // inside it has to go too.
    const doomed = tree?.modules.find((m) => m._id === moduleId);
    const selectionGoes =
      selectedId === moduleId || !!doomed?.items.some((i) => i._id === selectedId);
    await run(async () => {
      await deleteModule(moduleId);
      if (selectionGoes) clearSelection();
    });
  }

  async function handleDeleteItem(itemId: string) {
    await run(async () => {
      await deleteItem(itemId);
      if (selectedId === itemId) clearSelection();
    });
  }

  /**
   * Mirrors a write straight into the open draft AND into the baseline behind
   * it. Both writes that need this — clearing a lesson heading, moving an item
   * to another module — are fired from a control outside the Save button, so
   * the reload that follows deliberately leaves a dirty draft alone.
   *
   * The draft copy keeps the pane showing what was just written. The baseline
   * copy is what keeps "this is the server's row" true of it: the field has
   * already landed, so the next Save must not carry it along as though the
   * operator had typed it.
   */
  function patchOpenItem(itemId: string, patch: Partial<CourseItemDoc>) {
    const mirror = (prev: Draft | null): Draft | null =>
      prev?.kind === "item" && prev.value._id === itemId
        ? { kind: "item", value: { ...prev.value, ...patch } }
        : prev;
    setDraft(mirror);
    setBaseline(mirror);
  }

  async function handleClearLessonHeading(itemId: string) {
    if (await run(() => updateItem(itemId, { lessonHeading: null }))) {
      patchOpenItem(itemId, { lessonHeading: null });
    }
  }

  async function handleMoveToModule(itemId: string, moduleId: string) {
    if (!tree) return;
    // Reparenting is not a field on the item: UpdateCourseItemDto declares no
    // courseModuleId, because which module an item sits in is part of the
    // outline's shape rather than the item's payload. So a move is a reorder —
    // which is also where the Backend hands any lesson heading the item was
    // carrying to the row it leaves behind.
    const modules = tree.modules.map((m) => ({
      id: m._id,
      itemIds: m.items.map((i) => i._id).filter((id) => id !== itemId),
    }));
    const destination = modules.find((m) => m.id === moduleId);
    if (!destination) return;
    destination.itemIds.push(itemId);
    if (await run(() => reorderOutline(trainingId, { modules }))) {
      patchOpenItem(itemId, { courseModuleId: moduleId });
    }
  }

  if (!user) return null;

  // Nothing loaded and nothing still loading: a bad id 404s, and so does a
  // course deleted from another tab. The nested nav stays wrapped around it
  // either way, so the way back to the list is one click.
  if (!tree && error) {
    return (
      <TrainingsShell>
        <div className="flex flex-col gap-8">
          <PageHeading title="Course content" description="This course could not be opened." />
          <FormError state={{ ok: false, message: error }} />
          <Panel>
            <AdminEmpty
              title="Nothing to build"
              message="Pick a course from the Content tab to start building its curriculum."
            />
          </Panel>
        </div>
      </TrainingsShell>
    );
  }

  // First load. Blank under the heading rather than a spinner — the shell and
  // the nested nav are already on screen, which is what every other admin page
  // does while it waits.
  if (!tree) {
    return (
      <TrainingsShell>
        <div className="flex flex-col gap-8">
          <PageHeading title="Course content" description="Loading the curriculum…" />
        </div>
      </TrainingsShell>
    );
  }

  const { training, totals } = tree;

  /**
   * Curriculum minutes and the brochure's durationHrs measure different things
   * and are never summed — but a course whose content runs to 90 minutes while
   * its public page promises 8 hours is something somebody should see. 20% is
   * wide enough that rounding and a little editorial slack do not trip it.
   * Only once there is content to compare: an empty curriculum has not drifted
   * from anything. The builder says so and never writes durationHrs.
   */
  const drifted =
    totals.totalMins > 0 &&
    Math.abs(totals.totalMins / 60 - training.durationHrs) /
      Math.max(training.durationHrs, 1) >
      0.2;

  return (
    <TrainingsShell>
      <div className="flex flex-col gap-8">
        <PageHeading
          title={training.title}
          description={`${totals.moduleCount} module${totals.moduleCount === 1 ? "" : "s"} · ${totals.itemCount} item${totals.itemCount === 1 ? "" : "s"} · ${formatMins(totals.totalMins)}`}
          action={
            <div className="flex flex-wrap items-center gap-2">
              {dirty ? (
                <Badge tone="warn">Unsaved changes</Badge>
              ) : (
                draft && <span className="text-xs text-[var(--text-muted)]">All changes saved</span>
              )}
              {totals.gradeWeightTotal > 0 && (
                <Badge tone={totals.gradeWeightTotal === 100 ? "success" : "warn"}>
                  {totals.gradeWeightTotal}% graded
                </Badge>
              )}
              {drifted && (
                <Badge tone="warn">Brochure says {formatDuration(training.durationHrs)}</Badge>
              )}
              <ButtonLink to={`/admin/trainings/${training._id}`} variant="secondary" size="sm">
                Course settings
              </ButtonLink>
              <ButtonLink
                to={`/trainings/${training.slug}`}
                target="_blank"
                variant="ghost"
                size="sm"
              >
                <Icon name="external" size={16} />
                View page
              </ButtonLink>
            </div>
          }
        />

        {error && <FormError state={{ ok: false, message: error }} />}

        {skipped.length > 0 && (
          <div className={warnNote}>
            <p className="font-medium">
              Some items stayed unpublished because they are not finished yet.
            </p>
            <ul className="mt-1.5 flex flex-col gap-1">
              {skipped.map((row, i) => (
                <li key={`${row.title}-${i}`}>
                  <span className="font-medium">{row.title}</span> — {row.reason}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          {/* The primary sidebar and the nested nav are both icon-width on
              every /admin/trainings route, which is what makes a third column
              fit from lg up. Sticky, so the outline stays put while a long
              item editor scrolls beside it; below lg the two simply stack. */}
          <div className="lg:sticky lg:top-24 lg:max-h-[calc(100vh-10rem)] lg:w-[20rem] lg:shrink-0 lg:overflow-y-auto">
            <CurriculumOutline
              tree={tree}
              selected={selected}
              pending={pending}
              onSelect={handleSelect}
              onAddModule={handleAddModule}
              onAddItem={handleAddItem}
              onSeedFromOutline={handleSeedFromOutline}
              onReorder={handleReorder}
              onDuplicateModule={handleDuplicateModule}
              onDuplicateItem={handleDuplicateItem}
              onPublishAllInModule={handlePublishAllInModule}
              onDeleteModule={handleDeleteModule}
              onDeleteItem={handleDeleteItem}
              onClearLessonHeading={handleClearLessonHeading}
            />
          </div>

          <div ref={editorRef} className="min-w-0 flex-1 scroll-mt-20">
            {draft?.kind === "module" ? (
              <ModuleEditor
                module={draft.value}
                itemCount={
                  tree.modules.find((m) => m._id === draft.value._id)?.items.length ?? 0
                }
                dirty={dirty}
                pending={pending}
                onChange={handleChangeModule}
                onSave={handleSave}
                onDiscard={handleDiscard}
                onDelete={handleDeleteModule}
              />
            ) : draft?.kind === "item" ? (
              <CourseItemEditor
                item={draft.value}
                tree={tree}
                dirty={dirty}
                pending={pending}
                mode={mode}
                onModeChange={setMode}
                onChange={handleChangeItem}
                onSave={handleSave}
                onDiscard={handleDiscard}
                onDelete={handleDeleteItem}
                onMoveToModule={handleMoveToModule}
              />
            ) : (
              <Panel>
                <AdminEmpty
                  title="Nothing selected"
                  message="Pick a module or an item in the outline to edit it."
                />
              </Panel>
            )}
          </div>
        </div>
      </div>
    </TrainingsShell>
  );
}
