import { useCallback, useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { adminFetch } from "@/lib/adminFetch";
import { AdminShell, type AdminCounts } from "@/components/admin/AdminShell";
import { isEventsDashboardRoute } from "@/components/admin/EventsNestedNav";
import { isLandingDashboardRoute } from "@/components/admin/LandingNestedNav";
import LoadingScreen from "@/components/ui/LoadingScreen";

/**
 * The persistent admin layout: a single parent route (/admin) renders this
 * ONCE, so the sidebar/header stay mounted across every tab switch and only
 * the <Outlet/> content swaps — the dashboard feels like one page with
 * tabs rather than a chain of separate page loads (eventsh's own
 * OrganizerDashboard behaves the same way). Also owns the single admin
 * guard that every nested page used to carry individually, and feeds the
 * sidebar its live inbox counts (refreshed on every tab switch).
 */
export default function AdminLayout() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [counts, setCounts] = useState<AdminCounts>({
    registrations: 0,
    enquiries: 0,
    applications: 0,
    messages: 0,
  });

  const refreshCounts = useCallback(async () => {
    try {
      const res = await adminFetch(`${__API_URL__}/admin/overview-stats`);
      if (!res.ok) return;
      const data = (await res.json()) as {
        inbox?: { registrations?: number; enquiries?: number; applications?: number; messages?: number };
      };
      const inbox = data.inbox ?? {};
      setCounts({
        registrations: inbox.registrations ?? 0,
        enquiries: inbox.enquiries ?? 0,
        applications: inbox.applications ?? 0,
        messages: inbox.messages ?? 0,
      });
    } catch {
      /* badges stay at their previous values */
    }
  }, []);

  useEffect(() => {
    void refreshCounts();
  }, [refreshCounts, location.pathname]);

  if (loading) return <LoadingScreen />;
  if (!user) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/admin/login?next=${next}`} replace />;
  }

  // Pages that render their own secondary sidebar need the content area
  // flush so the nested nav sits next to the primary sidebar (its own
  // padding is the only gutter) instead of main's default p-8.
  const flush = isEventsDashboardRoute(location.pathname) || isLandingDashboardRoute(location.pathname);

  return (
    <AdminShell
      user={{ name: user.name, email: user.email, role: user.role }}
      counts={counts}
      mainClassName={flush ? "p-0" : undefined}
    >
      <Outlet />
    </AdminShell>
  );
}
