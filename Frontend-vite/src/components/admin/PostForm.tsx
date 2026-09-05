
import { useMemo, useRef, useState } from "react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import { savePost } from "@/app/admin/actions";
import { generateBlogContent, uploadContentImage } from "@/adminActions";
import type { FormState } from "@/lib/form-state";
import { AdminForm, FormActionsRow, FormSection, Toggle } from "@/components/admin/AdminForm";
import { PageHeading } from "@/components/admin/AdminUI";
import { BlogFeedbackPanel } from "@/components/admin/BlogFeedbackPanel";
import { ImageCropModal } from "@/components/admin/ImageCropModal";
import { AppImage as Image } from "@/components/ui/AppImage";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { BLOG_CATEGORIES } from "@/lib/constants";
import { withBackendUrl } from "@/lib/media-url";
import { jsonToLines } from "@/lib/utils";

type Post = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  coverImage: string;
  category: string;
  tags: string;
  published: boolean;
  featured: boolean;
  /** Absent on posts predating the flag — the toggle treats that as listed. */
  listedOnBlog?: boolean;
  publishedAt: Date | null;
  writtenByName: string;
  writtenByPosition: string;
};

const toDateInput = (d: Date | null | undefined) =>
  d ? d.toISOString().slice(0, 10) : "";

type CropTarget = { mode: "cover" | "content"; src: string };

/** Inline images are stored as relative /uploads/... paths (same convention
 * every other image field in the app uses — portable across domains), but
 * the Quill editor needs an absolute URL to actually load a live preview
 * (a relative src resolves against this admin app's own origin, not the
 * Backend's). Round-trips content between the two at load/submit time. */
