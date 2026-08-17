
import { useState, type ChangeEvent } from "react";
import { saveConsultancySection } from "@/app/admin/actions";
import type { FormState } from "@/lib/form-state";
import { AdminForm, FormSection } from "@/components/admin/AdminForm";
import { PreviewFrame } from "@/components/admin/landing/PreviewFrame";
import { VariantPicker } from "@/components/admin/landing/VariantPicker";
import { ConsultancySection } from "@/components/landing/ConsultancySection";
import { Field, Input, Textarea } from "@/components/ui/Field";
import type { ConsultancyContent, LandingVariant } from "@/lib/landing-client";

type Service = { id: string; slug: string; title: string; summary: string };

export function ConsultancySectionForm({
  action = saveConsultancySection,
  content,
  variant: initialVariant,
  services,
}: {
  action?: (formData: FormData) => Promise<FormState | void>;
  content: ConsultancyContent;
  variant: LandingVariant;
  services: Service[];
}) {
  const [live, setLive] = useState(content);
  const [variant, setVariant] = useState(initialVariant);

  function handleChange(e: ChangeEvent<HTMLDivElement>) {
    const target = e.target as HTMLInputElement | HTMLTextAreaElement;
    if (target.type === "file") return; // handled by handleFileChange below
    if (target.name in live) setLive((prev) => ({ ...prev, [target.name]: target.value }));
  }

  // A chosen file only previews locally (a blob: URL) until Save actually
  // uploads it — the text path field is left alone so it still reflects
  // what's really saved if the upload is never submitted.
  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLive((prev) => ({ ...prev, image: URL.createObjectURL(file) }));
  }

  return (
    <AdminForm action={action} cancelHref="/admin/landing" submitLabel="Save changes" wide>
      {(errors, values) => (
        <div onChange={handleChange} className="flex flex-col gap-6">
          <FormSection title="Style">
            <VariantPicker value={variant} onChange={setVariant} />
          </FormSection>

          <PreviewFrame>
            <ConsultancySection content={live} variant={variant} services={services} />
          </PreviewFrame>

          <FormSection
            title="Consultancy"
            description="The services list itself is managed under Consultancy — this is just the surrounding copy and image."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Eyebrow" htmlFor="c-eyebrow" required error={errors.eyebrow}>
                <Input id="c-eyebrow" name="eyebrow" required defaultValue={values.eyebrow ?? content.eyebrow} />
              </Field>
              <Field label="Title" htmlFor="c-title" required error={errors.title}>
                <Input id="c-title" name="title" required defaultValue={values.title ?? content.title} />
              </Field>
            </div>
            <Field label="Description" htmlFor="c-description" required error={errors.description}>
              <Textarea
                id="c-description"
                name="description"
                rows={3}
                required
                defaultValue={values.description ?? content.description}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Upload image" htmlFor="c-imageFile" hint="JPEG, PNG, WebP or GIF.">
                <Input
                  id="c-imageFile"
                  name="imageFile"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={handleFileChange}
                  className="file:mr-3 file:rounded-full file:border-0 file:bg-[var(--accent)] file:px-4 file:py-2 file:text-sm file:font-medium file:text-[var(--accent-foreground)] hover:file:bg-[var(--accent-hover)]"
                />
              </Field>
              <Field
                label="Image path"
                htmlFor="c-image"
                hint="A path under /public, e.g. /Images/Trainingimgae/consultancy.jpg — or leave as-is after uploading above."
                required
                error={errors.image}
              >
                <Input id="c-image" name="image" required defaultValue={values.image ?? content.image} />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Button label" htmlFor="c-ctaLabel" required error={errors.ctaLabel}>
                <Input id="c-ctaLabel" name="ctaLabel" required defaultValue={values.ctaLabel ?? content.ctaLabel} />
              </Field>
              <Field label="Button link" htmlFor="c-ctaHref" required error={errors.ctaHref}>
                <Input id="c-ctaHref" name="ctaHref" required defaultValue={values.ctaHref ?? content.ctaHref} />
              </Field>
            </div>
          </FormSection>
        </div>
      )}
    </AdminForm>
  );
}
