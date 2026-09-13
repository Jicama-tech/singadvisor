import { ArticleBody } from "@/components/blog/ArticleBody";
import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
import { embedUrl, formatMins, kindMeta, SUBMISSION_TYPE_LABELS } from "@/lib/course-content";
import type { CourseItemDoc } from "@/lib/courseContentClient";
import { withBackendUrl } from "@/lib/media-url";
import { cn } from "@/lib/utils";

/**
 * The Preview half of the item editor's Edit | Preview toggle — read-only,
 * client-side, no endpoint. There is no learner view yet (nobody can watch,
 * answer or submit anything), so this is the only way an author sees what they
 * are writing as a reader would.
 *
 * `submissionType` and friends arrive as plain strings from the Backend, which
 * stores them unconstrained by the TS union, so the label tables are read
 * through a cast that falls back to the raw value rather than rendering
 * "undefined".
 */
const submissionLabel = (value: string) =>
  SUBMISSION_TYPE_LABELS[value as keyof typeof SUBMISSION_TYPE_LABELS] ?? value;

/**
 * A video item's player, shared by the editor's inline preview and by the
 * preview pane below so the two can never disagree about what a link resolves
 * to. A YouTube/Vimeo watch URL becomes an <iframe> (embedUrl does the
 * rewriting); anything else — an /uploads/course-media path, a direct .mp4 —
 * is a <video>, whose src goes through withBackendUrl because uploads are
 * served from the Backend's origin and a bare /uploads/... would resolve
 * against the SPA.
 */
export function VideoEmbed({ url, emptyLabel }: { url: string | null; emptyLabel: string }) {
  if (!url) {
    return (
      <div className="grid aspect-[16/9] w-full place-items-center rounded-xl border-2 border-dashed border-[var(--border-strong)] px-4 text-center text-sm text-[var(--text-muted)]">
        {emptyLabel}
      </div>
    );
  }

  const embed = embedUrl(url);
  if (embed) {
    return (
      <iframe
        src={embed}
        title="Video preview"
        loading="lazy"
        allow="encrypted-media; picture-in-picture"
        allowFullScreen
        className="aspect-[16/9] w-full rounded-xl border-0 surface-sunken"
      />
    );
  }

  return (
    <video
      src={withBackendUrl(url)}
      controls
      className="aspect-[16/9] w-full rounded-xl surface-sunken"
    />
  );
}

export function ItemPreview({ item }: { item: CourseItemDoc }) {
  const meta = kindMeta(item.kind);

  return (
    <div className="flex flex-col gap-5">
      <p className="rounded-xl surface-sunken px-4 py-3 text-xs text-[var(--text-secondary)]">
        This is how the item reads. Learners can&apos;t take quizzes yet — there is no
        learner view.
      </p>

      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={meta.tone}>
            <Icon name={meta.icon} size={13} />
            {meta.label}
          </Badge>
          {item.graded && <Badge tone="warn">{item.gradeWeight}% of the grade</Badge>}
          {item.optional && <Badge tone="neutral">Optional</Badge>}
          {item.previewFree && <Badge tone="accent">Free preview</Badge>}
        </div>
        <h3 className="text-xl">{item.title || "Untitled item"}</h3>
        {item.summary && (
          <p className="text-sm text-[var(--text-secondary)]">{item.summary}</p>
        )}
        {item.estimatedMins > 0 && (
          <p className="text-xs text-[var(--text-muted)]">{formatMins(item.estimatedMins)}</p>
        )}
      </header>

      <ItemBody item={item} />

      {item.attachments.length > 0 && (
        <section>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            {item.kind === "resource" ? "Files and links" : "Attachments"}
          </h4>
          <ul className="mt-2 flex flex-col gap-1.5">
            {item.attachments.map((a) => (
              <li key={a.id}>
                <a
                  href={withBackendUrl(a.url)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm font-medium text-[var(--accent)] hover:underline"
                >
                  <Icon name="download" size={15} />
                  {a.label || a.url}
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

/** The payload the item's `kind` actually selects. Every other field on the
 * document still carries its schema default (a resource really does arrive
 * with passMarkPct: 70), so nothing outside this switch may be trusted. */
function ItemBody({ item }: { item: CourseItemDoc }) {
  if (item.kind === "video") {
    return <VideoEmbed url={item.videoUrl} emptyLabel="No video link on this item yet." />;
  }

  if (item.kind === "quiz") {
    if (item.questions.length === 0) return <Empty>No questions yet.</Empty>;
    return (
      <ol className="flex flex-col gap-4">
        {item.questions.map((q, i) => (
          <li
            key={q.id}
            className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] p-4"
          >
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              Question {i + 1} · {q.points} point{q.points === 1 ? "" : "s"}
            </p>
            <p className="mt-1 text-sm font-medium text-[var(--text-primary)]">
              {q.prompt || "No prompt yet."}
            </p>
            <div className="mt-3 flex flex-col gap-2">
              {q.options.map((o) => (
                <label
                  key={o.id}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm",
                    o.correct
                      ? "text-[var(--text-primary)] ring-1 ring-inset ring-[var(--accent)]"
                      : "text-[var(--text-secondary)]",
                  )}
                >
                  {/* Disabled and unticked on purpose — the accent ring is the
                      answer key, not a pre-ticked box, and nothing here submits. */}
                  <input
                    type={q.type === "multiple" ? "checkbox" : "radio"}
                    disabled
                    className="h-4 w-4 rounded border-[var(--border-strong)] accent-[var(--accent)]"
                  />
                  {o.text || "Blank option"}
                </label>
              ))}
            </div>
            {q.explanation && (
              <p className="mt-3 text-xs text-[var(--text-muted)]">{q.explanation}</p>
            )}
          </li>
        ))}
      </ol>
    );
  }

  if (item.kind === "resource") {
    return item.attachments.length === 0 ? (
      <Empty>Nothing attached yet — a resource is its files and links.</Empty>
    ) : null;
  }

  // reading | assignment | discussion — one `body` field, one renderer.
  return (
    <div className="flex flex-col gap-4">
      {item.kind === "assignment" && (
        <p className="text-sm text-[var(--text-secondary)]">
          Handed in: {submissionLabel(item.submissionType)}
          {item.dueOnDay != null && ` · due on day ${item.dueOnDay} of the run`}
        </p>
      )}
      {item.body ? (
        // ArticleBody, never a hand-rolled dangerouslySetInnerHTML: it is the
        // only sanitising renderer in the app (a DOMPurify allow-list plus the
        // /uploads/ → withBackendUrl rewrite) and nothing sanitises `body` on
        // the way into the database, so the render path is the only guard.
        <ArticleBody content={item.body} />
      ) : (
        <Empty>Nothing written yet.</Empty>
      )}
    </div>
  );
}

function Empty({ children }: { children: string }) {
  return <p className="text-sm text-[var(--text-muted)]">{children}</p>;
}
