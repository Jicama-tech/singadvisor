import { useEffect, useRef, useState } from "react";
import { ImageCropModal } from "@/components/admin/ImageCropModal";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { uploadContentImage } from "@/adminActions";
import { withBackendUrl } from "@/lib/media-url";

/**
 * Browse → crop → upload, for the cover image on a content record (a
 * training, and any other domain whose admin form still posts a plain URL
 * string).
 *
 * Deliberately NOT CroppedImageField, which looks adjacent but is a different
 * mechanism for a different form. That one leaves the *file* in a hidden
 * <input type="file"> for a multipart submit, and resolves its preview with
 * withEventshUrl because every one of its callers is an EventForm field whose
 * images live on eventsh. Neither holds here: TrainingForm posts JSON through
 * saveTraining, so what the form needs is a path STRING; and the file goes to
 * this app's own Backend, so the preview must resolve with withBackendUrl or
 * an already-saved image renders broken against the wrong origin.
 *
 * So the upload happens here, on crop, and the resulting "/uploads/content/…"
 * path is written into a hidden text input under `name` — which is exactly
 * what the URL text box this replaces used to submit. saveTraining is
 * unchanged and never learns the difference.
 *
 * Uploading on crop rather than on form submit means an image picked and then
 * abandoned leaves an orphan file in uploads/content. That is the same bargain
 * every other upload widget in this admin already makes (RichTextEditor's
 * inline images, FacilitatorForm's photo), and the alternative — deferring the
 * upload to submit — costs the preview, which is the point of the control.
 */
export function CoverImageField({
  name,
  value,
  label = "Cover image",
  hint,
  aspect = 16 / 9,
}: {
  name: string;
  /** The currently saved path. May be an old /Images/... public path, an
   * /uploads/... path, or an absolute URL — all three render. */
  value?: string;
  label?: string;
  hint?: string;
  aspect?: number;
}) {
  const [path, setPath] = useState(value ?? "");
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputId = `${name}-upload`;

  // The form mounts before the record loads on an edit page, so the saved
  // path arrives after the first render.
  useEffect(() => {
    setPath(value ?? "");
  }, [value]);

  // Object URLs for the crop source are revoked once the modal closes —
  // without this every picked file leaks for the life of the page.
  useEffect(() => {
    return () => {
      if (cropSrc) URL.revokeObjectURL(cropSrc);
    };
  }, [cropSrc]);

  function handlePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    // Cleared so picking the SAME file twice still fires a change event —
    // otherwise re-cropping an image you just replaced silently does nothing.
    e.target.value = "";
    if (!file) return;
    setError(null);
    setCropSrc(URL.createObjectURL(file));
  }

  async function handleCropped(file: File) {
    setCropSrc(null);
    setUploading(true);
    setError(null);
    try {
      const { url } = await uploadContentImage(file);
      setPath(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not upload the image.");
    } finally {
      setUploading(false);
    }
  }

  const preview = withBackendUrl(path);

  return (
    <div>
      <span className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]">{label}</span>

      <div className="flex flex-wrap items-start gap-4">
        <label
          htmlFor={inputId}
          className="grid aspect-video w-56 max-w-full cursor-pointer place-items-center overflow-hidden rounded-[var(--radius-card)] border-2 border-dashed border-[var(--border-strong)] bg-[var(--surface-sunken)] transition-colors hover:border-[var(--accent)]"
        >
          {preview ? (
            <img src={preview} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="flex flex-col items-center gap-1 text-[var(--text-muted)]">
              <Icon name="image" size={20} />
              <span className="text-xs">Choose an image</span>
            </span>
          )}
        </label>

        <div className="flex flex-col gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            <Icon name="upload" size={15} />
            {uploading ? "Uploading…" : path ? "Replace image" : "Browse…"}
          </Button>

          {path && !uploading && (
            <Button type="button" variant="ghost" size="sm" onClick={() => setPath("")}>
              <Icon name="trash" size={15} />
              Remove
            </Button>
          )}

          <p className="max-w-[16rem] text-xs text-[var(--text-muted)]">
            {hint ?? "JPEG, PNG, WebP or GIF. You'll crop it before it uploads, and it's saved as WebP."}
          </p>
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-2 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      <input
        ref={fileInputRef}
        id={inputId}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={handlePick}
        className="hidden"
      />
      {/* What the surrounding form actually submits — the same string the URL
          text box used to carry, so the action behind it is untouched. */}
      <input type="hidden" name={name} value={path} />

      {cropSrc && (
        <ImageCropModal
          open
          image={cropSrc}
          defaultAspect={aspect}
          outputType="image/webp"
          onClose={() => setCropSrc(null)}
          onCropComplete={handleCropped}
        />
      )}
    </div>
  );
}
