import Link from "next/link";
import type { ReactNode } from "react";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";

export function PageHeading({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl md:text-3xl">{title}</h1>
        {description && (
          <p className="mt-1.5 text-sm text-[var(--text-secondary)]">
            {description}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}

export function Panel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-[var(--radius-card)] border border-[var(--border-subtle)] surface-raised shadow-[var(--shadow-soft)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Horizontally scrollable table wrapper — narrow screens must never push
    the page body sideways. */
export function TableWrap({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[44rem] text-left text-sm">{children}</table>
    </div>
  );
}

export function Th({
  children,
  className,
}: {
  children?: ReactNode;
  className?: string;
}) {
  return (
    <th
      scope="col"
      className={cn(
        "border-b border-[var(--border-subtle)] px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]",
        className,
      )}
    >
      {children}
    </th>
  );
}

export function Td({
  children,
  className,
}: {
  children?: ReactNode;
  className?: string;
}) {
  return (
    <td
      className={cn(
        "border-b border-[var(--border-subtle)] px-4 py-3 align-middle",
        className,
      )}
    >
      {children}
    </td>
  );
}

export function StatTile({
  label,
  value,
  href,
  hint,
}: {
  label: string;
  value: number | string;
  href?: string;
  hint?: string;
}) {
  const body = (
    <>
      <p className="text-sm text-[var(--text-secondary)]">{label}</p>
      <p className="mt-1 font-[family-name:var(--font-display)] text-3xl font-semibold text-[var(--text-primary)]">
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-[var(--text-muted)]">{hint}</p>}
    </>
  );

  const classes =
    "rounded-[var(--radius-card)] border border-[var(--border-subtle)] surface-raised p-5 shadow-[var(--shadow-soft)]";

  if (!href) return <div className={classes}>{body}</div>;

  return (
    <Link
      href={href}
      className={cn(
        classes,
        "group block transition-all hover:-translate-y-0.5 hover:border-[var(--accent)]/40 hover:shadow-[var(--shadow-lift)]",
      )}
    >
      {body}
      <span className="mt-3 flex items-center gap-1 text-xs font-medium text-[var(--accent)]">
        View
        <Icon
          name="arrow-right"
          size={12}
          className="transition-transform group-hover:translate-x-0.5"
        />
      </span>
    </Link>
  );
}

export function AdminEmpty({ message }: { message: string }) {
  return (
    <p className="px-4 py-16 text-center text-sm text-[var(--text-secondary)]">
      {message}
    </p>
  );
}
