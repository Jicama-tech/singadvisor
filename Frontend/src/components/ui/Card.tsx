import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Card({
  children,
  className,
  interactive = false,
}: {
  children: ReactNode;
  className?: string;
  interactive?: boolean;
}) {
  return (
    <div
      className={cn(
        "surface-raised relative flex flex-col overflow-hidden rounded-[var(--radius-card)] border border-[var(--border-subtle)] shadow-[var(--shadow-soft)]",
        interactive &&
          "transition-all duration-300 hover:-translate-y-1 hover:border-[var(--accent)]/40 hover:shadow-[var(--shadow-lift)] focus-within:-translate-y-1 focus-within:shadow-[var(--shadow-lift)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function CardBody({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-1 flex-col gap-3 p-6", className)}>
      {children}
    </div>
  );
}
