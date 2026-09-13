import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { uploadCourseMedia } from "@/adminActions";
import { FormSection } from "@/components/admin/AdminForm";
import { Panel } from "@/components/admin/AdminUI";
import { AttachmentsEditor } from "@/components/admin/AttachmentsEditor";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { ItemPreview, VideoEmbed } from "@/components/admin/ItemPreview";
import { QuizQuestionsEditor } from "@/components/admin/QuizQuestionsEditor";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { kindMeta, RELEASE_RULE_LABELS, SUBMISSION_TYPE_LABELS } from "@/lib/course-content";
import type {
  CourseItemDoc,
  CourseModuleDoc,
  CurriculumTree,
} from "@/lib/courseContentClient";
import { cn } from "@/lib/utils";

/**
 * The right-hand pane of the course builder: whichever module or item the
 * outline has selected, opened for editing.
 *
 * Both exports are controlled and stateless about the record itself —
 * CourseBuilder owns the draft, passes it down, and receives a patch back.
 * Neither calls the Backend except for the two upload controls, which have to
 * store a path in the draft before anything is saved.
 *
 * There is no autosave. Every other editor in this admin is an AdminForm with
 * a Save button, and a debounced patch dropped by a selection change would be
 * silent data loss on the one screen that has no Save button to fall back on —
 * so each pane has an explicit Save and a ghost Discard, and CourseBuilder
 * guards selection changes and reloads while `dirty`.
 */

/** A cleared number input reads as "", which Number() would turn into NaN.
 * Zero is the floor of every required numeric field here (minutes, percent,
 * points, attempts), so an empty box means zero. */
const toNumber = (value: string) => (value === "" ? 0 : Number(value));

/** The two day offsets are nullable: empty means "no rule", not "day zero". */
const toDay = (value: string) => (value === "" ? null : Number(value));

/** The three kinds that are the same thing to the editor and to the renderer —
 * one `body` field, one <ArticleBody> — differing only in what the author is
 * being asked to write. */
const BODY_COPY = {
  reading: {
    title: "Reading",
    description: "Formatted text with images and links.",
    label: "Reading",
    placeholder: "Write the reading…",
  },
  assignment: {
    title: "Assignment",
    description: "The brief learners submit work against.",
    label: "Brief",
    placeholder: "What are they being asked to produce?",
  },
  discussion: {
    title: "Discussion",
    description: "The prompt the cohort answers.",
    label: "Prompt",
    placeholder: "What should the cohort discuss?",
  },
} as const;

/** Badge's `warn` tokens as a paragraph rather than a pill — the uploaded-video
 * caveat is a sentence, and there is no callout primitive in this app. */
const warnNote =
  "rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800 ring-1 ring-inset ring-amber-200 dark:bg-amber-950/50 dark:text-amber-200 dark:ring-amber-800/60";

export function ModuleEditor({
  module,
  itemCount,
  dirty,
  pending,
  onChange,
  onSave,
  onDiscard,
  onDelete,
}: {
  module: CourseModuleDoc;
  itemCount: number;
  dirty: boolean;
  pending: boolean;
  onChange: (patch: Partial<CourseModuleDoc>) => void;
  onSave: () => void | Promise<void>;
  onDiscard: () => void;
  onDelete: (id: string) => Promise<void>;
}) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Badge tone="neutral">
          <Icon name="layers" size={13} />
          Module
        </Badge>
        <EditorActions dirty={dirty} pending={pending} onSave={onSave} onDiscard={onDiscard} />
      </div>

      <FormSection
        title="Module"
        description="A week, a unit or a theme. Videos, readings and quizzes go inside it."
      >
        <Field label="Title" htmlFor="m-title" required>
          <Input
            id="m-title"
            value={module.title}
            onChange={(e) => onChange({ title: e.target.value })}
            placeholder="Where your week actually goes"
          />
        </Field>

        <Field
          label="Summary"
          htmlFor="m-summary"
          hint="The blurb shown above this module's item list."
        >
          <Textarea
            id="m-summary"
            rows={3}
            value={module.summary}
            onChange={(e) => onChange({ summary: e.target.value })}
          />
        </Field>
      </FormSection>

      <FormSection title="Visibility">
        <CheckboxRow
          label="Visible on the course page"
          hint="An unpublished module and everything inside it stays out of every public read, so a week can be built over several sittings."
          checked={module.published}
          onChange={(published) => onChange({ published })}
        />

        <DeleteRow
          id={module._id}
          label={module.title || "Untitled module"}
          caption="Delete this module"
          consequence={`This also deletes the ${itemCount} item${itemCount === 1 ? "" : "s"} inside it and cannot be undone.`}
          onDelete={onDelete}
        />
      </FormSection>
    </div>
  );
}

