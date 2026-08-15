"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { logout } from "@/app/admin/actions";
import { Icon, type IconName } from "@/components/ui/Icon";
import { ThemeToggle } from "@/components/site/ThemeToggle";
import { cn } from "@/lib/utils";

export type AdminCounts = {
  registrations: number;
  enquiries: number;
  applications: number;
  messages: number;
};

const CONTENT_NAV: { href: string; label: string; icon: IconName }[] = [
  { href: "/admin/landing", label: "Landing page", icon: "layout" },
  { href: "/admin/trainings", label: "Trainings", icon: "sparkles" },
  { href: "/admin/events", label: "Events", icon: "calendar" },
  { href: "/admin/consultancy", label: "Consultancy", icon: "compass" },
  { href: "/admin/careers", label: "Careers", icon: "briefcase" },
  { href: "/admin/blog", label: "Blog", icon: "pencil" },
];

const INBOX_NAV: {
  href: string;
  label: string;
  icon: IconName;
  key: keyof AdminCounts;
}[] = [
  {
    href: "/admin/registrations",
    label: "Registrations",
    icon: "users",
    key: "registrations",
  },
  { href: "/admin/enquiries", label: "Enquiries", icon: "inbox", key: "enquiries" },
  {
    href: "/admin/applications",
    label: "Applications",
    icon: "briefcase",
    key: "applications",
  },
  { href: "/admin/messages", label: "Messages", icon: "mail", key: "messages" },
];

export function AdminShell({
  user,
  counts,
  children,
}: {
  user: { name: string; email: string; role: string };
  counts: AdminCounts;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) =>
    href === "/admin" ? pathname === href : pathname.startsWith(href);

  const nav = (
    <nav className="flex flex-col gap-6" aria-label="Admin">
      <div>
        <NavLink href="/admin" icon="activity" active={pathname === "/admin"}>
          Overview
        </NavLink>
      </div>

      <div>
        <p className="px-3 pb-2 text-[0.7rem] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
          Content
        </p>
        <ul className="flex flex-col gap-0.5">
          {CONTENT_NAV.map((item) => (
            <li key={item.href}>
              <NavLink href={item.href} icon={item.icon} active={isActive(item.href)}>
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <p className="px-3 pb-2 text-[0.7rem] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
          Inbox
        </p>
        <ul className="flex flex-col gap-0.5">
          {INBOX_NAV.map((item) => (
            <li key={item.href}>
              <NavLink
                href={item.href}
                icon={item.icon}
                active={isActive(item.href)}
                count={counts[item.key]}
              >
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );

  return (
    <div className="flex min-h-screen surface-sunken">
      {/* ---- Sidebar (desktop) ------------------------------------------ */}
      {/* Sticky + viewport-height so it stays put while `main` scrolls; the
          nav's own overflow-y-auto (below) picks up the scroll instead once
          there are enough tabs to overflow it. */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-[var(--border-subtle)] surface-raised lg:flex">
        <div className="flex h-16 items-center border-b border-[var(--border-subtle)] px-5">
          <Link href="/admin" className="font-[family-name:var(--font-display)] text-lg font-semibold">
            SingAdvisor
          </Link>
          <span className="ml-2 rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wider text-[var(--accent-on-soft)]">
            Admin
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-3">{nav}</div>

        <UserPanel user={user} />
      </aside>

      {/* ---- Main ------------------------------------------------------- */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center gap-3 border-b border-[var(--border-subtle)] surface-raised px-4 lg:px-8">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label={open ? "Close menu" : "Open menu"}
            className="grid h-10 w-10 place-items-center rounded-lg hover:bg-[var(--surface-sunken)] lg:hidden"
          >
            <Icon name={open ? "x" : "menu"} />
          </button>

          <Link
            href="/"
            target="_blank"
            className="ml-auto flex items-center gap-2 text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--accent)]"
          >
            <span className="hidden sm:inline">View site</span>
            <Icon name="external" size={14} />
          </Link>

          <form action={logout}>
            <button
              type="submit"
              className="flex items-center gap-2 text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--accent)]"
            >
              <span className="hidden sm:inline">Sign out</span>
              <Icon name="logout" size={14} />
            </button>
          </form>

          <ThemeToggle />
        </header>

        {open && (
          <div className="border-b border-[var(--border-subtle)] surface-raised p-3 lg:hidden">
            {nav}
            <UserPanel user={user} />
          </div>
        )}

        <main className="flex-1 p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}

function NavLink({
  href,
  icon,
  active,
  count,
  children,
}: {
  href: string;
  icon: IconName;
  active: boolean;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-[var(--accent-soft)] text-[var(--accent-on-soft)]"
          : "text-[var(--text-secondary)] hover:bg-[var(--surface-sunken)] hover:text-[var(--text-primary)]",
      )}
    >
      <Icon name={icon} size={17} className="shrink-0" />
      <span className="flex-1">{children}</span>
      {!!count && count > 0 && (
        <span className="rounded-full bg-[var(--accent)] px-1.5 py-0.5 text-[0.65rem] font-semibold text-[var(--accent-foreground)]">
          {count}
        </span>
      )}
    </Link>
  );
}

function UserPanel({ user }: { user: { name: string; email: string; role: string } }) {
  // Role label ("owner"/"editor") intentionally not shown here — the
  // sidebar header already reads "SingAdvisor Admin", so it was redundant.
  // Sign out lives in the top header next to "View site" instead.
  return (
    <div className="border-t border-[var(--border-subtle)] p-3">
      <div className="flex items-center gap-3 px-2 py-2">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--accent)] text-sm font-semibold text-[var(--accent-foreground)]">
          {user.name
            .split(" ")
            .map((w) => w[0])
            .slice(0, 2)
            .join("")}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-[var(--text-primary)]">
            {user.name}
          </p>
          <p className="truncate text-xs text-[var(--text-muted)]">{user.email}</p>
        </div>
      </div>
    </div>
  );
}
