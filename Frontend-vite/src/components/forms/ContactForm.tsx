

import { submitContact } from "@/app/actions";
import { FormError, FormSuccess, SubmitButton, useClientAction } from "@/components/forms/FormShell";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { PhoneField } from "@/components/ui/PhoneField";

const SUBJECTS = [
  "Training enquiry",
  "Event enquiry",
  "Consultancy enquiry",
  "Careers question",
  "Something else",
];

export function ContactForm() {
  const { state, pending, onSubmit } = useClientAction(submitContact);

  if (state.ok && state.message) return <FormSuccess message={state.message} />;

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      <FormError state={state} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name" htmlFor="c-name" required error={state.errors?.name}>
          <Input
            id="c-name"
            defaultValue={state.values?.name}
            name="name"
            required
            autoComplete="name"
            placeholder="Jane Tan"
            aria-invalid={!!state.errors?.name}
          />
        </Field>

        <Field label="Email" htmlFor="c-email" required error={state.errors?.email}>
          <Input
            id="c-email"
            defaultValue={state.values?.email}
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="jane@company.com"
            aria-invalid={!!state.errors?.email}
          />
        </Field>

        <PhoneField
          name="phone"
          label="Contact number"
          hint="Optional"
          defaultValue={state.values?.phone}
          error={state.errors?.phone}
        />

        <Field label="Subject" htmlFor="c-subject" required error={state.errors?.subject}>
          <Select
            id="c-subject"
            name="subject"
            required
            key={state.values?.subject ?? SUBJECTS[0]}
            defaultValue={state.values?.subject ?? SUBJECTS[0]}
          >
            {SUBJECTS.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </Select>
        </Field>
      </div>

      <Field label="Message" htmlFor="c-message" required error={state.errors?.message}>
        <Textarea
          id="c-message"
          defaultValue={state.values?.message}
          name="message"
          rows={6}
          required
          placeholder="Tell us what you're looking for…"
          aria-invalid={!!state.errors?.message}
        />
      </Field>

      <SubmitButton pendingLabel="Sending…" className="w-full sm:w-auto">
        Send message
      </SubmitButton>
    </form>
  );
}
