import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { AdminShell } from "@/components/admin/AdminShell";
import { isEventsDashboardRoute } from "@/components/admin/EventsNestedNav";
import { isLandingDashboardRoute } from "@/components/admin/LandingNestedNav";
import LoadingScreen from "@/components/ui/LoadingScreen";

/**
 * The persistent admin layout: a single parent route (/admin) renders this
 * ONCE, so the sidebar/header stay mounted across every tab switch and only
 * the <Outlet/> content swaps — the dashboard feels like one page with
 * tabs rather than a chain of separate page loads (eventsh's own
 * OrganizerDashboard behaves the same way). Also owns the single admin
 * guard that every nested page used to carry individually.
 */
export default function AdminLayout() {
  const { user, loading } = useAuth();
  const location = useLocation();

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
      counts={{ registrations: 0, enquiries: 0, applications: 0, messages: 0 }}
      mainClassName={flush ? "p-0" : undefined}
    >
      <Outlet />
    </AdminShell>
  );
}
