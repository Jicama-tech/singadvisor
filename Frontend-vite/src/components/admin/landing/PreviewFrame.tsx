import type { ReactNode } from "react";

/**
 * Renders the section with the exact same components the public homepage
 * uses — this is not a mockup or a screenshot, it's the real thing, just
 * fed the form's current (possibly unsaved) values.
 */
export function PreviewFrame({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-[var(--radius-card)] border border-[var(--border-subtle)] shadow-[var(--shadow-soft)]">
      <div className="flex items-center gap-2 border-b border-[var(--border-subtle)] surface-sunken px-4 py-2.5">
        <span className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[var(--border-strong)]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[var(--border-strong)]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[var(--border-strong)]" />
        </span>
        <span className="text-xs font-medium text-[var(--text-muted)]">Live preview</span>
      </div>
      <div className="max-h-[36rem] overflow-y-auto surface">{children}</div>
    </div>
  );
}
