import { useRef } from "react";

/**
 * Inline status control. Fires the page-provided async action on change so
 * the admin never has to hunt for a save button in a table row.
 */
export function StatusSelect({
  id,
  value,
  options,
  action,
  label,
}: {
  id: string;
  value: string;
  options: readonly string[];
  action: (id: string, status: string) => Promise<void>;
  label: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const selectRef = useRef<HTMLSelectElement>(null);

  async function onChange() {
    const el = selectRef.current;
    if (!el) return;
    const previous = value;
    try {
      await action(id, el.value);
    } catch {
      // Revert the select on failure so the UI never claims a status change
      // that did not persist.
      el.value = previous;
    }
  }

  return (
    <form
      ref={formRef}
      onSubmit={(e) => e.preventDefault()}
    >
      <label className="sr-only" htmlFor={`status-${id}`}>
        {label}
      </label>
      <select
        ref={selectRef}
        id={`status-${id}`}
        name="status"
        defaultValue={value}
        onChange={onChange}
        // 16px on phones so iOS does not zoom the admin table on focus.
        className="rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-2.5 py-1.5 text-base sm:text-xs font-medium capitalize text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/25"
      >
        {options.map((o) => (
          <option key={o} value={o} className="capitalize">
            {o}
          </option>
        ))}
      </select>
    </form>
  );
}
