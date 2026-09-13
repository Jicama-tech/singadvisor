import { useLayoutEffect, useRef, useState } from "react";
import { uploadCourseMedia } from "@/adminActions";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import type { CourseAttachmentDoc } from "@/lib/courseContentClient";

/**
 * Downloadables and links that hang off any item — slides under a video, a
 * worksheet under a reading, the whole payload of a `resource`. Controlled,
 * like the quiz repeater beside it: the array comes down as a prop and every
 * edit hands a new one back.
 *
 * A row has no "kind" field. Its `url` already says which it is — an
 * /uploads/course-media/... path came from the upload button, anything else
 * was pasted — which is the same rule the Backend's @Matches validator
 * enforces, so there is nothing extra to keep in step.
 */

/**
 * The id a row the server has not seen yet carries — a durable id, not just a
 * React key. The Backend keeps whatever the client sent (`id || randomUUID()`
 * in course-content.service.ts), so it is what every later save, edit and
 * delete matches the row on, and what the hidden-file-input map below is keyed
 * by — it has to be unique across sittings, not merely within one render. A
 * module counter was not: it restarts at one on each page load, so a second
 * sitting mints the `attachment-1` the first sitting already saved onto that
 * item, and a click on either row's upload button would reach the other's file
 * picker. randomUUID() is the same generator the Backend falls back to; the
 * clock-and-random tail covers a non-secure context (the admin opened over
 * plain http), where it is not exposed. The prefix is kept because the id also
 * spells the row's field ids, which read better with a word in front.
 */
const newRowId = () => {
  const unique =
    crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `attachment-${unique}`;
};

const UPLOAD_ACCEPT =
  "image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,application/pdf";

/** The stored path's last segment — what the admin recognises the file by,
 * since the rest is the Backend's storage directory and a uuid. */
const fileName = (url: string) => url.split("/").pop() || url;

export function AttachmentsEditor({
  attachments,
  onChange,
}: {
  attachments: CourseAttachmentDoc[];
  onChange: (attachments: CourseAttachmentDoc[]) => void;
}) {
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  // One hidden input per row, so a click on a row's button can only ever
  // reach that row's file picker.
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});
  // The array as the parent last handed it down, kept where the upload's
  // resolve path can read it. An upload finishes long after the file was
  // chosen, and the admin keeps typing while it runs: `attachments` as the
  // handler closed over it is the array from the moment of the click, so
  // patching from that capture would hand the parent a copy with every edit
  // made in the meantime — to this row's label, or to any other row —
  // silently rolled back. Mirrored in a layout effect rather than assigned
  // mid-render, so it can only ever hold an array that was really committed.
  const committedRows = useRef(attachments);
  useLayoutEffect(() => {
    committedRows.current = attachments;
  });

  function patch(id: string, fields: Partial<CourseAttachmentDoc>) {
    onChange(attachments.map((a) => (a.id === id ? { ...a, ...fields } : a)));
  }

  /** Uploaded the moment the file is chosen, like every other upload control
   * in this admin — the draft has to hold the returned path before anything is
   * saved, and there is no form submit here to defer it to. */
  async function handleFile(id: string, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setErrors((prev) => ({ ...prev, [id]: "" }));
    setUploadingId(id);
    try {
      const { url } = await uploadCourseMedia(file);
      // Only the uploading row is touched, and against the rows as they stand
      // now rather than as they stood at the click. A row removed while the
      // file was in flight simply isn't there to match, so nothing revives it.
      // An unnamed row takes the filename, so a just-uploaded handout is never
      // a blank line in the learner's list.
      onChange(
        committedRows.current.map((a) =>
          a.id === id ? { ...a, url, ...(!a.label && { label: fileName(url) }) } : a,
        ),
      );
    } catch (err) {
      setErrors((prev) => ({
        ...prev,
        [id]: err instanceof Error ? err.message : "Could not upload the file.",
      }));
    } finally {
      setUploadingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {attachments.length === 0 ? (
        <p className="text-xs text-[var(--text-muted)]">
          Nothing attached yet. Add a file to upload, or a link to somewhere else.
        </p>
      ) : (
        attachments.map((a) => {
          const uploaded = a.url.startsWith("/uploads/");
          const uploading = uploadingId === a.id;
          return (
            <div
              key={a.id}
              className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] p-4"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                <Field label="Label" htmlFor={`${a.id}-label`} required className="flex-1">
                  <Input
                    id={`${a.id}-label`}
                    value={a.label}
                    onChange={(e) => patch(a.id, { label: e.target.value })}
                    placeholder="Week 1 slides"
                  />
                </Field>

                {uploaded ? (
                  <div className="flex flex-1 flex-col gap-1.5">
                    <span className="text-sm font-medium text-[var(--text-primary)]">File</span>
                    <div className="flex items-center gap-2 rounded-xl border border-[var(--border-strong)] bg-[var(--surface)] px-4 py-2.5">
                      <Icon
                        name="download"
                        size={15}
                        className="shrink-0 text-[var(--text-muted)]"
                      />
                      <span className="truncate text-sm text-[var(--text-primary)]">
                        {fileName(a.url)}
                      </span>
                      <button
                        type="button"
                        aria-label="Remove the uploaded file"
                        onClick={() => patch(a.id, { url: "" })}
                        className="ml-auto shrink-0 text-[var(--text-muted)] hover:text-red-600"
                      >
                        <Icon name="x" size={14} />
                      </button>
                    </div>
                    <p className="text-xs text-[var(--text-muted)]">
                      Uploaded files are served publicly, to anyone with the link.
                    </p>
                  </div>
                ) : (
                  <Field
                    label="Link"
                    htmlFor={`${a.id}-url`}
                    hint="An https:// address — or upload a file instead."
                    className="flex-1"
                  >
                    <Input
                      id={`${a.id}-url`}
                      type="url"
                      value={a.url}
                      onChange={(e) => patch(a.id, { url: e.target.value })}
                      placeholder="https://…"
                    />
                  </Field>
                )}
              </div>

              {errors[a.id] && (
                <p role="alert" className="mt-2 text-sm text-red-600 dark:text-red-400">
                  {errors[a.id]}
                </p>
              )}

              <div className="mt-3 flex flex-wrap items-center gap-3">
                {!uploaded && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={uploading}
                    onClick={() => fileInputs.current[a.id]?.click()}
                  >
                    <Icon name="upload" size={15} />
                    {uploading ? "Uploading…" : "Upload a file"}
                  </Button>
                )}
                <button
                  type="button"
                  onClick={() => onChange(attachments.filter((row) => row.id !== a.id))}
                  className="flex items-center gap-1 text-sm text-[var(--text-muted)] hover:text-red-600"
                >
                  <Icon name="x" size={14} />
                  Remove
                </button>
              </div>

              <input
                ref={(el) => {
                  // Dropped rather than left as a null when the row unmounts,
                  // so the map holds exactly the rows on screen and a removed
                  // row's id can never be clicked into again.
                  if (el) fileInputs.current[a.id] = el;
                  else delete fileInputs.current[a.id];
                }}
                type="file"
                accept={UPLOAD_ACCEPT}
                onChange={(e) => void handleFile(a.id, e)}
                className="hidden"
              />
            </div>
          );
        })
      )}

      <div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => onChange([...attachments, { id: newRowId(), label: "", url: "" }])}
        >
          <Icon name="plus" size={14} />
          Add attachment
        </Button>
      </div>
    </div>
  );
}
