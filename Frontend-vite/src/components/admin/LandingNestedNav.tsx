import { Link } from "react-router-dom";
import { useLocation } from "react-router-dom";
import { Icon, type IconName } from "@/components/ui/Icon";
import { useSidebarCollapse } from "@/hooks/useSidebarCollapse";
import { cn } from "@/lib/utils";

/**
 * The "Landing page sections" secondary sidebar — the same structural
 * pattern as EventsNestedNav (route-based tabs, sticky column, collapses
 * the primary AdminShell sidebar to icons via `isLandingDashboardRoute`):
 * an "All sections" overview tab (visibility/reorder list) plus one tab per
 * of the 9 homepage sections, each opening that section's edit form in the
 * content pane.
 */
const SECTION_TABS: { href: string; label: string; icon: IconName }[] = [
  { href: "/admin/landing/hero", label: "Hero", icon: "image" },
  { href: "/admin/landing/stats", label: "Stats bar", icon: "activity" },
  { href: "/admin/landing/pillars", label: "Four pillars", icon: "grid" },
  { href: "/admin/landing/trainings", label: "Featured trainings", icon: "sparkles" },
  { href: "/admin/landing/events", label: "Upcoming events", icon: "calendar" },
  { href: "/admin/landing/consultancy", label: "Consultancy", icon: "compass" },
  { href: "/admin/landing/careers", label: "Careers", icon: "briefcase" },
  { href: "/admin/landing/blog", label: "From the blog", icon: "pencil" },
  { href: "/admin/landing/cta", label: "Closing CTA", icon: "arrow-right" },
];

/** True for every route under /admin/landing (the overview list and every
 * section edit page) — shared by LandingShell and AdminShell so the two
 * never drift apart on when the primary sidebar collapses. */
export function isLandingDashboardRoute(pathname: string): boolean {
  return pathname === "/admin/landing" || pathname.startsWith("/admin/landing/");
}

export function LandingNestedNav() {
  const { pathname } = useLocation();

  // Full labels on the "All sections" overview; icon-only once a section
  // tab has been clicked — same collapse convention as EventsNestedNav. The
  // user can also toggle this by hand at any time; that choice persists
  // (localStorage) across tabs.
  const autoCollapsed = pathname !== "/admin/landing";
  const [collapsed, toggleCollapsed] = useSidebarCollapse("landing-nav-collapsed", autoCollapsed);

  return (
    <nav
      // Same sticky geometry as EventsNestedNav — clears the sticky header
      // (top-24) and keeps its own scroll inside the viewport.
      className={
        "flex shrink-0 flex-col gap-0.5 border-[var(--border-subtle)] p-3 transition-[width] duration-200 lg:sticky lg:top-24 lg:z-20 lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto lg:border-r " +
        (collapsed ? "lg:w-16" : "lg:w-56")
      }
      aria-label="Landing page sections"
    >
      <button
        type="button"
        onClick={toggleCollapsed}
        aria-label={collapsed ? "Expand landing page nav" : "Collapse landing page nav"}
        title={collapsed ? "Expand" : "Collapse"}
        className={cn(
          "mb-1 grid h-7 w-7 shrink-0 place-items-center rounded-md text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-sunken)] hover:text-[var(--text-primary)]",
          !collapsed && "ml-auto",
        )}
      >
        <Icon
          name="chevron-down"
          size={14}
          className={cn("transition-transform", collapsed ? "-rotate-90" : "rotate-90")}
        />
      </button>
      {!collapsed && (
        <p className="hidden px-3 pb-2 text-[0.7rem] font-semibold uppercase tracking-wider text-[var(--text-muted)] lg:block">
          Landing page
        </p>
      )}
      <ul className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1 lg:mx-0 lg:flex-col lg:gap-0.5 lg:overflow-visible lg:px-0 lg:pb-0 [&::-webkit-scrollbar]:hidden">
        <li className="shrink-0 lg:shrink">
          <Link
            to="/admin/landing"
            aria-current={pathname === "/admin/landing" ? "page" : undefined}
            title={collapsed ? "All sections" : undefined}
            className={cn(
              "flex items-center gap-2.5 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              collapsed && "lg:justify-center lg:px-0",
              pathname === "/admin/landing"
                ? "bg-[var(--accent-soft)] text-[var(--accent-on-soft)]"
                : "text-[var(--text-secondary)] hover:bg-[var(--surface-sunken)] hover:text-[var(--text-primary)]",
            )}
          >
            <Icon name="layers" size={16} className="shrink-0" />
            {!collapsed && <span>All sections</span>}
          </Link>
        </li>
        {SECTION_TABS.map((tab) => {
          const active = pathname === tab.href;
          return (
            <li key={tab.href} className="shrink-0 lg:shrink">
              <Link
                to={tab.href}
                aria-current={active ? "page" : undefined}
                title={collapsed ? tab.label : undefined}
                className={cn(
                  "flex items-center gap-2.5 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  collapsed && "lg:justify-center lg:px-0",
                  active
                    ? "bg-[var(--accent-soft)] text-[var(--accent-on-soft)]"
                    : "text-[var(--text-secondary)] hover:bg-[var(--surface-sunken)] hover:text-[var(--text-primary)]",
                )}
              >
                <Icon name={tab.icon} size={16} className="shrink-0" />
                {!collapsed && <span>{tab.label}</span>}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
