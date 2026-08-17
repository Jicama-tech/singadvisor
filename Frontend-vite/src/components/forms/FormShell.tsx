import type { ReactNode } from "react";
import type { FormState } from "@/lib/form-state";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";

/**
 * Submit button reflecting the form's pending state. React 19's useFormStatus
 * (which the Next version of this app relied on) does not exist in the React
 * 18 stack this SPA pins — the form passes its own pending flag instead.
 */
export function SubmitButton({
  children,
  pending,
  pendingLabel = "Sending…",
  className,
}: {
  children: ReactNode;
  pending?: boolean;
  pendingLabel?: string;
  className?: string;
}) {
  return (
    <Button type="submit" size="lg" disabled={pending} className={className}>
      {pending ? pendingLabel : children}
    </Button>
  );
}

/** Success panel shown in place of the form once it has been accepted. */
export function FormSuccess({ message }: { message: string }) {
  return (
    <div
      role="status"
      className="flex flex-col items-center gap-4 rounded-[var(--radius-card)] border border-[var(--accent)]/25 bg-[var(--accent-soft)] px-6 py-12 text-center"
    >
      <span className="grid h-12 w-12 place-items-center rounded-full bg-[var(--accent)] text-[var(--accent-foreground)]">
        <Icon name="check" size={24} />
      </span>
      <p className="max-w-sm text-[var(--accent-on-soft)]">{message}</p>
    </div>
  );
}

/** Form-level (non-field) error banner. */
export function FormError({ state }: { state: FormState }) {
  if (state.ok || !state.message) return null;
  return (
    <p
      role="alert"
      className="flex items-start gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800 dark:bg-red-950/50 dark:text-red-200"
    >
      <Icon name="alert" size={16} className="mt-0.5 shrink-0" />
      {state.message}
    </p>
  );
}
