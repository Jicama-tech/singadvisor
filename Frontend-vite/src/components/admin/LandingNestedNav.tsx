import { Link } from "react-router-dom";
import { useLocation } from "react-router-dom";
import { Icon, type IconName } from "@/components/ui/Icon";
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

  return (
    <nav
      // Same sticky geometry as EventsNestedNav — clears the sticky header
      // (top-24) and keeps its own scroll inside the viewport.
      className="flex shrink-0 flex-col gap-0.5 border-[var(--border-subtle)] p-3 lg:sticky lg:top-24 lg:z-20 lg:max-h-[calc(100vh-8rem)] lg:w-56 lg:overflow-y-auto lg:border-r"
      aria-label="Landing page sections"
    >
      <p className="hidden px-3 pb-2 text-[0.7rem] font-semibold uppercase tracking-wider text-[var(--text-muted)] lg:block">
        Landing page
      </p>
      <ul className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1 lg:mx-0 lg:flex-col lg:gap-0.5 lg:overflow-visible lg:px-0 lg:pb-0 [&::-webkit-scrollbar]:hidden">
        <li className="shrink-0 lg:shrink">
          <Link
            to="/admin/landing"
            aria-current={pathname === "/admin/landing" ? "page" : undefined}
            className={cn(
              "flex items-center gap-2.5 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              pathname === "/admin/landing"
                ? "bg-[var(--accent-soft)] text-[var(--accent-on-soft)]"
                : "text-[var(--text-secondary)] hover:bg-[var(--surface-sunken)] hover:text-[var(--text-primary)]",
            )}
          >
            <Icon name="layers" size={16} className="shrink-0" />
            <span>All sections</span>
          </Link>
        </li>
        {SECTION_TABS.map((tab) => {
          const active = pathname === tab.href;
          return (
            <li key={tab.href} className="shrink-0 lg:shrink">
              <Link
                to={tab.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2.5 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-[var(--accent-soft)] text-[var(--accent-on-soft)]"
                    : "text-[var(--text-secondary)] hover:bg-[var(--surface-sunken)] hover:text-[var(--text-primary)]",
                )}
              >
                <Icon name={tab.icon} size={16} className="shrink-0" />
                <span>{tab.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
