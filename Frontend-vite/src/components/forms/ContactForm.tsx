
import { useActionState } from "react";
import { submitContact } from "@/app/actions";
import { emptyFormState } from "@/lib/form-state";
import { FormError, FormSuccess, SubmitButton } from "@/components/forms/FormShell";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";

const SUBJECTS = [
  "Training enquiry",
  "Event enquiry",
  "Consultancy enquiry",
  "Careers question",
  "Something else",
];

export function ContactForm() {
  const [state, action] = useActionState(submitContact, emptyFormState);

  if (state.ok && state.message) return <FormSuccess message={state.message} />;

  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
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

        <Field
          label="Contact number"
          htmlFor="c-phone"
          hint="Optional"
          error={state.errors?.phone}
        >
          <Input
            id="c-phone"
            defaultValue={state.values?.phone}
            name="phone"
            type="tel"
            autoComplete="tel"
            placeholder="+65 9123 4567"
            aria-invalid={!!state.errors?.phone}
          />
        </Field>

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
