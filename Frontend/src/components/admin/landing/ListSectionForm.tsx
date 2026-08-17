"use client";

import { useState, type ChangeEvent } from "react";
import { AdminForm, FormSection } from "@/components/admin/AdminForm";
import { PreviewFrame } from "@/components/admin/landing/PreviewFrame";
import { VariantPicker } from "@/components/admin/landing/VariantPicker";
import { CareersSection, type JobListItem } from "@/components/landing/CareersSection";
import { EventsSection } from "@/components/landing/EventsSection";
import { TrainingsSection } from "@/components/landing/TrainingsSection";
import { BlogSection } from "@/components/landing/BlogSection";
import type { EventCardData } from "@/components/cards/EventCard";
import type { PostCardData } from "@/components/cards/PostCard";
import type { TrainingCardData } from "@/components/cards/TrainingCard";
import { Field, Input, Textarea } from "@/components/ui/Field";
import type { FormState } from "@/lib/form-state";
import type { LandingVariant, ListContent } from "@/lib/landing-client";

type ListKind = "trainings" | "events" | "careers" | "blog";

/**
 * Shared by the four DB-driven sections (trainings/events/careers/blog).
 * Only the surrounding copy, item count, and style are editable here — the
 * actual items are managed on their own dedicated admin pages, unchanged.
 *
 * `items` is a real sample fetched once server-side (a Client Component
 * can't call back into Prisma) — the "Items to show" field then slices it
 * live, client-side, so that field's preview stays reactive without another
 * server round trip.
 */
export function ListSectionForm({
  content,
  variant: initialVariant,
  action,
  managedElsewhereLabel,
  kind,
  items,
}: {
  content: ListContent;
  variant: LandingVariant;
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  managedElsewhereLabel: string;
  kind: ListKind;
  items: TrainingCardData[] | EventCardData[] | JobListItem[] | PostCardData[];
}) {
  const [live, setLive] = useState(content);
  const [variant, setVariant] = useState(initialVariant);

  function handleChange(e: ChangeEvent<HTMLDivElement>) {
    const { name, value } = e.target as HTMLInputElement | HTMLTextAreaElement;
    if (name === "take") {
      const take = Number(value);
      setLive((prev) => ({ ...prev, take: Number.isFinite(take) ? take : prev.take }));
    } else if (name in live) {
      setLive((prev) => ({ ...prev, [name]: value }));
    }
  }

  const sliced = items.slice(0, Math.max(1, live.take));

  return (
    <AdminForm action={action} cancelHref="/admin/landing" submitLabel="Save changes" wide>
      {(errors, values) => (
        <div onChange={handleChange} className="flex flex-col gap-6">
          <FormSection title="Style">
            <VariantPicker value={variant} onChange={setVariant} />
          </FormSection>

          <PreviewFrame>
            {kind === "trainings" && (
              <TrainingsSection content={live} variant={variant} items={sliced as TrainingCardData[]} />
            )}
            {kind === "events" && (
              <EventsSection content={live} variant={variant} items={sliced as EventCardData[]} />
            )}
            {kind === "careers" && (
              <CareersSection content={live} variant={variant} items={sliced as JobListItem[]} />
            )}
            {kind === "blog" && <BlogSection content={live} variant={variant} items={sliced as PostCardData[]} />}
          </PreviewFrame>

          <FormSection
            title="Section copy"
            description={`Items themselves are managed under ${managedElsewhereLabel}.`}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Eyebrow" htmlFor="l-eyebrow" required error={errors.eyebrow}>
                <Input id="l-eyebrow" name="eyebrow" required defaultValue={values.eyebrow ?? content.eyebrow} />
              </Field>
              <Field label="Title" htmlFor="l-title" required error={errors.title}>
                <Input id="l-title" name="title" required defaultValue={values.title ?? content.title} />
              </Field>
            </div>
            <Field label="Description" htmlFor="l-description" required error={errors.description}>
              <Textarea
                id="l-description"
                name="description"
                rows={2}
                required
                defaultValue={values.description ?? content.description}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Link label" htmlFor="l-ctaLabel" required error={errors.ctaLabel}>
                <Input id="l-ctaLabel" name="ctaLabel" required defaultValue={values.ctaLabel ?? content.ctaLabel} />
              </Field>
              <Field label="Link target" htmlFor="l-ctaHref" required error={errors.ctaHref}>
                <Input id="l-ctaHref" name="ctaHref" required defaultValue={values.ctaHref ?? content.ctaHref} />
              </Field>
              <Field
                label="Items to show"
                htmlFor="l-take"
                hint="1–12"
                error={errors.take}
              >
                <Input
                  id="l-take"
                  name="take"
                  type="number"
                  min="1"
                  max="12"
                  defaultValue={values.take ?? content.take}
                />
              </Field>
            </div>
          </FormSection>
        </div>
      )}
    </AdminForm>
  );
}
