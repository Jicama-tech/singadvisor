import { useRef, useState } from "react";
import { saveNewsletter, uploadNewsletterImage } from "@/adminActions";
import type { FormState } from "@/lib/form-state";
import { AdminForm, FormActionsRow, FormSection, Toggle } from "@/components/admin/AdminForm";
import { PageHeading } from "@/components/admin/AdminUI";
import { ImageCropModal } from "@/components/admin/ImageCropModal";
import { AppImage as Image } from "@/components/ui/AppImage";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { withBackendUrl } from "@/lib/media-url";

type NewsletterItem = {
  heading: string;
  image: string;
  message: string;
  referenceLink: string;
};

type Newsletter = {
  id: string;
  slug: string;
  title: string;
  items: NewsletterItem[];
  published: boolean;
};

/** One story row in the repeater. `key` is a stable React key that survives
 * reordering and removal — an array index would make the row below a deleted
 * one inherit its state (its uploaded image, most visibly). */
type StoryRow = NewsletterItem & { key: string };

const MAX_WORDS = 1000;
function wordCount(text: string): number {
  const trimmed = text.trim();
  return trimmed === "" ? 0 : trimmed.split(/\s+/).length;
}

let keySeq = 0;
const nextKey = () => `story-${Date.now()}-${++keySeq}`;
const emptyStory = (): StoryRow => ({
  key: nextKey(),
  heading: "",
  image: "",
  message: "",
  referenceLink: "",
});

/**
 * An issue is a heading, a slug, and any number of stories.
 *
 * It used to be exactly one story: title/image/message/link, one of each. The
 * story fields are unchanged — they simply repeat now, so one issue ("All
 * About September") can carry the several pieces that actually go out in it.
 * Each row keeps its own image upload and word count.
 */
