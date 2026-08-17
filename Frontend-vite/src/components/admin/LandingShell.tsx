import type { ReactNode } from "react";
import { LandingNestedNav } from "@/components/admin/LandingNestedNav";

/**
 * The landing-page equivalent of EventsShell: pages under /admin/landing
 * render inside AdminShell PLUS the "Landing page" secondary sidebar (the
 * 9 homepage sections as tabs + an "All sections" overview), mirroring the
 * Events organizer-dashboard structure. The primary sidebar collapses to
 * icons on these routes (see AdminShell's isLandingDashboardRoute check).
 */
export default function LandingShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0 lg:flex-row lg:items-start">
        <LandingNestedNav />
        <div className="min-w-0 flex-1 p-4 lg:p-6">{children}</div>
    </div>
  );
}
