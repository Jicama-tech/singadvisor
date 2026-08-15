import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-full font-medium transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 whitespace-nowrap";

const variants: Record<Variant, string> = {
  // Dark mode flips --accent to a light teal, where white text lands at 2.3:1.
  // Dark ink on that same teal is ~10:1, so the label colour flips with it.
  primary:
    "bg-[var(--accent)] text-[var(--accent-foreground)] shadow-[var(--shadow-soft)] hover:bg-[var(--accent-hover)] hover:shadow-[var(--shadow-lift)] active:scale-[0.98]",
  secondary:
    "border border-[var(--border-strong)] bg-[var(--surface-raised)] text-[var(--text-primary)] hover:border-[var(--accent)] hover:text-[var(--accent)] active:scale-[0.98]",
  ghost:
    "text-[var(--text-secondary)] hover:bg-[var(--surface-sunken)] hover:text-[var(--text-primary)]",
  danger:
    "bg-red-600 text-white hover:bg-red-700 active:scale-[0.98] dark:bg-red-500 dark:hover:bg-red-600",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-4 text-sm",
  md: "h-11 px-6 text-[0.9375rem]",
  lg: "h-13 px-8 text-base",
};

type CommonProps = {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: CommonProps & ComponentProps<"button">) {
  return (
    <button
      className={cn(base, variants[variant], sizes[size], className)}
      {...props}
    >
      {children}
    </button>
  );
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: CommonProps & ComponentProps<typeof Link>) {
  return (
    <Link
      className={cn(base, variants[variant], sizes[size], className)}
      {...props}
    >
      {children}
    </Link>
  );
}
