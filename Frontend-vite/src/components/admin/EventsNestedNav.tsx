
import { Link } from "react-router-dom";
import { useLocation } from "react-router-dom";
import { Icon, type IconName } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";

/**
 * The "Organizer Dashboard" tab list, mirroring eventsh's own
 * OrganizerDashboard.tsx navigationItems 1:1 by concept — same 12 tabs, same
 * order — but as routes under /admin/events/* instead of client-side tab
 * state, and styled with this app's own tokens/Icon set, not eventsh's
 * shadcn/Radix components. Only Events/Coupons and Participants are real so
 * far; the rest render a "Coming soon" placeholder (see the /admin/events/*
 * placeholder pages) so the full tab list is genuinely browsable today.
 */
const TABS: { href: string; label: string; icon: IconName }[] = [
  { href: "/admin/events/chatbot", label: "Chatbot", icon: "message-circle" },
  { href: "/admin/events/analytics", label: "Analytics", icon: "activity" },
  { href: "/admin/events/kiosk", label: "In-Person Booking", icon: "scan" },
  { href: "/admin/events/participants", label: "Participants", icon: "users" },
  { href: "/admin/events/platform-fees", label: "Platform Fees", icon: "dollar-sign" },
  { href: "/admin/events/crm", label: "CRM", icon: "phone" },
  { href: "/admin/events", label: "Events/Coupons", icon: "calendar" },
  { href: "/admin/events/feedback", label: "Feedback", icon: "mail" },
  { href: "/admin/events/membership", label: "Membership", icon: "heart" },
  { href: "/admin/events/support", label: "Support", icon: "life-buoy" },
  { href: "/admin/events/eventfront", label: "Eventfront", icon: "layout" },
  { href: "/admin/events/settings", label: "Settings", icon: "settings" },
];

/** Every route this nav links to — used by EventsShell (and AdminShell, to
 * decide when to collapse itself to icon-only) to tell whether a given
 * /admin/events/* page is a "dashboard tab" (show the nested nav) or a
 * focused sub-page like /new or /[id] (hide it, full width). */
export const EVENTS_DASHBOARD_ROUTES = TABS.map((t) => t.href);

/** "/admin/events" itself must match exactly (every other route under
 * /admin/events/* would otherwise also satisfy startsWith("/admin/events")).
 * Shared by EventsLayout and AdminShell so the two never drift apart on
 * which routes count as "the nested nav is showing". */
export function isEventsDashboardRoute(pathname: string): boolean {
  return EVENTS_DASHBOARD_ROUTES.some((href) =>
    href === "/admin/events" ? pathname === href : pathname.startsWith(href),
  );
}

export function EventsNestedNav() {
  const { pathname } = useLocation();
  const isActive = (href: string) =>
    href === "/admin/events" ? pathname === href : pathname.startsWith(href);

  return (
    <nav
      // top-24 (6rem = the header's own h-16/4rem + the original 2rem gap)
      // clears AdminShell's now-also-sticky header instead of sitting behind
      // it; max-height trims the same 6rem off the top plus a matching 2rem
      // at the bottom so the nav's own scroll (once there are enough tabs to
      // need it) never runs under the header or off the bottom of the screen.
      className="flex shrink-0 flex-col gap-0.5 border-[var(--border-subtle)] p-3 lg:sticky lg:top-24 lg:z-20 lg:max-h-[calc(100vh-8rem)] lg:w-56 lg:overflow-y-auto lg:border-r"
      aria-label="Organizer dashboard"
    >
      <p className="hidden px-3 pb-2 text-[0.7rem] font-semibold uppercase tracking-wider text-[var(--text-muted)] lg:block">
        Organizer dashboard
      </p>
      {/* Desktop: a vertical secondary sidebar. Mobile: a horizontal
          scrollable strip (same collapse-to-row pattern EventForm.tsx's own
          in-page Tabs already use for narrow screens), since a third nested
          column has nowhere to go next to AdminShell's own sidebar. */}
      <ul className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1 lg:mx-0 lg:flex-col lg:gap-0.5 lg:overflow-visible lg:px-0 lg:pb-0 [&::-webkit-scrollbar]:hidden">
        {TABS.map((tab) => {
          const active = isActive(tab.href);
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
