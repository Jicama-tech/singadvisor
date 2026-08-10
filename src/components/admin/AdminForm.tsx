"use client";

import Link from "next/link";
import { useActionState, type ReactNode } from "react";
import { emptyFormState, type FormState } from "@/lib/form-state";
import { FormError, SubmitButton } from "@/components/forms/FormShell";
import { Panel } from "@/components/admin/AdminUI";

/**
 * Wraps the entity editors. On success the actions redirect, so this only
 * ever renders the form plus any validation errors that came back.
 */
export function AdminForm({
  action,
  id,
  cancelHref,
  submitLabel,
  children,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  id?: string;
  cancelHref: string;
  submitLabel: string;
  children: (
    errors: Record<string, string>,
    /**
     * What the user last submitted. React clears an uncontrolled form once
     * the action resolves, so entity editors fall back to these before the
     * saved record to avoid wiping a long edit over one bad field.
     */
    values: Record<string, string>,
  ) => ReactNode;
}) {
  const [state, formAction] = useActionState(action, emptyFormState);

  return (
    <form action={formAction} className="flex max-w-3xl flex-col gap-6" noValidate>
      {id && <input type="hidden" name="id" value={id} />}

      <FormError state={state} />

      {children(state.errors ?? {}, state.values ?? {})}

      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton pendingLabel="Saving…">{submitLabel}</SubmitButton>
        <Link
          href={cancelHref}
          className="text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}

export function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <Panel className="p-6">
      <h2 className="text-lg">{title}</h2>
      {description && (
        <p className="mt-1 text-sm text-[var(--text-secondary)]">{description}</p>
      )}
      <div className="mt-5 flex flex-col gap-4">{children}</div>
    </Panel>
  );
}

export function Toggle({
  name,
  label,
  hint,
  defaultChecked,
}: {
  name: string;
  label: string;
  hint?: string;
  defaultChecked?: boolean;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="mt-0.5 h-4 w-4 shrink-0 rounded border-[var(--border-strong)] accent-[var(--accent)]"
      />
      <span>
        <span className="block text-sm font-medium text-[var(--text-primary)]">
          {label}
        </span>
        {hint && (
          <span className="block text-xs text-[var(--text-muted)]">{hint}</span>
        )}
      </span>
    </label>
  );
}
