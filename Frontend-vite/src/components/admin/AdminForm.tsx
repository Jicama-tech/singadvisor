import { useState, type FormEvent, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { emptyFormState, collectValues, type FormState } from "@/lib/form-state";
import { FormError, SubmitButton } from "@/components/forms/FormShell";
import { Panel } from "@/components/admin/AdminUI";
import { cn } from "@/lib/utils";

/**
 * Wraps the entity editors. React 18 has no `useActionState`/form-actions
 * (the React-19 APIs the Next version of this app used), so this submits
 * through a plain onSubmit: builds the FormData, runs the page-provided
 * async action, and keeps pending/error/values state locally. On success the
 * page's action navigates, so this only ever renders the form plus any
 * validation errors that came back.
 */
export function AdminForm({
  action,
  id,
  cancelHref,
  submitLabel,
  wide,
  children,
}: {
  action: (formData: FormData) => Promise<FormState | void>;
  id?: string;
  cancelHref: string;
  submitLabel: string;
  /** Opt out of the default max-w-3xl — for forms with wide content (a live
   * preview panel) where the usual text-field-readability width just leaves
   * the rest of the page empty. Leave unset for ordinary field-only forms. */
  wide?: boolean;
  children: (
    errors: Record<string, string>,
    /**
     * What the user last submitted. React clears an uncontrolled form once
     * its action resolves, so entity editors fall back to these before the
     * saved record to avoid wiping a long edit over one bad field.
     */
    values: Record<string, string>,
  ) => ReactNode;
}) {
  const [state, setState] = useState<FormState>(emptyFormState);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    setPending(true);
    try {
      const result = await action(formData);
      if (result) {
        setState({
          ...result,
          values: result.values ?? collectValues(formData),
        });
      }
    } catch (err) {
      setState({
        ok: false,
        message: err instanceof Error ? err.message : "Something went wrong.",
        values: collectValues(formData),
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className={cn("flex w-full flex-col gap-6", !wide && "max-w-3xl")}
      noValidate
    >
      {id && <input type="hidden" name="id" value={id} />}

      <FormError state={state} />

      {children(state.errors ?? {}, state.values ?? {})}

      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton pending={pending} pendingLabel="Saving…">
          {submitLabel}
        </SubmitButton>
        <Link
          to={cancelHref}
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
