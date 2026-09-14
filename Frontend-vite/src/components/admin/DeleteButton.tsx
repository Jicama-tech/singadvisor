import type { FormEvent } from "react";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { Icon } from "@/components/ui/Icon";

/**
 * Deletions cascade to registrations and applications, so this always
 * confirms first. React 18 has no form actions — the page passes an async
 * delete function instead of a server action.
 */
export function DeleteButton({
  id,
  action,
  label,
  consequence = "This also removes any submissions attached to it and cannot be undone.",
}: {
  id: string;
  action: (id: string) => Promise<void>;
  label: string;
  /** What the confirm dialog says under the question, for records whose
   * deletion does something other than the default cascade. */
  consequence?: string;
}) {
  const { confirm, confirmDialog } = useConfirm();

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // Unchanged on a refusal: Cancel, Escape and the backdrop all answer false
    // and the delete never runs — the early return the native dialog gave.
    if (
      !(await confirm({
        title: `Delete “${label}”?`,
        message: consequence,
        confirmLabel: "Delete",
        tone: "danger",
      }))
    ) {
      return;
    }
    await action(id);
  }

  return (
    <form onSubmit={onSubmit}>
      <button
        type="submit"
        aria-label={`Delete ${label}`}
        className="grid h-8 w-8 place-items-center rounded-lg text-[var(--text-muted)] transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/50 dark:hover:text-red-400"
      >
        <Icon name="trash" size={16} />
      </button>
      {/* Inside the form because that is this component's only element — the
          dialog's own buttons are type="button", so none of them submits it. */}
      {confirmDialog}
    </form>
  );
}
