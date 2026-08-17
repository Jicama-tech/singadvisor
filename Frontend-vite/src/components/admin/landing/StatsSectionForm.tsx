
import { useState, type ChangeEvent } from "react";
import { saveStatsSection } from "@/app/admin/actions";
import type { FormState } from "@/lib/form-state";
import { AdminForm, FormSection } from "@/components/admin/AdminForm";
import { PreviewFrame } from "@/components/admin/landing/PreviewFrame";
import { VariantPicker } from "@/components/admin/landing/VariantPicker";
import { StatsSection } from "@/components/landing/StatsSection";
import { Field, Textarea } from "@/components/ui/Field";
import type { LandingVariant, StatsContent } from "@/lib/landing-client";

function itemsToLines(items: StatsContent["items"]): string {
  return items.map((s) => `${s.value} | ${s.label}`).join("\n");
}

function linesToItems(text: string): StatsContent["items"] {
  return text
    .split("\n")
    .map((line) => {
      const [value, label] = line.split("|");
      return { value: (value ?? "").trim(), label: (label ?? "").trim() };
    })
    .filter((item) => item.value && item.label);
}

export function StatsSectionForm({
  action = saveStatsSection,
  content,
  variant: initialVariant,
}: {
  action?: (formData: FormData) => Promise<FormState | void>;
  content: StatsContent;
  variant: LandingVariant;
}) {
  const [live, setLive] = useState(content);
  const [variant, setVariant] = useState(initialVariant);

  function handleChange(e: ChangeEvent<HTMLDivElement>) {
    const target = e.target as unknown as HTMLTextAreaElement;
    if (target.name === "items") setLive({ items: linesToItems(target.value) });
  }

  return (
    <AdminForm action={action} cancelHref="/admin/landing" submitLabel="Save changes" wide>
      {(errors, values) => (
        <div onChange={handleChange} className="flex flex-col gap-6">
          <FormSection title="Style">
            <VariantPicker value={variant} onChange={setVariant} />
          </FormSection>

          <PreviewFrame>
            <StatsSection content={live} variant={variant} />
          </PreviewFrame>

          <FormSection
            title="Stats"
            description='One per line, as "value | label" — e.g. "12,000+ | People trained".'
          >
            <Field label="Stats" htmlFor="s-items" error={errors.items}>
              <Textarea
                id="s-items"
                name="items"
                rows={6}
                defaultValue={values.items ?? itemsToLines(content.items)}
                placeholder={"12,000+ | People trained\n180+ | Corporate programmes"}
              />
            </Field>
          </FormSection>
        </div>
      )}
    </AdminForm>
  );
}
