"use client";

import { saveService } from "@/app/admin/actions";
import { AdminForm, FormSection, Toggle } from "@/components/admin/AdminForm";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { ENGAGEMENT_MODELS } from "@/lib/constants";
import { jsonToLines } from "@/lib/utils";

type Service = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  description: string;
  image: string;
  icon: string;
  engagement: string;
  deliverables: string;
  idealFor: string;
  published: boolean;
  sortOrder: number;
};

const ICONS = ["compass", "users", "activity", "heart", "briefcase", "sparkles"];

export function ServiceForm({ service }: { service?: Service }) {
  return (
    <AdminForm
      action={saveService}
      id={service?.id}
      cancelHref="/admin/consultancy"
      submitLabel={service ? "Save changes" : "Create service"}
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
              <Field label="Title" htmlFor="s-title" required error={errors.title}>
                <Input id="s-title" name="title" required defaultValue={values.title ?? service?.title} />
              </Field>

              <Field
                label="URL slug"
                htmlFor="s-slug"
                hint="Leave blank to generate from the title."
                error={errors.slug}
              >
                <Input id="s-slug" name="slug" defaultValue={values.slug ?? service?.slug} />
              </Field>
            </div>

            <Field label="Summary" htmlFor="s-summary" error={errors.summary}>
              <Textarea id="s-summary" name="summary" rows={2} defaultValue={values.summary ?? service?.summary} />
            </Field>

            <Field label="Description" htmlFor="s-description" error={errors.description}>
              <Textarea
                id="s-description"
                name="description"
                rows={6}
                defaultValue={values.description ?? service?.description}
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Image path" htmlFor="s-image" error={errors.image}>
                <Input id="s-image" name="image" defaultValue={values.image ?? service?.image} />
              </Field>

              <Field label="Icon" htmlFor="s-icon" error={errors.icon}>
                <Select id="s-icon" name="icon" key={values.icon ?? service?.icon ?? "compass"}
            defaultValue={values.icon ?? service?.icon ?? "compass"}>
                  {ICONS.map((i) => (
                    <option key={i}>{i}</option>
                  ))}
                </Select>
              </Field>
            </div>

            <Field label="Engagement model" htmlFor="s-engagement" error={errors.engagement}>
              <Select
                id="s-engagement"
                name="engagement"
                key={values.engagement ?? service?.engagement ?? "Project-based"}
            defaultValue={values.engagement ?? service?.engagement ?? "Project-based"}
              >
                {ENGAGEMENT_MODELS.map((e) => (
                  <option key={e}>{e}</option>
                ))}
              </Select>
            </Field>
          </FormSection>

          <FormSection title="Scope" description="One item per line.">
            <Field label="Deliverables" htmlFor="s-deliverables" error={errors.deliverables}>
              <Textarea
                id="s-deliverables"
                name="deliverables"
                rows={6}
                defaultValue={values.deliverables ?? jsonToLines(service?.deliverables)}
              />
            </Field>

            <Field label="Ideal for" htmlFor="s-idealfor" error={errors.idealFor}>
              <Textarea
                id="s-idealfor"
                name="idealFor"
                rows={4}
                defaultValue={values.idealFor ?? jsonToLines(service?.idealFor)}
              />
            </Field>
          </FormSection>

          <FormSection title="Visibility">
            <Toggle
              name="published"
              label="Published"
              defaultChecked={submitted ? values.published === "on" : (service?.published ?? true)}
            />
            <Field
              label="Sort order"
              htmlFor="s-sort"
              hint="Lower numbers appear first."
              error={errors.sortOrder}
            >
              <Input
                id="s-sort"
                name="sortOrder"
                type="number"
                defaultValue={values.sortOrder ?? service?.sortOrder ?? 0}
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
