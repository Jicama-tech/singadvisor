"use client";

import { useState, type ChangeEvent } from "react";
import { savePillarsSection } from "@/app/admin/actions";
import { AdminForm, FormSection } from "@/components/admin/AdminForm";
import { PreviewFrame } from "@/components/admin/landing/PreviewFrame";
import { VariantPicker } from "@/components/admin/landing/VariantPicker";
import { PillarsSection } from "@/components/landing/PillarsSection";
import { Field, Input, Textarea } from "@/components/ui/Field";
import type { LandingVariant, PillarsContent } from "@/lib/landing-client";

// Fixed order/labels — matches PILLAR_NAV in the shared PillarsSection. The
// icon and link target for each of these four are site navigation, not
// editable here.
const PILLAR_META = ["Trainings", "Events", "Consultancy", "Careers"] as const;

const FIELD_PATTERN = /^pillar(\d)(Title|Description)$/;

export function PillarsSectionForm({
  content,
  variant: initialVariant,
}: {
  content: PillarsContent;
  variant: LandingVariant;
}) {
  const [live, setLive] = useState(content);
  const [variant, setVariant] = useState(initialVariant);

  function handleChange(e: ChangeEvent<HTMLDivElement>) {
    const target = e.target as HTMLInputElement | HTMLTextAreaElement;
    const match = FIELD_PATTERN.exec(target.name);
    if (!match) return;
    const index = Number(match[1]);
    const key = match[2] === "Title" ? "title" : "description";
    setLive((prev) => ({
      items: prev.items.map((item, i) => (i === index ? { ...item, [key]: target.value } : item)),
    }));
  }

  return (
    <AdminForm action={savePillarsSection} cancelHref="/admin/landing" submitLabel="Save changes" wide>
      {(errors, values) => (
        <div onChange={handleChange} className="flex flex-col gap-6">
          <FormSection title="Style">
            <VariantPicker value={variant} onChange={setVariant} />
          </FormSection>

          <PreviewFrame>
            <PillarsSection content={live} variant={variant} />
          </PreviewFrame>

          {PILLAR_META.map((label, i) => {
            const item = content.items[i];
            return (
              <FormSection key={label} title={`Pillar ${i + 1} — ${label}`}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field
                    label="Title"
                    htmlFor={`p-${i}-title`}
                    required
                    error={errors[`pillar${i}Title`]}
                  >
                    <Input
                      id={`p-${i}-title`}
                      name={`pillar${i}Title`}
                      required
                      defaultValue={values[`pillar${i}Title`] ?? item?.title}
                    />
                  </Field>
                  <Field
                    label="Description"
                    htmlFor={`p-${i}-description`}
                    required
                    error={errors[`pillar${i}Description`]}
                  >
                    <Textarea
                      id={`p-${i}-description`}
                      name={`pillar${i}Description`}
                      rows={2}
                      required
                      defaultValue={values[`pillar${i}Description`] ?? item?.description}
                    />
                  </Field>
                </div>
              </FormSection>
            );
          })}
        </div>
      )}
    </AdminForm>
  );
}
