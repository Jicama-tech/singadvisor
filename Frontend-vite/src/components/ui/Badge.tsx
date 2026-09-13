import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Exported because callers keep their own tone tables — the course-content
 * item-kind table maps each kind to a Badge tone, and needs the union to type
 * that row. */
export type BadgeTone = "accent" | "neutral" | "warn" | "success" | "danger" | "info";

const tones: Record<BadgeTone, string> = {
  accent:
    "bg-[var(--accent-soft)] text-[var(--accent-on-soft)] ring-[var(--accent)]/20",
  neutral:
    "surface-sunken text-[var(--text-secondary)] ring-[var(--border-strong)]",
  warn: "bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-950/50 dark:text-amber-200 dark:ring-amber-800/60",
  success:
    "bg-emerald-50 text-emerald-800 ring-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-200 dark:ring-emerald-800/60",
  danger:
    "bg-red-50 text-red-800 ring-red-200 dark:bg-red-950/50 dark:text-red-200 dark:ring-red-800/60",
  info: "bg-sky-50 text-sky-800 ring-sky-200 dark:bg-sky-950/50 dark:text-sky-200 dark:ring-sky-800/60",
};

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: BadgeTone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
