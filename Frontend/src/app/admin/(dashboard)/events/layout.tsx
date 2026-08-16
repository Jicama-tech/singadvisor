"use client";

import { usePathname } from "next/navigation";
import { EventsNestedNav, EVENTS_DASHBOARD_ROUTES } from "@/components/admin/EventsNestedNav";

/**
 * Wraps every /admin/events/* route. Shows the nested "Organizer dashboard"
 * sidebar only for the 12 dashboard-tab routes it defines
 * (EVENTS_DASHBOARD_ROUTES) — /admin/events/new, /admin/events/[id], and
 * /admin/events/[id]/sponsors are focused full-width forms (matching how
 * EventForm.tsx already works) and fall through to plain `{children}`.
 *
 * A client component so it can read the current route via usePathname() —
 * `children` is still rendered server-side by the parent layer as usual,
 * this boundary only decides which chrome to wrap it in.
 */
export default function EventsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isDashboardTab = EVENTS_DASHBOARD_ROUTES.some((href) =>
    href === "/admin/events" ? pathname === href : pathname.startsWith(href),
  );

  if (!isDashboardTab) return <>{children}</>;

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
      <EventsNestedNav />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
