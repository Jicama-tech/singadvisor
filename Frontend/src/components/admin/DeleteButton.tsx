"use client";

import { Icon } from "@/components/ui/Icon";

/**
 * Deletions cascade to registrations and applications, so this always
 * confirms first. `onSubmit` returning false cancels the submission.
 */
export function DeleteButton({
  id,
  action,
  label,
}: {
  id: string;
  action: (formData: FormData) => void;
  label: string;
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (
          !confirm(
            `Delete “${label}”?\n\nThis also removes any submissions attached to it and cannot be undone.`,
          )
        ) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
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
