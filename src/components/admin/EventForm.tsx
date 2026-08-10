"use client";

import { saveEvent } from "@/app/admin/actions";
import { AdminForm, FormSection, Toggle } from "@/components/admin/AdminForm";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { jsonToLines, parseAgenda } from "@/lib/utils";

type EventRecord = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  description: string;
  image: string;
  venue: string;
  address: string;
  startsAt: Date;
  endsAt: Date;
  capacity: number;
  speakers: string;
  agenda: string;
  priceCents: number;
  published: boolean;
  featured: boolean;
};

/** `datetime-local` needs `YYYY-MM-DDTHH:mm` in local time, not an ISO string. */
function toLocalInput(date: Date | undefined): string {
  if (!date) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function EventForm({ event }: { event?: EventRecord }) {
  const agendaLines = parseAgenda(event?.agenda)
    .map((a) => `${a.time} | ${a.title}`)
    .join("\n");

  return (
    <AdminForm
      action={saveEvent}
      id={event?.id}
      cancelHref="/admin/events"
      submitLabel={event ? "Save changes" : "Create event"}
    >
      {(errors, values) => {
        // Unchecked boxes are absent from FormData entirely, so we can only
        // read a checkbox back if we know a submission actually happened.
        const submitted = Object.keys(values).length > 0;
        return (
        <>
          <FormSection title="Basics">
            <Field label="Title" htmlFor="e-title" required error={errors.title}>
              <Input id="e-title" name="title" required defaultValue={values.title ?? event?.title} />
            </Field>

            <Field
              label="URL slug"
              htmlFor="e-slug"
              hint="Leave blank to generate from the title."
              error={errors.slug}
            >
              <Input id="e-slug" name="slug" defaultValue={values.slug ?? event?.slug} />
            </Field>

            <Field label="Summary" htmlFor="e-summary" error={errors.summary}>
              <Textarea id="e-summary" name="summary" rows={2} defaultValue={values.summary ?? event?.summary} />
            </Field>

            <Field label="Description" htmlFor="e-description" error={errors.description}>
              <Textarea
                id="e-description"
                name="description"
                rows={6}
                defaultValue={values.description ?? event?.description}
              />
            </Field>

            <Field
              label="Image path"
              htmlFor="e-image"
              hint="A path under /public."
              error={errors.image}
            >
              <Input id="e-image" name="image" defaultValue={values.image ?? event?.image} />
            </Field>
          </FormSection>

          <FormSection title="When and where">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Starts" htmlFor="e-starts" required error={errors.startsAt}>
                <Input
                  id="e-starts"
                  name="startsAt"
                  type="datetime-local"
                  required
                  defaultValue={values.startsAt ?? toLocalInput(event?.startsAt)}
                />
              </Field>

              <Field label="Ends" htmlFor="e-ends" required error={errors.endsAt}>
                <Input
                  id="e-ends"
                  name="endsAt"
                  type="datetime-local"
                  required
                  defaultValue={values.endsAt ?? toLocalInput(event?.endsAt)}
                />
              </Field>

              <Field label="Venue" htmlFor="e-venue" error={errors.venue}>
                <Input id="e-venue" name="venue" defaultValue={values.venue ?? event?.venue} />
              </Field>

              <Field label="Capacity" htmlFor="e-capacity" error={errors.capacity}>
                <Input
                  id="e-capacity"
                  name="capacity"
                  type="number"
                  min="1"
                  defaultValue={values.capacity ?? event?.capacity ?? 100}
                />
              </Field>
            </div>

            <Field label="Full address" htmlFor="e-address" error={errors.address}>
              <Input id="e-address" name="address" defaultValue={values.address ?? event?.address} />
            </Field>

            <Field
              label="Admission (SGD)"
              htmlFor="e-price"
              hint="0 displays as “Free”."
              error={errors.price}
            >
              <Input
                id="e-price"
                name="price"
                type="number"
                step="0.01"
                min="0"
                defaultValue={values.price ?? ((event?.priceCents ?? 0) / 100).toFixed(2)}
                className="max-w-40"
              />
            </Field>
          </FormSection>

          <FormSection title="Programme">
            <Field
              label="Speakers"
              htmlFor="e-speakers"
              hint="One name per line."
              error={errors.speakers}
            >
              <Textarea
                id="e-speakers"
                name="speakers"
                rows={4}
                defaultValue={values.speakers ?? jsonToLines(event?.speakers)}
              />
            </Field>

            <Field
              label="Agenda"
              htmlFor="e-agenda"
              hint="One row per line, formatted as: time | item"
              error={errors.agenda}
            >
              <Textarea
                id="e-agenda"
                name="agenda"
                rows={6}
                defaultValue={values.agenda ?? agendaLines}
                placeholder={"9:00 am | Registration\n9:30 am | Opening session"}
              />
            </Field>
          </FormSection>

          <FormSection title="Visibility">
            <Toggle
              name="published"
              label="Published"
              hint="Visible on the public site."
              defaultChecked={submitted ? values.published === "on" : (event?.published ?? true)}
            />
            <Toggle
              name="featured"
              label="Featured"
              hint="Highlighted on the home page."
              defaultChecked={submitted ? values.featured === "on" : (event?.featured ?? false)}
            />
          </FormSection>
        </>
        );
      }}
    </AdminForm>
  );
}
