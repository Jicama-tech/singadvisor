

import { submitEnquiry } from "@/app/actions";
import { FormError, FormSuccess, SubmitButton, useClientAction } from "@/components/forms/FormShell";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { COMPANY_SIZES } from "@/lib/constants";

export function EnquiryForm({
  services,
  defaultServiceId,
}: {
  services: { id: string; title: string }[];
  defaultServiceId?: string;
}) {
  const { state, pending, onSubmit } = useClientAction(submitEnquiry);

  if (state.ok && state.message) return <FormSuccess message={state.message} />;

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      <FormError state={state} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name" htmlFor="enq-name" required error={state.errors?.name}>
          <Input
            id="enq-name"
            defaultValue={state.values?.name}
            name="name"
            required
            autoComplete="name"
            placeholder="Jane Tan"
            aria-invalid={!!state.errors?.name}
          />
        </Field>

        <Field label="Work email" htmlFor="enq-email" required error={state.errors?.email}>
          <Input
            id="enq-email"
            defaultValue={state.values?.email}
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="jane@company.com"
            aria-invalid={!!state.errors?.email}
          />
        </Field>

        <Field label="Contact number" htmlFor="enq-phone" required error={state.errors?.phone}>
          <Input
            id="enq-phone"
            defaultValue={state.values?.phone}
            name="phone"
            type="tel"
            required
            autoComplete="tel"
            placeholder="+65 9123 4567"
            aria-invalid={!!state.errors?.phone}
          />
        </Field>

        <Field label="Company" htmlFor="enq-company" required error={state.errors?.company}>
          <Input
            id="enq-company"
            defaultValue={state.values?.company}
            name="company"
            required
            autoComplete="organization"
            placeholder="Acme Pte Ltd"
            aria-invalid={!!state.errors?.company}
          />
        </Field>

        <Field label="Company size" htmlFor="enq-size" error={state.errors?.companySize}>
          <Select id="enq-size" name="companySize" key={state.values?.companySize ?? ""}
            defaultValue={state.values?.companySize ?? ""}>
            <option value="">Select…</option>
            {COMPANY_SIZES.map((s) => (
              <option key={s} value={s}>
                {s} people
              </option>
            ))}
          </Select>
        </Field>

        <Field
          label="Area of interest"
          htmlFor="enq-service"
          error={state.errors?.serviceId}
        >
          <Select
            id="enq-service"
            name="serviceId"
            key={state.values?.serviceId ?? defaultServiceId ?? ""}
            defaultValue={state.values?.serviceId ?? defaultServiceId ?? ""}
          >
            <option value="">Not sure yet</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Indicative budget" htmlFor="enq-budget" hint="Optional">
          <Select id="enq-budget" name="budget" key={state.values?.budget ?? ""}
            defaultValue={state.values?.budget ?? ""}>
            <option value="">Prefer not to say</option>
            <option>Under S$10k</option>
            <option>S$10k – S$30k</option>
            <option>S$30k – S$75k</option>
            <option>Above S$75k</option>
          </Select>
        </Field>

        <Field label="Timeline" htmlFor="enq-timeline" hint="Optional">
          <Select id="enq-timeline" name="timeline" key={state.values?.timeline ?? ""}
            defaultValue={state.values?.timeline ?? ""}>
            <option value="">Not fixed</option>
            <option>Immediately</option>
            <option>Within a quarter</option>
            <option>Within six months</option>
            <option>Just exploring</option>
          </Select>
        </Field>
      </div>

      <Field
        label="What are you trying to change?"
        htmlFor="enq-message"
        required
        hint="The more concrete you are about the problem, the more useful our first call will be."
        error={state.errors?.message}
      >
        <Textarea
          id="enq-message"
          defaultValue={state.values?.message}
          name="message"
          rows={5}
          required
          placeholder="We've grown from 40 to 120 people in eighteen months and our middle management layer is struggling…"
          aria-invalid={!!state.errors?.message}
        />
      </Field>

      <SubmitButton pendingLabel="Sending…" className="w-full sm:w-auto">
        Send enquiry
      </SubmitButton>

      <p className="text-xs text-[var(--text-muted)]">
        We&apos;ll respond within two working days. Everything you share stays
        confidential.
      </p>
    </form>
  );
}
