
import { Link } from "react-router-dom";
import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Icon, type IconName } from "@/components/ui/Icon";
import { ThemeToggle } from "@/components/site/ThemeToggle";
import { isEventsDashboardRoute } from "@/components/admin/EventsNestedNav";
import { isLandingDashboardRoute } from "@/components/admin/LandingNestedNav";
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
  mainClassName,
}: {
  user: { name: string; email: string; role: string };
  counts: AdminCounts;
  children: React.ReactNode;
  /** Overrides the default content padding — pages that render their own
   * secondary sidebar (EventsShell/LandingShell) pass "p-0" so the sidebar
   * sits flush against the primary one instead of leaving a double-width
   * whitespace gutter; those shells pad their own columns internally. */
  mainClassName?: string;
}) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [open, setOpen] = useState(false);

  // One place handles "your session expired": adminFetch dispatches this
  // window event on any 401 (eventsh's adminFetch convention, ported) — clear
  // the session and send the user back to the login page.
  useEffect(() => {
    const onExpired = () => {
      logout();
      navigate("/admin/login", { replace: true });
    };
    window.addEventListener("admin-session-expired", onExpired);
    return () => window.removeEventListener("admin-session-expired", onExpired);
  }, [logout, navigate]);

  const isActive = (href: string) =>
    href === "/admin" ? pathname === href : pathname.startsWith(href);

  // Collapse to icon-only once the Events nested "Organizer dashboard"
  // sidebar is showing — two full sidebars side by side left barely any
  // room for the actual page content. Only the desktop `<aside>` collapses;
  // the mobile menu (a dropdown, not a permanent column) stays full-width
  // since it isn't competing with the nested nav for horizontal space.
  const collapsed = isEventsDashboardRoute(pathname) || isLandingDashboardRoute(pathname);

  const nav = (
    <nav className="flex flex-col gap-6" aria-label="Admin">
      <div>
        <NavLink href="/admin" icon="activity" active={pathname === "/admin"} collapsed={collapsed}>
          Overview
        </NavLink>
      </div>

      <div>
        {!collapsed && (
          <p className="px-3 pb-2 text-[0.7rem] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            Content
          </p>
        )}
        <ul className="flex flex-col gap-0.5">
          {CONTENT_NAV.map((item) => (
            <li key={item.href}>
              <NavLink href={item.href} icon={item.icon} active={isActive(item.href)} collapsed={collapsed}>
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </div>

      <div>
        {!collapsed && (
          <p className="px-3 pb-2 text-[0.7rem] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            Inbox
          </p>
        )}
        <ul className="flex flex-col gap-0.5">
          {INBOX_NAV.map((item) => (
            <li key={item.href}>
              <NavLink
                href={item.href}
                icon={item.icon}
                active={isActive(item.href)}
                count={counts[item.key]}
                collapsed={collapsed}
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
      <aside
        className={cn(
          "sticky top-0 hidden h-screen shrink-0 flex-col border-r border-[var(--border-subtle)] surface-raised transition-[width] duration-200 lg:flex",
          collapsed ? "w-[68px]" : "w-64",
        )}
      >
        <div
          className={cn(
            "flex h-16 items-center border-b border-[var(--border-subtle)]",
            collapsed ? "justify-center px-2" : "px-5",
          )}
        >
          {collapsed ? (
            <Link
              to="/admin"
              title="SingAdvisor Admin"
              className="grid h-9 w-9 place-items-center rounded-lg bg-[var(--accent-soft)] font-[family-name:var(--font-display)] text-sm font-semibold text-[var(--accent-on-soft)]"
            >
              S
            </Link>
          ) : (
            <>
              <Link to="/admin" className="font-[family-name:var(--font-display)] text-lg font-semibold">
                SingAdvisor
              </Link>
              <span className="ml-2 rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wider text-[var(--accent-on-soft)]">
                Admin
              </span>
            </>
          )}
        </div>

        <div className={cn("flex-1 overflow-y-auto", collapsed ? "p-2" : "p-3")}>{nav}</div>

        <UserPanel user={user} collapsed={collapsed} />
      </aside>

      {/* ---- Main ------------------------------------------------------- */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Sticky so it stays in view while `main` scrolls, matching the
            primary sidebar and (now offset to clear this) the Events
            nested nav. z-30 keeps it above ordinary scrolling content;
            the primary sidebar (a separate column, never visually
            overlaps this) doesn't need the same treatment. */}
        <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b border-[var(--border-subtle)] surface-raised px-4 lg:px-8">
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
            to="/"
            target="_blank"
            className="ml-auto flex items-center gap-2 text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--accent)]"
          >
            <span className="hidden sm:inline">View site</span>
            <Icon name="external" size={14} />
          </Link>

          <button
            type="button"
            onClick={() => {
              logout();
              navigate("/", { replace: true });
            }}
            className="flex items-center gap-2 text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--accent)]"
          >
            <span className="hidden sm:inline">Sign out</span>
            <Icon name="logout" size={14} />
          </button>

          <ThemeToggle />
        </header>

        {open && (
          <div className="border-b border-[var(--border-subtle)] surface-raised p-3 lg:hidden">
            {nav}
            <UserPanel user={user} />
          </div>
        )}

        <main className={cn("flex-1", mainClassName ?? "p-4 lg:p-8")}>{children}</main>
      </div>
    </div>
  );
}

function NavLink({
  href,
  icon,
  active,
  count,
  collapsed,
  children,
}: {
  href: string;
  icon: IconName;
  active: boolean;
  count?: number;
  collapsed?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      to={href}
      aria-current={active ? "page" : undefined}
      // The label still needs to reach assistive tech and hover users when
      // collapsed — `title` covers both without permanently reserving the
      // width a visible label would need.
      title={collapsed ? String(children) : undefined}
      className={cn(
        "flex items-center gap-3 rounded-lg py-2 text-sm font-medium transition-colors",
        collapsed ? "justify-center px-0" : "px-3",
        active
          ? "bg-[var(--accent-soft)] text-[var(--accent-on-soft)]"
          : "text-[var(--text-secondary)] hover:bg-[var(--surface-sunken)] hover:text-[var(--text-primary)]",
      )}
    >
      <span className="relative shrink-0">
        <Icon name={icon} size={17} />
        {/* Collapsed: swap the full count badge for a small dot so
            "something needs attention" still reads at a glance without
            needing space for digits. */}
        {collapsed && !!count && count > 0 && (
          <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-[var(--accent)]" />
        )}
      </span>
      {!collapsed && (
        <>
          <span className="flex-1">{children}</span>
          {!!count && count > 0 && (
            <span className="rounded-full bg-[var(--accent)] px-1.5 py-0.5 text-[0.65rem] font-semibold text-[var(--accent-foreground)]">
              {count}
            </span>
          )}
        </>
      )}
    </Link>
  );
}

function UserPanel({
  user,
  collapsed,
}: {
  user: { name: string; email: string; role: string };
  collapsed?: boolean;
}) {
  // Role label ("owner"/"editor") intentionally not shown here — the
  // sidebar header already reads "SingAdvisor Admin", so it was redundant.
  // Sign out lives in the top header next to "View site" instead.
  return (
    <div className="border-t border-[var(--border-subtle)] p-3">
      <div
        className={cn(
          "flex items-center gap-3 py-2",
          collapsed ? "justify-center px-0" : "px-2",
        )}
        title={collapsed ? `${user.name} — ${user.email}` : undefined}
      >
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--accent)] text-sm font-semibold text-[var(--accent-foreground)]">
          {user.name
            .split(" ")
            .map((w) => w[0])
            .slice(0, 2)
            .join("")}
        </span>
        {!collapsed && (
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-[var(--text-primary)]">
              {user.name}
            </p>
            <p className="truncate text-xs text-[var(--text-muted)]">{user.email}</p>
          </div>
        )}
      </div>
    </div>
  );
}
