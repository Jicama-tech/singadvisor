import { useRef, useState } from "react";
import { saveNewsletter, uploadNewsletterImage } from "@/adminActions";
import type { FormState } from "@/lib/form-state";
import { AdminForm, FormActionsRow, FormSection, Toggle } from "@/components/admin/AdminForm";
import { PageHeading } from "@/components/admin/AdminUI";
import { ImageCropModal } from "@/components/admin/ImageCropModal";
import { AppImage as Image } from "@/components/ui/AppImage";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { withBackendUrl } from "@/lib/media-url";

type Newsletter = {
  id: string;
  slug: string;
  title: string;
  image: string;
  imageAlt: string;
  message: string;
  referenceLink: string;
  published: boolean;
};

const MAX_WORDS = 500;
function wordCount(text: string): number {
  const trimmed = text.trim();
  return trimmed === "" ? 0 : trimmed.split(/\s+/).length;
}

/**
 * Same field set as jicamaTech's NewsletterEditorModal (image, <=500-word
 * message, reference link) — rebuilt as a full page in SingAdvisor's own
 * light admin theme, same cropped-image-upload flow as PostForm's cover
 * image, and wired to this app's own Newsletter module/DB.
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
  const [messageValue, setMessageValue] = useState(newsletter?.message ?? "");
  const [imageUrl, setImageUrl] = useState(newsletter?.image ?? "");
  const [imageUploading, setImageUploading] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [genError, setGenError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const words = wordCount(messageValue);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setCropSrc(URL.createObjectURL(file));
  }

  async function handleCropConfirm(croppedFile: File) {
    const src = cropSrc;
    setCropSrc(null);
    if (!src) return;
    try {
      setImageUploading(true);
      const { url } = await uploadNewsletterImage(croppedFile);
      setImageUrl(url);
    } catch (err) {
      setGenError(err instanceof Error ? err.message : "Could not upload the image.");
    } finally {
      setImageUploading(false);
      URL.revokeObjectURL(src);
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

            <input type="hidden" name="image" value={imageUrl} />

            <FormSection title="Content">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Title" htmlFor="n-title" required error={errors.title}>
                  <Input
                    id="n-title"
                    name="title"
                    required
                    value={titleValue}
                    onChange={(e) => setTitleValue(e.target.value)}
                  />
                </Field>

                <Field
                  label="URL slug"
                  htmlFor="n-slug"
                  hint="Leave blank to generate from the title."
                  error={errors.slug}
                >
                  <Input
                    id="n-slug"
                    name="slug"
                    defaultValue={values.slug ?? newsletter?.slug}
                    placeholder="august-2026-issue"
                  />
                </Field>
              </div>

              <Field label="Image" htmlFor="n-image-file" required error={errors.image}>
                {imageUrl ? (
                  <div className="relative mb-1 h-48 w-full max-w-md overflow-hidden rounded-xl surface-sunken">
                    <Image src={withBackendUrl(imageUrl)} alt="" fill sizes="28rem" className="object-cover" />
                    <div className="absolute right-2 top-2 flex gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="rounded-lg bg-black/70 px-3 py-1.5 text-xs font-medium text-white hover:bg-black/80"
                      >
                        Change
                      </button>
                      <button
                        type="button"
                        onClick={() => setImageUrl("")}
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
                    onClick={() => fileInputRef.current?.click()}
                    disabled={imageUploading}
                    className="flex h-32 w-full max-w-md flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[var(--border-strong)] text-[var(--text-muted)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:opacity-60"
                  >
                    <Icon name="upload" size={20} />
                    <span className="text-sm">{imageUploading ? "Uploading…" : "Upload image"}</span>
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  id="n-image-file"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  hidden
                  onChange={handleFileChange}
                />
              </Field>

              <Field
                label="Message"
                htmlFor="n-message"
                required
                hint={`${words}/${MAX_WORDS} words`}
                error={errors.message}
              >
                <Textarea
                  id="n-message"
                  name="message"
                  rows={8}
                  required
                  value={messageValue}
                  onChange={(e) => setMessageValue(e.target.value)}
                  aria-invalid={words > MAX_WORDS}
                />
                {words > MAX_WORDS && (
                  <p role="alert" className="text-xs font-medium text-red-600 dark:text-red-400">
                    Over the {MAX_WORDS}-word limit by {words - MAX_WORDS}.
                  </p>
                )}
              </Field>

              <Field
                label="Reference link"
                htmlFor="n-referenceLink"
                required
                hint="Where “Read full article” sends the reader — any URL."
                error={errors.referenceLink}
              >
                <Input
                  id="n-referenceLink"
                  name="referenceLink"
                  type="url"
                  required
                  placeholder="https://singadvisor.com/blog/..."
                  defaultValue={values.referenceLink ?? newsletter?.referenceLink}
                />
              </Field>
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

      {cropSrc && (
        <ImageCropModal
          open
          image={cropSrc}
          defaultAspect={16 / 9}
          onClose={() => {
            URL.revokeObjectURL(cropSrc);
            setCropSrc(null);
          }}
          onCropComplete={handleCropConfirm}
        />
      )}
    </>
  );
}
