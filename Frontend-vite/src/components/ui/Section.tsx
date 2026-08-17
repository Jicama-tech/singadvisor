import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Section({
  children,
  className,
  tone = "default",
  id,
}: {
  children: ReactNode;
  className?: string;
  tone?: "default" | "sunken";
  id?: string;
}) {
  return (
    <section
      id={id}
      className={cn(
        "py-16 md:py-24",
        tone === "sunken" && "surface-sunken",
        className,
      )}
    >
      <div className="container-page">{children}</div>
    </section>
  );
}

export function SectionHeader({
  eyebrow,
  title,
  description,
  align = "left",
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3",
        align === "center" ? "mx-auto max-w-2xl text-center items-center" : "max-w-2xl",
        className,
      )}
    >
      {eyebrow && (
        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">
          {eyebrow}
        </span>
      )}
      <h2 className="text-3xl md:text-4xl">{title}</h2>
      {description && (
        <p className="text-base leading-relaxed text-[var(--text-secondary)]">
          {description}
        </p>
      )}
    </div>
  );
}

/** Shared hero for the four use-case landing pages. */
export function PageHero({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    // `[&+section]:pt-10` trims the following section's top padding: a hero's
    // bottom padding plus a section's default top padding stacks into an
    // awkwardly large gap.
    <div className="relative overflow-hidden border-b border-[var(--border-subtle)] surface-sunken [&+section]:pt-10 md:[&+section]:pt-14">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-32 -right-24 h-96 w-96 rounded-full bg-[var(--accent)]/10 blur-3xl"
      />
      <div className="container-page relative py-14 md:py-18">
        <div className="max-w-3xl animate-[var(--animate-fade-up)]">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">
            {eyebrow}
          </span>
          <h1 className="mt-3 text-4xl md:text-5xl lg:text-6xl">{title}</h1>
          <p className="mt-5 text-lg leading-relaxed text-[var(--text-secondary)]">
            {description}
          </p>
          {children && <div className="mt-8">{children}</div>}
        </div>
      </div>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-[var(--radius-card)] border border-dashed border-[var(--border-strong)] px-6 py-16 text-center">
      <h3 className="text-lg">{title}</h3>
      <p className="max-w-md text-sm text-[var(--text-secondary)]">{description}</p>
      {action}
    </div>
  );
}