export function NewsletterForm({
  newsletter,
  title,
  description,
  action = saveNewsletter,
}: {
  newsletter?: Newsletter;
  title: string;
  description?: string;
  action?: (formData: FormData) => Promise<FormState | void>;
}) {
  const [titleValue, setTitleValue] = useState(newsletter?.title ?? "");
  const [stories, setStories] = useState<StoryRow[]>(() =>
    newsletter?.items?.length
      ? newsletter.items.map((item) => ({ ...item, key: nextKey() }))
      : [emptyStory()],
  );
  // Which row's upload is in flight / which row the crop modal is for — the
  // modal is shared, so it has to remember who opened it.
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [cropFor, setCropFor] = useState<{ key: string; src: string } | null>(null);
  const [genError, setGenError] = useState<string | null>(null);

  // One hidden file input per row, addressed by row key.
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});

  function updateStory(key: string, patch: Partial<NewsletterItem>) {
    setStories((rows) => rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  function addStory() {
    setStories((rows) => [...rows, emptyStory()]);
  }

  function removeStory(key: string) {
    // Never leave the form with nothing to fill in — the last row is cleared
    // rather than removed, which is also what the Backend requires.
    setStories((rows) => (rows.length === 1 ? [emptyStory()] : rows.filter((r) => r.key !== key)));
  }

  function moveStory(key: string, direction: -1 | 1) {
    setStories((rows) => {
      const i = rows.findIndex((r) => r.key === key);
      const j = i + direction;
      if (i < 0 || j < 0 || j >= rows.length) return rows;
      const next = [...rows];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  function handleFileChange(key: string, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setCropFor({ key, src: URL.createObjectURL(file) });
  }

  async function handleCropConfirm(croppedFile: File) {
    const pending = cropFor;
    setCropFor(null);
    if (!pending) return;
    try {
      setUploadingKey(pending.key);
      const { url } = await uploadNewsletterImage(croppedFile);
      updateStory(pending.key, { image: url });
    } catch (err) {
      setGenError(err instanceof Error ? err.message : "Could not upload the image.");
    } finally {
      setUploadingKey(null);
      URL.revokeObjectURL(pending.src);
    }
  }

  return (
    <>
      <AdminForm
        action={action}
        id={newsletter?.id}
        cancelHref="/admin/newsletter"
        submitLabel={newsletter ? "Save changes" : "Publish newsletter"}
        wide
        hideDefaultActions
      >
        {(errors, values, pending) => (
          <div className="flex flex-col gap-6">
            <PageHeading
              title={title}
              description={description}
              action={
                <FormActionsRow
                  pending={pending}
                  submitLabel={newsletter ? "Save changes" : "Publish newsletter"}
                  cancelHref="/admin/newsletter"
                />
              }
            />

            <FormSection
              title="Issue"
              description="The heading for the whole issue — the stories go below."
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Heading" htmlFor="n-title" required error={errors.title}>
                  <Input
                    id="n-title"
                    name="title"
                    required
                    placeholder="All About September"
                    value={titleValue}
                    onChange={(e) => setTitleValue(e.target.value)}
                  />
                </Field>

                <Field
                  label="URL slug"
                  htmlFor="n-slug"
                  hint="Leave blank to generate from the heading."
                  error={errors.slug}
                >
                  <Input
                    id="n-slug"
                    name="slug"
                    defaultValue={values.slug ?? newsletter?.slug}
                    placeholder="all-about-september"
                  />
                </Field>
              </div>
            </FormSection>

            <FormSection
              title={`Stories (${stories.length})`}
              description="Each story appears as its own block in the published issue, in this order."
            >
              {/* The repeater is submitted as indexed fields — see
                  saveNewsletter in adminActions.ts. */}
              <input type="hidden" name="storyCount" value={stories.length} />

              {errors.items && (
                <p role="alert" className="text-sm font-medium text-red-600 dark:text-red-400">
                  {errors.items}
                </p>
              )}

              <div className="flex flex-col gap-5">
                {stories.map((story, i) => {
                  const words = wordCount(story.message);
                  const uploading = uploadingKey === story.key;
                  return (
                    <div
                      key={story.key}
                      className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] p-5"
                    >
                      <input type="hidden" name={`story${i}Heading`} value={story.heading} />
                      <input type="hidden" name={`story${i}Image`} value={story.image} />
                      <input type="hidden" name={`story${i}Message`} value={story.message} />
                      <input
                        type="hidden"
                        name={`story${i}ReferenceLink`}
                        value={story.referenceLink}
                      />

                      <div className="mb-4 flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-[var(--text-primary)]">
                          Story {i + 1}
                        </p>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => moveStory(story.key, -1)}
                            disabled={i === 0}
                            aria-label={`Move story ${i + 1} up`}
                            className="rounded-md p-1.5 text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-sunken)] hover:text-[var(--text-primary)] disabled:opacity-30 disabled:hover:bg-transparent"
                          >
                            <Icon name="chevron-down" size={15} className="rotate-180" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveStory(story.key, 1)}
                            disabled={i === stories.length - 1}
                            aria-label={`Move story ${i + 1} down`}
                            className="rounded-md p-1.5 text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-sunken)] hover:text-[var(--text-primary)] disabled:opacity-30 disabled:hover:bg-transparent"
                          >
                            <Icon name="chevron-down" size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeStory(story.key)}
                            aria-label={`Remove story ${i + 1}`}
                            className="rounded-md p-1.5 text-[var(--text-muted)] transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
                          >
                            <Icon name="trash" size={15} />
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-col gap-4">
                        <Field
                          label="Headline"
                          htmlFor={`n-story-${story.key}-heading`}
                          hint="Optional — leave blank if the issue heading is enough."
                        >
                          <Input
                            id={`n-story-${story.key}-heading`}
                            value={story.heading}
                            onChange={(e) => updateStory(story.key, { heading: e.target.value })}
                          />
                        </Field>

                        <Field label="Image" htmlFor={`n-story-${story.key}-file`} required>
                          {story.image ? (
                            <div className="relative mb-1 h-48 w-full max-w-md overflow-hidden rounded-xl surface-sunken">
                              <Image
                                src={withBackendUrl(story.image)}
                                alt=""
                                fill
                                sizes="28rem"
                                className="object-cover"
                              />
                              <div className="absolute right-2 top-2 flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => fileInputs.current[story.key]?.click()}
                                  className="rounded-lg bg-black/70 px-3 py-1.5 text-xs font-medium text-white hover:bg-black/80"
                                >
                                  Change
                                </button>
                                <button
                                  type="button"
                                  onClick={() => updateStory(story.key, { image: "" })}
                                  aria-label="Remove image"
                                  className="rounded-lg bg-black/70 p-1.5 text-red-300 hover:bg-black/80"
                                >
                                  <Icon name="trash" size={14} />
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => fileInputs.current[story.key]?.click()}
                              disabled={uploading}
                              className="flex h-32 w-full max-w-md flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[var(--border-strong)] text-[var(--text-muted)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:opacity-60"
                            >
                              <Icon name="upload" size={20} />
                              <span className="text-sm">
                                {uploading ? "Uploading…" : "Upload image"}
                              </span>
                            </button>
                          )}
                          <input
                            ref={(el) => {
                              fileInputs.current[story.key] = el;
                            }}
                            id={`n-story-${story.key}-file`}
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/gif"
                            hidden
                            onChange={(e) => handleFileChange(story.key, e)}
                          />
                        </Field>

                        <Field
                          label="Message"
                          htmlFor={`n-story-${story.key}-message`}
                          required
                          hint={`${words}/${MAX_WORDS} words`}
                        >
                          <Textarea
                            id={`n-story-${story.key}-message`}
                            rows={8}
                            value={story.message}
                            onChange={(e) => updateStory(story.key, { message: e.target.value })}
                            aria-invalid={words > MAX_WORDS}
                          />
                          {words > MAX_WORDS && (
                            <p
                              role="alert"
                              className="text-xs font-medium text-red-600 dark:text-red-400"
                            >
                              Over the {MAX_WORDS}-word limit by {words - MAX_WORDS}.
                            </p>
                          )}
                        </Field>

                        <Field
                          label="Reference link"
                          htmlFor={`n-story-${story.key}-link`}
                          hint="Optional — where “Read full article” sends the reader. Leave blank and the story shows no button."
                        >
                          <Input
                            id={`n-story-${story.key}-link`}
                            type="url"
                            placeholder="https://singadvisor.com/blog/..."
                            value={story.referenceLink}
                            onChange={(e) =>
                              updateStory(story.key, { referenceLink: e.target.value })
                            }
                          />
                        </Field>
                      </div>
                    </div>
                  );
                })}
              </div>

              <Button type="button" variant="secondary" onClick={addStory}>
                <Icon name="plus" size={16} />
                Add story
              </Button>
            </FormSection>

            <FormSection title="Publishing">
              <Toggle
                name="published"
                label="Published"
                hint="Unticked keeps it as a draft, hidden from the public newsletter list."
                defaultChecked={
                  Object.keys(values).length > 0
                    ? values.published === "true"
                    : (newsletter?.published ?? true)
                }
              />
            </FormSection>

            {genError && (
              <p role="alert" className="text-sm font-medium text-red-600 dark:text-red-400">
                {genError}
              </p>
            )}
          </div>
        )}
      </AdminForm>

      {cropFor && (
        <ImageCropModal
          open
          image={cropFor.src}
          defaultAspect={16 / 9}
          onClose={() => {
            URL.revokeObjectURL(cropFor.src);
            setCropFor(null);
          }}
          onCropComplete={handleCropConfirm}
        />
      )}
    </>
  );
}
