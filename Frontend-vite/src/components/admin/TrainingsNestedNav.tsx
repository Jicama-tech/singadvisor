import { Link } from "react-router-dom";
import { useLocation } from "react-router-dom";
import { Icon, type IconName } from "@/components/ui/Icon";
import { useSidebarCollapse } from "@/hooks/useSidebarCollapse";
import { cn } from "@/lib/utils";

/**
 * The Trainings secondary sidebar — the same structural pattern as
 * EventsNestedNav and LandingNestedNav (route-based tabs, sticky column,
 * collapses the primary AdminShell sidebar to icons via
 * `isTrainingsDashboardRoute`).
 *
 * A "course" here is the existing Training, not a new entity: Courses is the
 * training list, Facilitators moved down from its own top-level sidebar entry
 * (keeping it at /admin/facilitators would light up both Trainings and
 * Facilitators at once, since AdminShell matches by prefix), and Content is
 * the curriculum an admin builds on top of a training.
 *
 * Collapse behavior matches the other two navs: full-width (labels) on the
 * parent Courses tab, icon-only once any tab has been clicked — the user
 * picked where they're going, so the nav gives the content pane the width
 * back. Labels remain reachable via `title` tooltips.
 */
const TRAININGS_ROOT = "/admin/trainings";

const TABS: { href: string; label: string; icon: IconName }[] = [
  { href: TRAININGS_ROOT, label: "Courses", icon: "sparkles" },
  { href: "/admin/trainings/facilitators", label: "Facilitators", icon: "users" },
  { href: "/admin/trainings/content", label: "Content", icon: "layers" },
];

/** A tab owns its own route and everything nested under it. The trailing slash
 * is the whole point: a bare startsWith would let "/admin/trainings/contents"
 * light up Content. */
function ownsRoute(href: string, pathname: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** True on /admin/trainings and anywhere below it — the whole area this nav
 * covers. Shared by TrainingsShell, AdminShell and AdminLayout so the three
 * never drift on when the nested nav is showing. */
export function isTrainingsDashboardRoute(pathname: string): boolean {
  return ownsRoute(TRAININGS_ROOT, pathname);
}

export function TrainingsNestedNav() {
  const { pathname } = useLocation();
  /**
   * Courses is the parent tab, so it owns /admin/trainings AND every route
   * hanging off it that no other tab claims — /admin/trainings/new and
   * /admin/trainings/:id are course pages, and a nav with nothing lit on them
   * reads as broken next to Facilitators and Content, which do stay lit on
   * their own sub-pages. What Courses gives up is taken from TABS rather than
   * named here, so a fourth tab keeps its sub-routes to itself without anyone
   * remembering to come back and widen this.
   */
  const isActive = (href: string) =>
    href === TRAININGS_ROOT
      ? ownsRoute(href, pathname) &&
        !TABS.some((tab) => tab.href !== TRAININGS_ROOT && ownsRoute(tab.href, pathname))
      : ownsRoute(href, pathname);

  // Full labels on the parent Courses tab; icon-only once any other tab is
  // open (see the component comment). The user can also toggle this by hand
  // at any time — that choice persists (localStorage) across tabs.
  const autoCollapsed = pathname !== TRAININGS_ROOT;
  const [collapsed, toggleCollapsed] = useSidebarCollapse("trainings-nav-collapsed", autoCollapsed);

  return (
    <nav
      // Same sticky geometry as EventsNestedNav: top-24 (6rem = the header's
      // own h-16/4rem + the original 2rem gap) clears AdminShell's sticky
      // header, and the max-height trims the same 6rem off the top plus a
      // matching 2rem at the bottom so the nav's own scroll never runs under
      // the header or off the bottom of the screen.
      className={cn(
        "flex shrink-0 flex-col gap-0.5 border-[var(--border-subtle)] p-3 transition-[width] duration-200 lg:sticky lg:top-24 lg:z-20 lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto lg:border-r",
        collapsed ? "lg:w-16" : "lg:w-56",
      )}
      aria-label="Trainings"
    >
      <button
        type="button"
        onClick={toggleCollapsed}
        aria-label={collapsed ? "Expand trainings nav" : "Collapse trainings nav"}
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
          Trainings
        </p>
      )}
      {/* Desktop: a vertical secondary sidebar. Mobile: a horizontal
          scrollable strip (the same collapse-to-row pattern EventsNestedNav
          uses for narrow screens), since a third nested column has nowhere to
          go next to AdminShell's own sidebar. */}
      <ul className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1 lg:mx-0 lg:flex-col lg:gap-0.5 lg:overflow-visible lg:px-0 lg:pb-0 [&::-webkit-scrollbar]:hidden">
        {TABS.map((tab) => {
          const active = isActive(tab.href);
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
