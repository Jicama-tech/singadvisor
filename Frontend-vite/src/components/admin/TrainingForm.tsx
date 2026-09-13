
import { Link } from "react-router-dom";
import { saveTraining } from "@/app/admin/actions";
import type { FormState } from "@/lib/form-state";
import { AdminForm, FormSection, Toggle } from "@/components/admin/AdminForm";
import { CoverImageField } from "@/components/admin/CoverImageField";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { TRAINING_CATEGORIES, TRAINING_FORMATS } from "@/lib/constants";
import { jsonToLines } from "@/lib/utils";

/** One row of the facilitator picker — `id`, not `_id`, like every other
 * field on `Training` below (the form is still shaped after the Prisma rows
 * it was written against; TrainingEdit's `toFormShape` does the mapping). */
type TrainerOption = { id: string; name: string };

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
  trainerIds: string[];
};

export function TrainingForm({
  training,
  trainers,
  action = saveTraining,
}: {
  training?: Training;
  trainers: TrainerOption[];
  action?: (formData: FormData) => Promise<FormState | void>;
}) {
  const credited = training?.trainerIds ?? [];
  // A checkbox list submits in the order it renders, and that order is the
  // order the public page credits — so the facilitators already on this
  // course lead the picker, in their stored order, and anyone newly ticked
  // joins the end. Without this, re-saving an untouched form would quietly
  // re-sort the credits into whatever order /trainers happened to answer in.
  // An id whose facilitator has since been deleted simply matches nothing.
  const trainerOptions: TrainerOption[] = [
    ...credited.flatMap((id) => trainers.filter((t) => t.id === id)),
    ...trainers.filter((t) => !credited.includes(t.id)),
  ];

  return (
    <AdminForm
      action={action}
      id={training?.id}
      cancelHref="/admin/trainings"
      submitLabel={training ? "Save changes" : "Create training"}
      wide
    >
      {(errors, values) => {
        // Unchecked boxes are absent from FormData entirely, so we can only
        // read a checkbox back if we know a submission actually happened.
        const submitted = Object.keys(values).length > 0;
        return (
        <>
          <FormSection title="Basics">
            <div className="grid gap-4 sm:grid-cols-2">
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
            </div>

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

            {/* Was a path text box. The upload writes the same string into a
                hidden input under the same name, so saveTraining is unchanged
                — and an existing /Images/... path still renders and survives
                an edit that never touches the image. */}
            <CoverImageField name="image" value={values.image ?? training?.image} />
            {errors.image && (
              <p role="alert" className="text-sm text-red-600 dark:text-red-400">
                {errors.image}
              </p>
            )}
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

              {/* A course can be run by several people. The fields around
                  this one fall back to `values` after a failed save; this one
                  deliberately doesn't — `collectValues` folds FormData into a
                  Record, so repeated `trainerIds` would collapse to whichever
                  box was ticked last. It doesn't need to either: AdminForm
                  submits through a plain onSubmit, not a React 19 form action,
                  so nothing resets these checkboxes in the first place. */}
              <Field
                label="Facilitators"
                htmlFor="t-trainers"
                hint="Credited on the public page in the order shown. Not listed? Add them under the Facilitators tab."
                error={errors.trainerIds}
              >
                <div
                  id="t-trainers"
                  className="flex max-h-40 flex-col gap-1.5 overflow-y-auto rounded-xl border border-[var(--border-strong)] p-3"
                >
                  {trainerOptions.length === 0 ? (
                    <p className="text-sm text-[var(--text-muted)]">
                      No facilitators yet —{" "}
                      <Link
                        to="/admin/trainings/facilitators"
                        className="font-medium text-[var(--accent)] hover:underline"
                      >
                        add one
                      </Link>
                      .
                    </p>
                  ) : (
                    trainerOptions.map((t) => (
                      <label key={t.id} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          name="trainerIds"
                          value={t.id}
                          defaultChecked={credited.includes(t.id)}
                          className="h-4 w-4 shrink-0 rounded border-[var(--border-strong)] accent-[var(--accent)]"
                        />
                        {t.name}
                      </label>
                    ))
                  )}
                </div>
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

            {/* Guarded on `training` — on /admin/trainings/new there is no
                record yet and the link would point at .../content/undefined. */}
            {training && (
              <p className="text-xs text-[var(--text-muted)]">
                This outline is the brochure summary the public page shows. Videos,
                readings and quizzes live in{" "}
                <Link
                  to={`/admin/trainings/content/${training.id}`}
                  className="font-medium text-[var(--accent)] hover:underline"
                >
                  Trainings → Content
                </Link>
                .
              </p>
            )}
          </FormSection>

          <FormSection title="Visibility">
            <Toggle
              name="published"
              label="Published"
              hint="Visible on the public site."
              defaultChecked={submitted ? values.published === "true" : (training?.published ?? true)}
            />
            <Toggle
              name="featured"
              label="Featured"
              hint="Highlighted on the home page."
              defaultChecked={submitted ? values.featured === "true" : (training?.featured ?? false)}
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
