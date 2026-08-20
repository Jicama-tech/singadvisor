
import { saveJob } from "@/app/admin/actions";
import type { FormState } from "@/lib/form-state";
import { AdminForm, FormSection, Toggle } from "@/components/admin/AdminForm";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { EMPLOYMENT_TYPES, WORK_MODES } from "@/lib/constants";
import { jsonToLines } from "@/lib/utils";

type Job = {
  id: string;
  slug: string;
  title: string;
  department: string;
  location: string;
  employment: string;
  workMode: string;
  experience: string;
  salaryMin: number | null;
  salaryMax: number | null;
  summary: string;
  description: string;
  requirements: string;
  benefits: string;
  published: boolean;
  closesAt: Date | null;
};

const toDateInput = (d: Date | null | undefined) =>
  d ? d.toISOString().slice(0, 10) : "";

export function JobForm({
  job,
  action = saveJob,
}: {
  job?: Job;
  action?: (formData: FormData) => Promise<FormState | void>;
}) {
  return (
    <AdminForm
      action={action}
      id={job?.id}
      cancelHref="/admin/careers"
      submitLabel={job ? "Save changes" : "Create posting"}
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
              <Field label="Job title" htmlFor="j-title" required error={errors.title}>
                <Input id="j-title" name="title" required defaultValue={values.title ?? job?.title} />
              </Field>

              <Field
                label="URL slug"
                htmlFor="j-slug"
                hint="Leave blank to generate from the title."
                error={errors.slug}
              >
                <Input id="j-slug" name="slug" defaultValue={values.slug ?? job?.slug} />
              </Field>
            </div>

            <Field label="Summary" htmlFor="j-summary" error={errors.summary}>
              <Textarea id="j-summary" name="summary" rows={2} defaultValue={values.summary ?? job?.summary} />
            </Field>

            <Field label="Description" htmlFor="j-description" error={errors.description}>
              <Textarea
                id="j-description"
                name="description"
                rows={6}
                defaultValue={values.description ?? job?.description}
              />
            </Field>
          </FormSection>

          <FormSection title="Role details">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Department" htmlFor="j-department" error={errors.department}>
                <Input id="j-department" name="department" defaultValue={values.department ?? job?.department} />
              </Field>

              <Field label="Location" htmlFor="j-location" error={errors.location}>
                <Input id="j-location" name="location" defaultValue={values.location ?? job?.location ?? "Singapore"} />
              </Field>

              <Field label="Employment type" htmlFor="j-employment" error={errors.employment}>
                <Select
                  id="j-employment"
                  name="employment"
                  key={values.employment ?? job?.employment ?? "Full-time"}
            defaultValue={values.employment ?? job?.employment ?? "Full-time"}
                >
                  {EMPLOYMENT_TYPES.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </Select>
              </Field>

              <Field label="Work mode" htmlFor="j-workmode" error={errors.workMode}>
                <Select id="j-workmode" name="workMode" key={values.workMode ?? job?.workMode ?? "On-site"}
            defaultValue={values.workMode ?? job?.workMode ?? "On-site"}>
                  {WORK_MODES.map((m) => (
                    <option key={m}>{m}</option>
                  ))}
                </Select>
              </Field>

              <Field label="Experience" htmlFor="j-experience" error={errors.experience}>
                <Input
                  id="j-experience"
                  name="experience"
                  defaultValue={values.experience ?? job?.experience}
                  placeholder="3-5 years"
                />
              </Field>

              <Field
                label="Applications close"
                htmlFor="j-closes"
                hint="Optional — leave blank to keep open."
                error={errors.closesAt}
              >
                <Input
                  id="j-closes"
                  name="closesAt"
                  type="date"
                  defaultValue={values.closesAt ?? toDateInput(job?.closesAt)}
                />
              </Field>

              <Field
                label="Salary minimum (SGD/yr)"
                htmlFor="j-salmin"
                hint="Optional"
                error={errors.salaryMin}
              >
                <Input
                  id="j-salmin"
                  name="salaryMin"
                  type="number"
                  min="0"
                  defaultValue={values.salaryMin ?? job?.salaryMin ?? ""}
                />
              </Field>

              <Field
                label="Salary maximum (SGD/yr)"
                htmlFor="j-salmax"
                hint="Optional"
                error={errors.salaryMax}
              >
                <Input
                  id="j-salmax"
                  name="salaryMax"
                  type="number"
                  min="0"
                  defaultValue={values.salaryMax ?? job?.salaryMax ?? ""}
                />
              </Field>
            </div>
          </FormSection>

          <FormSection title="Requirements and benefits" description="One item per line.">
            <Field label="What we're looking for" htmlFor="j-requirements" error={errors.requirements}>
              <Textarea
                id="j-requirements"
                name="requirements"
                rows={6}
                defaultValue={values.requirements ?? jsonToLines(job?.requirements)}
              />
            </Field>

            <Field label="What we offer" htmlFor="j-benefits" error={errors.benefits}>
              <Textarea
                id="j-benefits"
                name="benefits"
                rows={5}
                defaultValue={values.benefits ?? jsonToLines(job?.benefits)}
              />
            </Field>
          </FormSection>

          <FormSection title="Visibility">
            <Toggle
              name="published"
              label="Published"
              hint="Listed on the public careers page and accepting applications."
              defaultChecked={submitted ? values.published === "true" : (job?.published ?? true)}
            />
          </FormSection>
        </>
        );
      }}
    </AdminForm>
  );
}
