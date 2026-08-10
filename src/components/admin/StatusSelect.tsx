"use client";

import { useRef } from "react";

/**
 * Inline status control. Submits the enclosing form on change so the admin
 * never has to hunt for a save button in a table row.
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
  action: (formData: FormData) => void;
  label: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form ref={formRef} action={action}>
      <input type="hidden" name="id" value={id} />
      <label className="sr-only" htmlFor={`status-${id}`}>
        {label}
      </label>
      <select
        id={`status-${id}`}
        name="status"
        defaultValue={value}
        onChange={() => formRef.current?.requestSubmit()}
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
