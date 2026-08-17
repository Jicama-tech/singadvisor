
import { useState, type ChangeEvent } from "react";
import { saveHeroSection } from "@/app/admin/actions";
import { AdminForm, FormSection } from "@/components/admin/AdminForm";
import { HeroSection } from "@/components/landing/HeroSection";
import { PreviewFrame } from "@/components/admin/landing/PreviewFrame";
import { VariantPicker } from "@/components/admin/landing/VariantPicker";
import { Field, Input, Textarea } from "@/components/ui/Field";
import type { HeroContent, LandingVariant } from "@/lib/landing-client";

export function HeroSectionForm({
  content,
  variant: initialVariant,
  trainingCount,
}: {
  content: HeroContent;
  variant: LandingVariant;
  trainingCount: number;
}) {
  const [live, setLive] = useState(content);
  const [variant, setVariant] = useState(initialVariant);

  // Mirrors whatever field just changed into the preview — the inputs stay
  // uncontrolled (defaultValue) so the existing FormState "keep what you
  // typed" resilience is untouched; this just also keeps a live copy.
  // The event delegates from a wrapping <div> (see below), so `target` is
  // typed as HTMLDivElement even though it's really whichever field
  // changed — the DOM object at runtime does have name/value.
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
    const url = URL.createObjectURL(file);
    if (e.target.name === "videoFile") setLive((prev) => ({ ...prev, videoSrc: url }));
    else if (e.target.name === "posterFile") setLive((prev) => ({ ...prev, posterSrc: url }));
  }

  return (
    <AdminForm action={saveHeroSection} cancelHref="/admin/landing" submitLabel="Save changes" wide>
      {(errors, values) => (
        <div onChange={handleChange} className="flex flex-col gap-6">
          <FormSection title="Style">
            <VariantPicker value={variant} onChange={setVariant} />
          </FormSection>

          <PreviewFrame>
            <HeroSection content={live} variant={variant} trainingCount={trainingCount} />
          </PreviewFrame>

          <FormSection title="Badge & headline">
            <Field label="Badge text" htmlFor="h-eyebrow" required error={errors.eyebrow}>
              <Input
                id="h-eyebrow"
                name="eyebrow"
                required
                defaultValue={values.eyebrow ?? content.eyebrow}
              />
            </Field>

            <Field
              label="Headline, line 1"
              htmlFor="h-title"
              required
              error={errors.title}
            >
              <Input id="h-title" name="title" required defaultValue={values.title ?? content.title} />
            </Field>

            <Field
              label="Headline, line 2"
              htmlFor="h-titleAccent"
              hint="Shown on its own line, in the accent colour."
              required
              error={errors.titleAccent}
            >
              <Input
                id="h-titleAccent"
                name="titleAccent"
                required
                defaultValue={values.titleAccent ?? content.titleAccent}
              />
            </Field>

            <Field label="Description" htmlFor="h-description" required error={errors.description}>
              <Textarea
                id="h-description"
                name="description"
                rows={3}
                required
                defaultValue={values.description ?? content.description}
              />
            </Field>
          </FormSection>

          <FormSection title="Buttons">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Primary button label" htmlFor="h-primaryCtaLabel" required error={errors.primaryCtaLabel}
                hint='Use "{count}" for the live published-training count.'
              >
                <Input
                  id="h-primaryCtaLabel"
                  name="primaryCtaLabel"
                  required
                  defaultValue={values.primaryCtaLabel ?? content.primaryCtaLabel}
                />
              </Field>
              <Field label="Primary button link" htmlFor="h-primaryCtaHref" required error={errors.primaryCtaHref}>
                <Input
                  id="h-primaryCtaHref"
                  name="primaryCtaHref"
                  required
                  defaultValue={values.primaryCtaHref ?? content.primaryCtaHref}
                />
              </Field>
              <Field label="Secondary button label" htmlFor="h-secondaryCtaLabel" required error={errors.secondaryCtaLabel}>
                <Input
                  id="h-secondaryCtaLabel"
                  name="secondaryCtaLabel"
                  required
                  defaultValue={values.secondaryCtaLabel ?? content.secondaryCtaLabel}
                />
              </Field>
              <Field label="Secondary button link" htmlFor="h-secondaryCtaHref" required error={errors.secondaryCtaHref}>
                <Input
                  id="h-secondaryCtaHref"
                  name="secondaryCtaHref"
                  required
                  defaultValue={values.secondaryCtaHref ?? content.secondaryCtaHref}
                />
              </Field>
            </div>
          </FormSection>

          <FormSection
            title="Background video"
            description="Upload a new file, or leave blank to keep the current one. Uploading replaces the path below when you save."
          >
            <Field label="Upload video" htmlFor="h-videoFile" hint="MP4 or WebM, up to 50MB.">
              <Input
                id="h-videoFile"
                name="videoFile"
                type="file"
                accept="video/mp4,video/webm"
                onChange={handleFileChange}
                className="file:mr-3 file:rounded-full file:border-0 file:bg-[var(--accent)] file:px-4 file:py-2 file:text-sm file:font-medium file:text-[var(--accent-foreground)] hover:file:bg-[var(--accent-hover)]"
              />
            </Field>
            <Field label="Video path" htmlFor="h-videoSrc" required error={errors.videoSrc}>
              <Input id="h-videoSrc" name="videoSrc" required defaultValue={values.videoSrc ?? content.videoSrc} />
            </Field>

            <Field label="Upload poster image" htmlFor="h-posterFile" hint="Shown while the video loads. JPEG, PNG, WebP or GIF.">
              <Input
                id="h-posterFile"
                name="posterFile"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handleFileChange}
                className="file:mr-3 file:rounded-full file:border-0 file:bg-[var(--accent)] file:px-4 file:py-2 file:text-sm file:font-medium file:text-[var(--accent-foreground)] hover:file:bg-[var(--accent-hover)]"
              />
            </Field>
            <Field
              label="Poster image path"
              htmlFor="h-posterSrc"
              required
              error={errors.posterSrc}
            >
              <Input
                id="h-posterSrc"
                name="posterSrc"
                required
                defaultValue={values.posterSrc ?? content.posterSrc}
              />
            </Field>
          </FormSection>
        </div>
      )}
    </AdminForm>
  );
}
