"use client";

import { saveTraining } from "@/app/admin/actions";
import { AdminForm, FormSection, Toggle } from "@/components/admin/AdminForm";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { TRAINING_CATEGORIES, TRAINING_FORMATS } from "@/lib/constants";
import { jsonToLines } from "@/lib/utils";

type Training = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  description: string;
  image: string;
  category: string;
  level: string;
  durationHrs: number;
  format: string;
  priceCents: number;
  outcomes: string;
  modules: string;
  published: boolean;
  featured: boolean;
  sortOrder: number;
  trainerId: string | null;
};

export function TrainingForm({
  training,
  trainers,
}: {
  training?: Training;
  trainers: { id: string; name: string }[];
}) {
  return (
    <AdminForm
      action={saveTraining}
      id={training?.id}
      cancelHref="/admin/trainings"
      submitLabel={training ? "Save changes" : "Create training"}
    >
      {(errors, values) => {
        // Unchecked boxes are absent from FormData entirely, so we can only
        // read a checkbox back if we know a submission actually happened.
        const submitted = Object.keys(values).length > 0;
        return (
        <>
          <FormSection title="Basics">
            <Field label="Title" htmlFor="t-title" required error={errors.title}>
              <Input id="t-title" name="title" required defaultValue={values.title ?? training?.title} />
            </Field>

            <Field
              label="URL slug"
              htmlFor="t-slug"
              hint="Leave blank to generate from the title."
              error={errors.slug}
            >
              <Input id="t-slug" name="slug" defaultValue={values.slug ?? training?.slug} placeholder="manage-time" />
            </Field>

            <Field
              label="Summary"
              htmlFor="t-summary"
              hint="One sentence, shown on cards and search results."
              error={errors.summary}
            >
              <Textarea id="t-summary" name="summary" rows={2} defaultValue={values.summary ?? training?.summary} />
            </Field>

            <Field label="Description" htmlFor="t-description" error={errors.description}>
              <Textarea
                id="t-description"
                name="description"
                rows={6}
                defaultValue={values.description ?? training?.description}
              />
            </Field>

            <Field
              label="Image path"
              htmlFor="t-image"
              hint="A path under /public, e.g. /Images/Trainingimgae/times.webp"
              error={errors.image}
            >
              <Input id="t-image" name="image" defaultValue={values.image ?? training?.image} />
            </Field>
          </FormSection>

          <FormSection title="Delivery">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Category" htmlFor="t-category" error={errors.category}>
                <Select id="t-category" name="category" key={values.category ?? training?.category ?? "Student"}
            defaultValue={values.category ?? training?.category ?? "Student"}>
                  {TRAINING_CATEGORIES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </Select>
              </Field>

              <Field label="Format" htmlFor="t-format" error={errors.format}>
                <Select id="t-format" name="format" key={values.format ?? training?.format ?? "In-person"}
            defaultValue={values.format ?? training?.format ?? "In-person"}>
                  {TRAINING_FORMATS.map((f) => (
                    <option key={f}>{f}</option>
                  ))}
                </Select>
              </Field>

              <Field label="Level" htmlFor="t-level" error={errors.level}>
                <Select id="t-level" name="level" key={values.level ?? training?.level ?? "All levels"}
            defaultValue={values.level ?? training?.level ?? "All levels"}>
                  {["All levels", "Beginner", "Intermediate", "Advanced"].map((l) => (
                    <option key={l}>{l}</option>
                  ))}
                </Select>
              </Field>

              <Field label="Facilitator" htmlFor="t-trainer" error={errors.trainerId}>
                <Select id="t-trainer" name="trainerId" key={values.trainerId ?? training?.trainerId ?? ""}
            defaultValue={values.trainerId ?? training?.trainerId ?? ""}>
                  <option value="">Not assigned</option>
                  {trainers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field label="Duration (hours)" htmlFor="t-duration" error={errors.durationHrs}>
                <Input
                  id="t-duration"
                  name="durationHrs"
                  type="number"
                  step="0.5"
                  min="0.5"
                  defaultValue={values.durationHrs ?? training?.durationHrs ?? 2}
                />
              </Field>

              <Field
                label="Price (SGD)"
                htmlFor="t-price"
                hint="0 displays as “Free”."
                error={errors.price}
              >
                <Input
                  id="t-price"
                  name="price"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={values.price ?? ((training?.priceCents ?? 0) / 100).toFixed(2)}
                />
              </Field>
            </div>
          </FormSection>

          <FormSection
            title="Content"
            description="One item per line. These render as the outcomes list and session outline."
          >
            <Field label="Learning outcomes" htmlFor="t-outcomes" error={errors.outcomes}>
              <Textarea
                id="t-outcomes"
                name="outcomes"
                rows={5}
                defaultValue={values.outcomes ?? jsonToLines(training?.outcomes)}
                placeholder={"Run a weekly planning ritual\nTriage incoming requests"}
              />
            </Field>

            <Field label="Session outline" htmlFor="t-modules" error={errors.modules}>
              <Textarea
                id="t-modules"
                name="modules"
                rows={5}
                defaultValue={values.modules ?? jsonToLines(training?.modules)}
                placeholder={"Where your week actually goes\nThe priority filter"}
              />
            </Field>
          </FormSection>

          <FormSection title="Visibility">
            <Toggle
              name="published"
              label="Published"
              hint="Visible on the public site."
              defaultChecked={submitted ? values.published === "on" : (training?.published ?? true)}
            />
            <Toggle
              name="featured"
              label="Featured"
              hint="Highlighted on the home page."
              defaultChecked={submitted ? values.featured === "on" : (training?.featured ?? false)}
            />
            <Field
              label="Sort order"
              htmlFor="t-sort"
              hint="Lower numbers appear first."
              error={errors.sortOrder}
            >
              <Input
                id="t-sort"
                name="sortOrder"
                type="number"
                defaultValue={values.sortOrder ?? training?.sortOrder ?? 0}
                className="max-w-32"
              />
            </Field>
          </FormSection>
        </>
        );
      }}
    </AdminForm>
  );
}
