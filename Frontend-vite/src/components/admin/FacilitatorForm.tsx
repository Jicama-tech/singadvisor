import { useRef, useState } from "react";
import { uploadContentImage } from "@/adminActions";
import type { FormState } from "@/lib/form-state";
import { AdminForm, FormSection } from "@/components/admin/AdminForm";
import { ImageCropModal } from "@/components/admin/ImageCropModal";
import { AppImage as Image } from "@/components/ui/AppImage";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { withBackendUrl } from "@/lib/media-url";

type Facilitator = {
  id: string;
  name: string;
  title: string;
  bio: string;
  photo: string;
  linkedin: string | null;
};

/**
 * The photo uploads the moment its crop is confirmed — the blog cover image's
 * flow (PostForm) — so the form only ever submits the stored path, in the
 * hidden `photo` input.
 */
export function FacilitatorForm({
  facilitator,
  action,
}: {
  facilitator?: Facilitator;
  action: (formData: FormData) => Promise<FormState | void>;
}) {
  const [photo, setPhoto] = useState(facilitator?.photo ?? "");
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setCropSrc(URL.createObjectURL(file));
  }

  function closeCrop() {
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropSrc(null);
  }

  async function handleCropConfirm(croppedFile: File) {
    closeCrop();
    setPhotoError(null);
    setUploading(true);
    try {
      const { url } = await uploadContentImage(croppedFile);
      setPhoto(url);
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : "Could not upload the photo.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <>
      <AdminForm
        action={action}
        id={facilitator?.id}
        cancelHref="/admin/trainings/facilitators"
        submitLabel={facilitator ? "Save changes" : "Create facilitator"}
      >
        {(errors, values) => (
          <>
            <FormSection
              title="Profile"
              description="Shown on every training they facilitate, and in the About page's team section."
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Name" htmlFor="f-name" required error={errors.name}>
                  <Input id="f-name" name="name" required defaultValue={values.name ?? facilitator?.name} />
                </Field>

                <Field
                  label="Title"
                  htmlFor="f-title"
                  hint="Their role, e.g. Lead Facilitator, Leadership & Life Skills"
                  error={errors.title}
                >
                  <Input id="f-title" name="title" defaultValue={values.title ?? facilitator?.title} />
                </Field>
              </div>

              <Field label="Bio" htmlFor="f-bio" hint="A short paragraph in the third person." error={errors.bio}>
                <Textarea id="f-bio" name="bio" rows={5} defaultValue={values.bio ?? facilitator?.bio} />
              </Field>

              <Field label="LinkedIn" htmlFor="f-linkedin" hint="Full profile URL. Optional." error={errors.linkedin}>
                <Input
                  id="f-linkedin"
                  name="linkedin"
                  type="url"
                  placeholder="https://www.linkedin.com/in/…"
                  defaultValue={values.linkedin ?? facilitator?.linkedin ?? ""}
                />
              </Field>
            </FormSection>

            <FormSection title="Photo" description="Shown in a circle, so it is cropped square.">
              <input type="hidden" name="photo" value={photo} />
              <div className="flex flex-wrap items-center gap-5">
                <div className="relative grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-full surface-sunken text-[var(--text-muted)]">
                  {photo ? (
                    <Image src={withBackendUrl(photo)} alt="" fill className="object-cover" />
                  ) : (
                    <Icon name="users" size={24} />
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={uploading}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Icon name="upload" size={15} />
                    {uploading ? "Uploading…" : photo ? "Change photo" : "Upload photo"}
                  </Button>
                  {photo && !uploading && (
                    <Button type="button" variant="ghost" size="sm" onClick={() => setPhoto("")}>
                      Remove
                    </Button>
                  )}
                </div>
              </div>
              {photoError && (
                <p role="alert" className="text-sm text-red-600 dark:text-red-400">
                  {photoError}
                </p>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handleFileChange}
                className="hidden"
              />
            </FormSection>
          </>
        )}
      </AdminForm>

      {cropSrc && (
        <ImageCropModal
          open
          image={cropSrc}
          defaultAspect={1}
          onClose={closeCrop}
          onCropComplete={handleCropConfirm}
        />
      )}
    </>
  );
}
