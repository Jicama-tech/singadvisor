import type { FormEvent } from "react";
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
}: {
  id: string;
  action: (id: string) => Promise<void>;
  label: string;
}) {
  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (
      !confirm(
        `Delete “${label}”?\n\nThis also removes any submissions attached to it and cannot be undone.`,
      )
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
    </form>
  );
}
