

import { registerForEvent, registerForTraining } from "@/app/actions";
import { FormError, FormSuccess, SubmitButton, useClientAction } from "@/components/forms/FormShell";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { PhoneField } from "@/components/ui/PhoneField";

type Props =
  | { kind: "training"; id: string; title: string; maxSeats?: number }
  | { kind: "event"; id: string; title: string; maxSeats?: number };

export function RegistrationForm(props: Props) {
  const action = props.kind === "training" ? registerForTraining : registerForEvent;
  const { state, pending, onSubmit } = useClientAction(action);

  if (state.ok && state.message) return <FormSuccess message={state.message} />;

  const idField = props.kind === "training" ? "trainingId" : "eventId";
  const verb = props.kind === "training" ? "Reserve my place" : "Register";

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      <input type="hidden" name={idField} value={props.id} />

      <FormError state={state} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name" htmlFor="reg-name" required error={state.errors?.name}>
          <Input
            id="reg-name"
            defaultValue={state.values?.name}
            name="name"
            required
            autoComplete="name"
            placeholder="Jane Tan"
            aria-invalid={!!state.errors?.name}
          />
        </Field>

        <Field label="Email" htmlFor="reg-email" required error={state.errors?.email}>
          <Input
            id="reg-email"
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
          required
          defaultValue={state.values?.phone}
          error={state.errors?.phone}
        />

        <Field
          label="Organisation"
          htmlFor="reg-company"
          hint="Optional"
          error={state.errors?.company}
        >
          <Input
            id="reg-company"
            defaultValue={state.values?.company}
            name="company"
            autoComplete="organization"
            placeholder="Acme Pte Ltd"
          />
        </Field>
      </div>

      <Field
        label="Number of seats"
        htmlFor="reg-seats"
        hint={
          props.maxSeats
            ? `${props.maxSeats} seat${props.maxSeats === 1 ? "" : "s"} remaining`
            : "Booking for a group? Enter the total here."
        }
        error={state.errors?.seats}
      >
        <Input
          id="reg-seats"
          name="seats"
          type="number"
          min={1}
          max={props.maxSeats ?? 50}
          defaultValue={state.values?.seats ?? 1}
          className="max-w-32"
          aria-invalid={!!state.errors?.seats}
        />
      </Field>

      <Field
        label="Anything we should know?"
        htmlFor="reg-message"
        hint="Dietary requirements, accessibility needs, or what you're hoping to get out of it."
        error={state.errors?.message}
      >
        <Textarea
          id="reg-message"
          name="message"
          rows={3}
          defaultValue={state.values?.message}
        />
      </Field>

      <SubmitButton pendingLabel="Submitting…" className="w-full sm:w-auto">
        {verb}
      </SubmitButton>

      <p className="text-xs text-[var(--text-muted)]">
        We use your details only to manage this booking. No marketing without
        your say-so.
      </p>
    </form>
  );
}
