
import { useState, type ChangeEvent } from "react";
import { saveCtaSection } from "@/app/admin/actions";
import type { FormState } from "@/lib/form-state";
import { AdminForm, FormSection } from "@/components/admin/AdminForm";
import { PreviewFrame } from "@/components/admin/landing/PreviewFrame";
import { VariantPicker } from "@/components/admin/landing/VariantPicker";
import { CtaSection } from "@/components/landing/CtaSection";
import { Field, Input, Textarea } from "@/components/ui/Field";
import type { CtaContent, LandingVariant } from "@/lib/landing-client";

export function CtaSectionForm({
  action = saveCtaSection,
  content,
  variant: initialVariant,
}: {
  action?: (formData: FormData) => Promise<FormState | void>;
  content: CtaContent;
  variant: LandingVariant;
}) {
  const [live, setLive] = useState(content);
  const [variant, setVariant] = useState(initialVariant);

  function handleChange(e: ChangeEvent<HTMLDivElement>) {
    const target = e.target as HTMLInputElement | HTMLTextAreaElement;
    if (target.name in live) setLive((prev) => ({ ...prev, [target.name]: target.value }));
  }

  return (
    <AdminForm action={action} cancelHref="/admin/landing" submitLabel="Save changes" wide>
      {(errors, values) => (
        <div onChange={handleChange} className="flex flex-col gap-6">
          <FormSection title="Style">
            <VariantPicker value={variant} onChange={setVariant} />
          </FormSection>

          <PreviewFrame>
            <CtaSection content={live} variant={variant} />
          </PreviewFrame>

          <FormSection title="Closing call-to-action">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Title" htmlFor="cta-title" required error={errors.title}>
                <Input id="cta-title" name="title" required defaultValue={values.title ?? content.title} />
              </Field>
              <Field label="Description" htmlFor="cta-description" required error={errors.description}>
                <Textarea
                  id="cta-description"
                  name="description"
                  rows={2}
                  required
                  defaultValue={values.description ?? content.description}
                />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Primary button label" htmlFor="cta-primaryCtaLabel" required error={errors.primaryCtaLabel}>
                <Input
                  id="cta-primaryCtaLabel"
                  name="primaryCtaLabel"
                  required
                  defaultValue={values.primaryCtaLabel ?? content.primaryCtaLabel}
                />
              </Field>
              <Field label="Primary button link" htmlFor="cta-primaryCtaHref" required error={errors.primaryCtaHref}>
                <Input
                  id="cta-primaryCtaHref"
                  name="primaryCtaHref"
                  required
                  defaultValue={values.primaryCtaHref ?? content.primaryCtaHref}
                />
              </Field>
              <Field label="Secondary button label" htmlFor="cta-secondaryCtaLabel" required error={errors.secondaryCtaLabel}>
                <Input
                  id="cta-secondaryCtaLabel"
                  name="secondaryCtaLabel"
                  required
                  defaultValue={values.secondaryCtaLabel ?? content.secondaryCtaLabel}
                />
              </Field>
              <Field label="Secondary button link" htmlFor="cta-secondaryCtaHref" required error={errors.secondaryCtaHref}>
                <Input
                  id="cta-secondaryCtaHref"
                  name="secondaryCtaHref"
                  required
                  defaultValue={values.secondaryCtaHref ?? content.secondaryCtaHref}
                />
              </Field>
            </div>
          </FormSection>
        </div>
      )}
    </AdminForm>
  );
}