export function CourseItemEditor({
  item,
  tree,
  dirty,
  pending,
  mode,
  onModeChange,
  onChange,
  onSave,
  onDiscard,
  onDelete,
  onMoveToModule,
}: {
  item: CourseItemDoc;
  tree: CurriculumTree;
  dirty: boolean;
  pending: boolean;
  mode: "edit" | "preview";
  onModeChange: (mode: "edit" | "preview") => void;
  onChange: (patch: Partial<CourseItemDoc>) => void;
  onSave: () => void | Promise<void>;
  onDiscard: () => void;
  onDelete: (id: string) => Promise<void>;
  onMoveToModule: (itemId: string, moduleId: string) => void | Promise<void>;
}) {
  const meta = kindMeta(item.kind);
  const videoInputRef = useRef<HTMLInputElement>(null);
  // Scoped to an item id rather than held as a bare flag: CourseBuilder swaps
  // the `item` prop in place when the selection changes, so an unscoped one
  // would leak an open heading input — or another item's upload error — onto
  // whichever item is selected next.
  const [headingOpenFor, setHeadingOpenFor] = useState<string | null>(null);
  const [uploadingFor, setUploadingFor] = useState<string | null>(null);
  const [videoError, setVideoError] = useState<{ itemId: string; message: string } | null>(
    null,
  );

  // Which item this pane is showing right now, for an upload still on the wire
  // to check itself against when it lands. Null while none is: selecting a
  // module unmounts this pane, and an upload resolving into that gap must not
  // patch anything either. Maintained in an effect rather than assigned during
  // render so the unmount cleanup is the last word — and so StrictMode's
  // setup/cleanup/setup pass ends on the id rather than on the null.
  const openItemId = useRef<string | null>(item._id);
  useEffect(() => {
    openItemId.current = item._id;
    return () => {
      openItemId.current = null;
    };
  }, [item._id]);

  /** The course-wide graded total, with this item's DRAFT weight standing in
   * for its saved one — the warning has to track what is being typed, not what
   * the last reload returned. The Backend deliberately does not reject a total
   * other than 100: every intermediate state of a legitimate re-weighting is
   * invalid, so this is a nudge and never a block. */
  const gradedTotal = useMemo(() => {
    const total = tree.modules
      .flatMap((m) => m.items)
      .reduce((sum, row) => {
        const draft = row._id === item._id;
        const graded = draft ? item.graded : row.graded;
        if (!graded) return sum;
        return sum + (draft ? item.gradeWeight : row.gradeWeight);
      }, 0);
    return Math.round(total * 10) / 10;
  }, [tree, item._id, item.graded, item.gradeWeight]);

  const showHeading = item.lessonHeading !== null || headingOpenFor === item._id;
  const uploading = uploadingFor === item._id;

  /**
   * The one thing in this pane that outlives the render that started it. A
   * patch carries no item id — CourseBuilder applies it to whichever draft is
   * open — so a file landing after the operator has moved on would attach
   * itself to an innocent item and dirty it. The upload is pinned to the id it
   * was started from instead, and a result that comes back to a different item
   * is dropped and said out loud on the one it belonged to: the file did reach
   * the server, but only a second upload can get it into the draft.
   */
  async function handleVideoFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const itemId = item._id;
    setVideoError(null);
    setUploadingFor(itemId);
    try {
      const { url } = await uploadCourseMedia(file);
      if (openItemId.current === itemId) {
        onChange({ videoUrl: url });
      } else {
        setVideoError({
          itemId,
          message:
            "That upload finished after you moved to another item, so it was not attached. Upload it again.",
        });
      }
    } catch (err) {
      setVideoError({
        itemId,
        message: err instanceof Error ? err.message : "Could not upload the video.",
      });
    } finally {
      // Only if this upload is still the one the button is reporting. Two items
      // can be uploading at once — the button is disabled for the item being
      // uploaded to and nothing stops the next one — so a bare null here would
      // unstick the other item's button while its file is still on the wire.
      setUploadingFor((prev) => (prev === itemId ? null : prev));
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1.5">
          <Badge tone={meta.tone}>
            <Icon name={meta.icon} size={13} />
            {meta.label}
          </Badge>
          <p className="text-xs text-[var(--text-muted)]">
            An item&apos;s type can&apos;t change — delete and re-add to switch.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex rounded-full surface-sunken p-1">
            <ModeButton active={mode === "edit"} onClick={() => onModeChange("edit")}>
              Edit
            </ModeButton>
            <ModeButton active={mode === "preview"} onClick={() => onModeChange("preview")}>
              Preview
            </ModeButton>
          </div>
          <EditorActions
            dirty={dirty}
            pending={pending}
            onSave={onSave}
            onDiscard={onDiscard}
          />
        </div>
      </div>

      {mode === "preview" ? (
        <Panel className="p-6">
          <ItemPreview item={item} />
        </Panel>
      ) : (
        <>
          <FormSection title="Item">
            <Field label="Title" htmlFor="i-title" required>
              <Input
                id="i-title"
                value={item.title}
                onChange={(e) => onChange({ title: e.target.value })}
              />
            </Field>

            <Field
              label="Summary"
              htmlFor="i-summary"
              hint="One line, shown under the title in the outline."
            >
              <Textarea
                id="i-summary"
                rows={2}
                value={item.summary}
                onChange={(e) => onChange({ summary: e.target.value })}
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Estimated length"
                htmlFor="i-mins"
                hint="Minutes. Shown beside the item in the outline."
              >
                <Input
                  id="i-mins"
                  type="number"
                  min={0}
                  value={item.estimatedMins}
                  onChange={(e) => onChange({ estimatedMins: toNumber(e.target.value) })}
                />
              </Field>

              {/* The only way to reparent an item: the ▲▼ buttons move it
                  within its own module, and drag is an enhancement on top. The
                  caller issues the PATCH and reloads, so this select is bound
                  to the saved parent and never to the draft. */}
              <Field
                label="Move to module"
                htmlFor="i-module"
                hint="Moves the item straight away, ahead of the Save button."
              >
                <Select
                  id="i-module"
                  value={item.courseModuleId}
                  onChange={(e) => void onMoveToModule(item._id, e.target.value)}
                >
                  {tree.modules.map((m, i) => (
                    <option key={m._id} value={m._id}>
                      {`${i + 1}. ${m.title || "Untitled module"}`}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>

            {showHeading ? (
              <Field
                label="Lesson heading"
                htmlFor="i-heading"
                hint="Groups this item and everything after it until the next heading."
              >
                <Input
                  id="i-heading"
                  value={item.lessonHeading ?? ""}
                  onChange={(e) => onChange({ lessonHeading: e.target.value })}
                  placeholder="Getting started"
                />
              </Field>
            ) : (
              <div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setHeadingOpenFor(item._id)}
                >
                  <Icon name="plus" size={14} />
                  Add a lesson heading above this item
                </Button>
              </div>
            )}
          </FormSection>

          {item.kind === "video" && (
            <FormSection
              title="Video"
              description="A YouTube or Vimeo link, or a file uploaded to this site."
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Source" htmlFor="i-provider">
                  <Select
                    id="i-provider"
                    value={item.videoProvider}
                    onChange={(e) => onChange({ videoProvider: e.target.value })}
                  >
                    <option value="youtube">YouTube</option>
                    <option value="vimeo">Vimeo</option>
                    <option value="file">Uploaded file</option>
                  </Select>
                </Field>

                {item.videoProvider === "file" ? (
                  <div className="flex flex-col gap-1.5">
                    <span className="text-sm font-medium text-[var(--text-primary)]">File</span>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        disabled={uploading}
                        onClick={() => videoInputRef.current?.click()}
                      >
                        <Icon name="upload" size={15} />
                        {uploading
                          ? "Uploading…"
                          : item.videoUrl
                            ? "Replace video"
                            : "Upload video"}
                      </Button>
                      {item.videoUrl && !uploading && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => onChange({ videoUrl: null })}
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                    {item.videoUrl && (
                      <p className="truncate text-xs text-[var(--text-muted)]">
                        {item.videoUrl}
                      </p>
                    )}
                  </div>
                ) : (
                  <Field
                    label="Video link"
                    htmlFor="i-video-url"
                    hint="The watch URL — the preview below turns it into an embed."
                  >
                    <Input
                      id="i-video-url"
                      type="url"
                      value={item.videoUrl ?? ""}
                      onChange={(e) => onChange({ videoUrl: e.target.value })}
                      placeholder="https://www.youtube.com/watch?v=…"
                    />
                  </Field>
                )}
              </div>

              <input
                ref={videoInputRef}
                type="file"
                accept="video/mp4,video/webm,image/*,application/pdf"
                onChange={(e) => void handleVideoFile(e)}
                className="hidden"
              />

              {videoError?.itemId === item._id && (
                <p role="alert" className="text-sm text-red-600 dark:text-red-400">
                  {videoError.message}
                </p>
              )}

              {item.videoProvider === "file" && (
                <p className={warnNote}>
                  Uploaded files are served publicly — use an unlisted YouTube or Vimeo
                  link for paid content.
                </p>
              )}

              <VideoEmbed url={item.videoUrl} emptyLabel="Paste a link to preview it" />
            </FormSection>
          )}

          {(item.kind === "reading" ||
            item.kind === "assignment" ||
            item.kind === "discussion") && (
            <FormSection
              title={BODY_COPY[item.kind].title}
              description={BODY_COPY[item.kind].description}
            >
              <Field label={BODY_COPY[item.kind].label} htmlFor="i-body">
                {/* Keyed on the item so Quill remounts with the right content
                    when the outline selection changes under it. */}
                <RichTextEditor
                  key={item._id}
                  value={item.body}
                  onChange={(html) => onChange({ body: html })}
                  placeholder={BODY_COPY[item.kind].placeholder}
                />
              </Field>

              {item.kind === "assignment" && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="How it's handed in" htmlFor="i-submission">
                    <Select
                      id="i-submission"
                      value={item.submissionType}
                      onChange={(e) => onChange({ submissionType: e.target.value })}
                    >
                      {Object.entries(SUBMISSION_TYPE_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </Select>
                  </Field>

                  <Field
                    label="Due on day"
                    htmlFor="i-due"
                    hint="Days from the run's first session. Blank for no deadline."
                  >
                    <Input
                      id="i-due"
                      type="number"
                      min={1}
                      value={item.dueOnDay ?? ""}
                      onChange={(e) => onChange({ dueOnDay: toDay(e.target.value) })}
                    />
                  </Field>
                </div>
              )}
            </FormSection>
          )}

          {item.kind === "quiz" && (
            <FormSection
              title="Quiz"
              description="Multiple-choice questions. A quiz with no questions can't be published."
            >
              <QuizQuestionsEditor
                questions={item.questions}
                onChange={(questions) => onChange({ questions })}
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Pass mark"
                  htmlFor="i-pass"
                  hint="Percent of the available points."
                >
                  <Input
                    id="i-pass"
                    type="number"
                    min={0}
                    max={100}
                    value={item.passMarkPct}
                    onChange={(e) => onChange({ passMarkPct: toNumber(e.target.value) })}
                  />
                </Field>

                <Field label="Attempts allowed" htmlFor="i-attempts" hint="0 for unlimited.">
                  <Input
                    id="i-attempts"
                    type="number"
                    min={0}
                    value={item.attemptsAllowed}
                    onChange={(e) => onChange({ attemptsAllowed: toNumber(e.target.value) })}
                  />
                </Field>
              </div>

              <CheckboxRow
                label="Shuffle questions"
                hint="Each learner sees them in a different order."
                checked={item.shuffleQuestions}
                onChange={(shuffleQuestions) => onChange({ shuffleQuestions })}
              />
            </FormSection>
          )}

          {item.kind === "resource" && (
            <FormSection title="Resource">
              <p className="text-sm text-[var(--text-secondary)]">
                A resource has no body of its own — the Attachments section below is the
                whole item, and it needs at least one file or link before it can be
                published.
              </p>
            </FormSection>
          )}

          <FormSection
            title="Release"
            description="Curriculum belongs to the course, so releases are counted in days from each run's first session — never a fixed date."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="When it opens" htmlFor="i-release">
                <Select
                  id="i-release"
                  value={item.releaseRule}
                  onChange={(e) => onChange({ releaseRule: e.target.value })}
                >
                  {Object.entries(RELEASE_RULE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
              </Field>

              {item.releaseRule === "on-day" && (
                <Field
                  label="Day of the run"
                  htmlFor="i-release-day"
                  hint="Day 1 is the first session."
                  required
                >
                  <Input
                    id="i-release-day"
                    type="number"
                    min={1}
                    value={item.releaseOnDay ?? ""}
                    onChange={(e) => onChange({ releaseOnDay: toDay(e.target.value) })}
                  />
                </Field>
              )}
            </div>
          </FormSection>

          <FormSection title="Grading">
            <CheckboxRow
              label="Graded"
              hint="Counts towards the final grade. An optional item can't be graded."
              checked={item.graded}
              onChange={(graded) => onChange({ graded })}
            />

            {item.graded && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Field
                    label="Weight"
                    htmlFor="i-weight"
                    hint="Percentage points of the final grade."
                  >
                    <Input
                      id="i-weight"
                      type="number"
                      min={0}
                      max={100}
                      value={item.gradeWeight}
                      onChange={(e) => onChange({ gradeWeight: toNumber(e.target.value) })}
                    />
                  </Field>
                  <p
                    className={cn(
                      "text-xs",
                      gradedTotal === 100
                        ? "text-[var(--text-muted)]"
                        : "text-amber-600 dark:text-amber-400",
                    )}
                  >
                    This course&apos;s graded items total {gradedTotal}%.
                  </p>
                </div>

                {/* A quiz's pass mark already has a control in its own block
                    above — the same field, so a second box here would render
                    the same number twice and read like a bug. */}
                {item.kind !== "quiz" && (
                  <Field
                    label="Pass mark"
                    htmlFor="i-grade-pass"
                    hint="The score this item is passed at."
                  >
                    <Input
                      id="i-grade-pass"
                      type="number"
                      min={0}
                      max={100}
                      value={item.passMarkPct}
                      onChange={(e) => onChange({ passMarkPct: toNumber(e.target.value) })}
                    />
                  </Field>
                )}
              </div>
            )}
          </FormSection>

          <FormSection
            title="Attachments"
            description={
              item.kind === "resource"
                ? "The files and links that make up this resource."
                : "Slides, worksheets or links that hang off this item."
            }
          >
            <AttachmentsEditor
              attachments={item.attachments}
              onChange={(attachments) => onChange({ attachments })}
            />
          </FormSection>

          <FormSection title="Visibility">
            <CheckboxRow
              label="Published"
              hint="Live on the course page, once its module is published too."
              checked={item.published}
              onChange={(published) => onChange({ published })}
            />
            <CheckboxRow
              label="Optional"
              hint="Counted towards neither the grade nor the completion requirement."
              checked={item.optional}
              onChange={(optional) => onChange({ optional })}
            />
            <CheckboxRow
              label="Free preview"
              hint="Shown in full on the public course page, before anyone enrols."
              checked={item.previewFree}
              onChange={(previewFree) => onChange({ previewFree })}
            />

            <DeleteRow
              id={item._id}
              label={item.title || "Untitled item"}
              caption="Delete this item"
              consequence="This cannot be undone. A lesson heading on it passes to the item below it."
              onDelete={onDelete}
            />
          </FormSection>
        </>
      )}
    </div>
  );
}

/** Save and Discard, shared by both panes — see the file's docblock for why
 * the builder saves explicitly rather than autosaving. */
function EditorActions({
  dirty,
  pending,
  onSave,
  onDiscard,
}: {
  dirty: boolean;
  pending: boolean;
  onSave: () => void | Promise<void>;
  onDiscard: () => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <Button type="button" size="sm" disabled={!dirty || pending} onClick={() => void onSave()}>
        {pending ? "Saving…" : "Save"}
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={!dirty || pending}
        onClick={onDiscard}
      >
        Discard changes
      </Button>
    </div>
  );
}

/**
 * AdminForm's <Toggle> is uncontrolled (name + defaultChecked) because it
 * submits through FormData; the builder PATCHes granular JSON instead, so this
 * is the same markup wired to checked/onChange.
 */
function CheckboxRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 rounded border-[var(--border-strong)] accent-[var(--accent)]"
      />
      <span>
        <span className="block text-sm font-medium text-[var(--text-primary)]">{label}</span>
        {hint && <span className="block text-xs text-[var(--text-muted)]">{hint}</span>}
      </span>
    </label>
  );
}

/** The delete control both panes close on, kept apart from the checkboxes
 * above it by a rule so it cannot be hit by accident. */
function DeleteRow({
  id,
  label,
  caption,
  consequence,
  onDelete,
}: {
  id: string;
  label: string;
  caption: string;
  consequence: string;
  onDelete: (id: string) => Promise<void>;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-[var(--border-subtle)] pt-4">
      <p className="text-sm text-[var(--text-secondary)]">{caption}</p>
      <DeleteButton id={id} action={onDelete} label={label} consequence={consequence} />
    </div>
  );
}

function ModeButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
        active
          ? "surface-raised text-[var(--text-primary)] shadow-[var(--shadow-soft)]"
          : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
      )}
    >
      {children}
    </button>
  );
}