function toAbsoluteImages(html: string): string {
  return html.replace(/src="\/uploads\//g, `src="${__API_URL__}/uploads/`);
}
function toRelativeImages(html: string): string {
  return html.split(`src="${__API_URL__}/uploads/`).join('src="/uploads/');
}

/**
 * Same field set/flow as jicamaTech's BlogEditorModal — AI-generate-or-write
 * mode choice for a new post, "Written by" name+position instead of an
 * author picker, a cropped cover-image upload, and a rich-text editor with
 * inline image insertion (also cropped) — rebuilt as a full page (not a
 * modal) in SingAdvisor's own light admin theme rather than jicama's dark
 * one, and wired to this app's own Blog module/DB, not a separate one.
 */
export function PostForm({
  post,
  title,
  description,
  action = savePost,
}: {
  post?: Post;
  /** Page heading, rendered on the same row as Publish/Save + Cancel (once
   * the edit step is reached) — PostForm owns the whole heading so the
   * action buttons can share the `pending` state that only exists inside
   * AdminForm's children callback. */
  title: string;
  description?: string;
  action?: (formData: FormData) => Promise<FormState | void>;
}) {
  const isEdit = Boolean(post);
  const [mode, setMode] = useState<"choice" | "topic" | "edit">(isEdit ? "edit" : "choice");
  const [topic, setTopic] = useState("");
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  // Controlled so "Generate with AI" and the image-upload flows can fill
  // them; everything else in the form stays the app's usual uncontrolled
  // defaultValue convention.
  const [titleValue, setTitleValue] = useState(post?.title ?? "");
  const [excerptValue, setExcerptValue] = useState(post?.excerpt ?? "");
  const [contentValue, setContentValue] = useState(() => toAbsoluteImages(post?.content ?? ""));
  const [coverImageUrl, setCoverImageUrl] = useState(post?.coverImage ?? "");
  const [coverUploading, setCoverUploading] = useState(false);
  const [cropTarget, setCropTarget] = useState<CropTarget | null>(null);

  const coverFileInputRef = useRef<HTMLInputElement>(null);
  const contentFileInputRef = useRef<HTMLInputElement>(null);
  const quillRef = useRef<ReactQuill>(null);
  const lastSelectionRef = useRef<{ index: number; length: number } | null>(null);

  async function handleGenerate() {
    if (topic.trim().length < 3) {
      setGenError("Please enter a topic (at least 3 characters).");
      return;
    }
    setGenError(null);
    setGenerating(true);
    try {
      const result = await generateBlogContent(topic.trim());
      setTitleValue(result.title);
      setExcerptValue(result.excerpt);
      setContentValue(result.contentHtml);
      setMode("edit");
    } catch (err) {
      setGenError(err instanceof Error ? err.message : "Something went wrong generating the post.");
    } finally {
      setGenerating(false);
    }
  }

  function handleCoverFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setCropTarget({ mode: "cover", src: URL.createObjectURL(file) });
  }

  function openContentImagePicker() {
    contentFileInputRef.current?.click();
  }

  function handleContentFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setCropTarget({ mode: "content", src: URL.createObjectURL(file) });
  }

  async function handleCropConfirm(croppedFile: File) {
    const target = cropTarget;
    setCropTarget(null);
    if (!target) return;
    try {
      if (target.mode === "cover") setCoverUploading(true);
      const { url } = await uploadContentImage(croppedFile);
      if (target.mode === "cover") {
        setCoverImageUrl(url);
      } else {
        const editor = quillRef.current?.getEditor();
        if (editor) {
          const index = lastSelectionRef.current?.index ?? editor.getLength();
          // Absolute URL so the editor's own live preview actually loads
          // (a relative /uploads/... src resolves against this admin app's
          // own origin, not the Backend's) — stripped back to relative
          // before the form submits, see `contentToSubmit` below.
          editor.insertEmbed(index, "image", withBackendUrl(url), "user");
          editor.setSelection(index + 1, 0, "user");
        }
      }
    } catch (err) {
      setGenError(err instanceof Error ? err.message : "Could not upload the image.");
    } finally {
      setCoverUploading(false);
      URL.revokeObjectURL(target.src);
    }
  }

  const quillModules = useMemo(
    () => ({
      toolbar: {
        container: [
          [{ header: [2, 3, false] }],
          ["bold", "italic", "underline", "blockquote"],
          [{ list: "ordered" }, { list: "bullet" }],
          ["link", "image"],
          ["clean"],
        ],
        handlers: { image: openContentImagePicker },
      },
    }),
    // Stable forever: react-quill only reads `modules` once at mount, and
    // openContentImagePicker doesn't close over anything that changes.
    [],
  );

  if (mode === "choice") {
    return (
      <div className="flex flex-col gap-6">
        <PageHeading title={title} description={description} />
        <FormSection title="How do you want to create this post?">
          <div className="grid gap-4 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setMode("topic")}
              className="flex flex-col items-start gap-2 rounded-xl border border-[var(--border-strong)] p-5 text-left transition-colors hover:border-[var(--accent)] hover:bg-[var(--surface-sunken)]"
            >
              <Icon name="sparkles" size={22} className="text-[var(--accent)]" />
              <span className="font-semibold text-[var(--text-primary)]">Generate with AI</span>
              <span className="text-sm text-[var(--text-muted)]">
                Give a topic and let AI draft the title, excerpt, and content for you to edit.
              </span>
            </button>
            <button
              type="button"
              onClick={() => setMode("edit")}
              className="flex flex-col items-start gap-2 rounded-xl border border-[var(--border-strong)] p-5 text-left transition-colors hover:border-[var(--accent)] hover:bg-[var(--surface-sunken)]"
            >
              <Icon name="pencil" size={22} className="text-[var(--text-secondary)]" />
              <span className="font-semibold text-[var(--text-primary)]">Write manually</span>
              <span className="text-sm text-[var(--text-muted)]">
                Start from a blank post and write everything yourself.
              </span>
            </button>
          </div>
        </FormSection>
      </div>
    );
  }

  if (mode === "topic") {
    return (
      <div className="flex flex-col gap-6">
        <PageHeading title={title} description={description} />
        <FormSection title="What should this post be about?">
          <Input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g. How AI is transforming customer support"
          />
          {genError && (
            <p role="alert" className="text-sm font-medium text-red-600 dark:text-red-400">
              {genError}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" onClick={handleGenerate} disabled={generating}>
              {generating ? "Generating…" : "Generate with AI"}
            </Button>
            <button
              type="button"
              onClick={() => setMode("choice")}
              className="text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              Back
            </button>
          </div>
        </FormSection>
      </div>
    );
  }

  return (
    <>
    <AdminForm
      action={action}
      id={post?.id}
      cancelHref="/admin/blog"
      submitLabel={post ? "Save changes" : "Publish article"}
      wide
      hideDefaultActions
    >
      {(errors, values, pending) => {
        const submitted = Object.keys(values).length > 0;
        return (
          <div className="flex flex-col gap-6">
            <PageHeading
              title={title}
              description={description}
              action={
                <FormActionsRow
                  pending={pending}
                  submitLabel={post ? "Save changes" : "Publish article"}
                  cancelHref="/admin/blog"
                />
              }
            />

            {/* Content and cover image are controlled (AI-fill / upload
                update them directly) — submitted via hidden inputs rather
                than a visible field's own name attribute. */}
            <input type="hidden" name="content" value={toRelativeImages(contentValue)} />
            <input type="hidden" name="coverImage" value={coverImageUrl} />

            <FormSection title="Basics">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Title" htmlFor="b-title" required error={errors.title}>
                  <Input
                    id="b-title"
                    name="title"
                    required
                    value={titleValue}
                    onChange={(e) => setTitleValue(e.target.value)}
                  />
                </Field>

                <Field
                  label="URL slug"
                  htmlFor="b-slug"
                  hint="Leave blank to generate from the title."
                  error={errors.slug}
                >
                  <Input
                    id="b-slug"
                    name="slug"
                    defaultValue={values.slug ?? post?.slug}
                    placeholder="why-training-dies-by-monday"
                  />
                </Field>
              </div>

              <Field
                label="Excerpt"
                htmlFor="b-excerpt"
                hint="One or two sentences. Shown on cards, search results and social previews."
                error={errors.excerpt}
              >
                <Textarea
                  id="b-excerpt"
                  name="excerpt"
                  rows={3}
                  value={excerptValue}
                  onChange={(e) => setExcerptValue(e.target.value)}
                />
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Written by"
                  htmlFor="b-writtenByName"
                  error={errors.writtenByName}
                >
                  <Input
                    id="b-writtenByName"
                    name="writtenByName"
                    placeholder="e.g. Vansh Sharma"
                    defaultValue={values.writtenByName ?? post?.writtenByName}
                  />
                </Field>
                <Field
                  label="Position"
                  htmlFor="b-writtenByPosition"
                  error={errors.writtenByPosition}
                >
                  <Input
                    id="b-writtenByPosition"
                    name="writtenByPosition"
                    placeholder="e.g. AI Full Stack Developer, Jicama Tech"
                    defaultValue={values.writtenByPosition ?? post?.writtenByPosition}
                  />
                </Field>
              </div>

              <Field label="Category" htmlFor="b-category" error={errors.category}>
                <Select
                  id="b-category"
                  key={values.category ?? post?.category ?? "Insights"}
                  name="category"
                  defaultValue={values.category ?? post?.category ?? "Insights"}
                  className="max-w-xs"
                >
                  {BLOG_CATEGORIES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </Select>
              </Field>

              <Field label="Cover image" htmlFor="cover-file">
                {coverImageUrl ? (
                  <div className="relative mb-1 h-48 w-full max-w-md overflow-hidden rounded-xl surface-sunken">
                    <Image src={withBackendUrl(coverImageUrl)} alt="" fill sizes="28rem" className="object-cover" />
                    <div className="absolute right-2 top-2 flex gap-2">
                      <button
                        type="button"
                        onClick={() => coverFileInputRef.current?.click()}
                        className="rounded-lg bg-black/70 px-3 py-1.5 text-xs font-medium text-white hover:bg-black/80"
                      >
                        Change
                      </button>
                      <button
                        type="button"
                        onClick={() => setCoverImageUrl("")}
                        aria-label="Remove cover image"
                        className="rounded-lg bg-black/70 p-1.5 text-red-300 hover:bg-black/80"
                      >
                        <Icon name="trash" size={14} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => coverFileInputRef.current?.click()}
                    disabled={coverUploading}
                    className="flex h-32 w-full max-w-md flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[var(--border-strong)] text-[var(--text-muted)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:opacity-60"
                  >
                    <Icon name="upload" size={20} />
                    <span className="text-sm">{coverUploading ? "Uploading…" : "Upload cover image"}</span>
                  </button>
                )}
                <input
                  ref={coverFileInputRef}
                  id="cover-file"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  hidden
                  onChange={handleCoverFileChange}
                />
              </Field>
            </FormSection>

            {post && (
              <FormSection title="Feedback">
                <BlogFeedbackPanel postId={post.id} />
              </FormSection>
            )}

            <FormSection title="Article">
              <Field label="Content" htmlFor="b-content-editor" required error={errors.content}>
                <div
                  id="b-content-editor"
                  className="rich-text-editor rounded-xl border border-[var(--border-strong)] bg-[var(--surface)] [&_.ql-toolbar]:rounded-t-xl [&_.ql-toolbar]:border-[var(--border-strong)] [&_.ql-container]:rounded-b-xl [&_.ql-container]:border-[var(--border-strong)] [&_.ql-editor]:min-h-[16rem]"
                >
                  <ReactQuill
                    ref={quillRef}
                    theme="snow"
                    value={contentValue}
                    onChange={setContentValue}
                    onChangeSelection={(range) => {
                      if (range) lastSelectionRef.current = range;
                    }}
                    modules={quillModules}
                    placeholder="Opening paragraph…"
                  />
                </div>
                <input
                  ref={contentFileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  hidden
                  onChange={handleContentFileChange}
                />
              </Field>

              <Field
                label="Tags"
                htmlFor="b-tags"
                hint="One per line. Shown on the article and searchable."
                error={errors.tags}
              >
                <Textarea
                  id="b-tags"
                  name="tags"
                  rows={4}
                  defaultValue={values.tags ?? jsonToLines(post?.tags)}
                />
              </Field>
            </FormSection>

            <FormSection title="Publishing">
              <Toggle
                name="published"
                label="Published"
                hint="Unticked keeps it as a draft, hidden from the public blog."
                defaultChecked={
                  submitted ? values.published === "true" : (post?.published ?? true)
                }
              />
              <Toggle
                name="featured"
                label="Featured"
                hint="Eligible for the home page highlight."
                defaultChecked={
                  submitted ? values.featured === "true" : (post?.featured ?? false)
                }
              />
              <Toggle
                name="listedOnBlog"
                label="List on blog page"
                hint="Unticked hides it from the blog listing and the home page. The post is still published and still live at its own address — readers reach it only through a newsletter's Read-full-article link."
                defaultChecked={
                  submitted
                    ? values.listedOnBlog === "true"
                    : (post?.listedOnBlog ?? true)
                }
              />
              <Field
                label="Publication date"
                htmlFor="b-date"
                hint="Leave blank to stamp with today's date when first published."
                error={errors.publishedAt}
              >
                <Input
                  id="b-date"
                  name="publishedAt"
                  type="date"
                  defaultValue={values.publishedAt ?? toDateInput(post?.publishedAt)}
                  className="max-w-52"
                />
              </Field>
            </FormSection>

            {genError && (
              <p role="alert" className="text-sm font-medium text-red-600 dark:text-red-400">
                {genError}
              </p>
            )}
          </div>
        );
      }}
    </AdminForm>

    {cropTarget && (
      <ImageCropModal
        open
        image={cropTarget.src}
        defaultAspect={cropTarget.mode === "cover" ? 16 / 9 : undefined}
        onClose={() => {
          URL.revokeObjectURL(cropTarget.src);
          setCropTarget(null);
        }}
        onCropComplete={handleCropConfirm}
      />
    )}
    </>
  );
}
