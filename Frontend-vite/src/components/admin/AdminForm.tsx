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
  hideDefaultActions,
  children,
}: {
  action: (formData: FormData) => Promise<FormState | void>;
  id?: string;
  cancelHref: string;
  submitLabel: string;
  /** Deprecated — content now fills the available width by default (the
   * user asked for the content pane to always take the whole screen).
   * Kept for backwards compatibility; no longer changes anything. */
  wide?: boolean;
  /** Skip AdminForm's own bottom Save/Cancel row — for pages that place
   * their own <FormActionsRow> elsewhere (e.g. top-right, above the form)
   * using the `pending` value the children callback now receives. */
  hideDefaultActions?: boolean;
  children: (
    errors: Record<string, string>,
    /**
     * What the user last submitted. React clears an uncontrolled form once
     * its action resolves, so entity editors fall back to these before the
     * saved record to avoid wiping a long edit over one bad field.
     */
    values: Record<string, string>,
    /** Whether a submit is in flight — for pages building their own submit
     * button elsewhere in the tree (see `hideDefaultActions`). */
    pending: boolean,
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
      className="flex w-full flex-col gap-6"
      noValidate
    >
      {id && <input type="hidden" name="id" value={id} />}

      <FormError state={state} />

      {children(state.errors ?? {}, state.values ?? {}, pending)}

      {!hideDefaultActions && (
        <FormActionsRow pending={pending} submitLabel={submitLabel} cancelHref={cancelHref} />
      )}
    </form>
  );
}

/** The Save/Cancel row AdminForm renders at the bottom by default. Exported
 * so a page can place its own copy elsewhere (top-right, above the form)
 * via `hideDefaultActions` + the `pending` the children callback receives —
 * same buttons, same behaviour, just wherever the page wants them. */
export function FormActionsRow({
  pending,
  submitLabel,
  cancelHref,
  className,
}: {
  pending: boolean;
  submitLabel: string;
  cancelHref: string;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-center gap-3", className)}>
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
        // A checkbox with no `value` submits "on" when checked — every save
        // handler's `bool()` helper checks for the literal string "true",
        // so without this every Toggle silently saved as false regardless
        // of what was actually checked (Published/Featured across
        // Trainings/Jobs/Blog/Services/Events all shared this bug).
        value="true"
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
