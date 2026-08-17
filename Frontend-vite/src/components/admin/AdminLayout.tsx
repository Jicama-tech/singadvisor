import { useCallback, useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { adminFetch } from "@/lib/adminFetch";
import { AdminShell, type AdminCounts } from "@/components/admin/AdminShell";
import { tabForPath } from "@/lib/access-tabs";
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
  const [opTabs, setOpTabs] = useState<string[] | null>(null);

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

  // Operators get their CURRENT access keys from the backend (the JWT
  // carries the login-time snapshot; this refreshes it if an admin changed
  // them mid-session — next page load picks it up).
  useEffect(() => {
    if (user?.role === "operator") {
      void (async () => {
        try {
          const res = await adminFetch(`${__API_URL__}/operators/me`);
          if (res.ok) {
            const me = (await res.json()) as { accessTabs?: string[] };
            setOpTabs(me.accessTabs ?? []);
          }
        } catch {
          setOpTabs([]);
        }
      })();
    }
  }, [user?.role]);

  useEffect(() => {
    void refreshCounts();
  }, [refreshCounts, location.pathname]);

  if (loading) return <LoadingScreen />;
  // Operators: wait for their fresh access keys before rendering the shell —
  // otherwise the sidebar flashes empty for a beat while /operators/me loads.
  if (user?.role === "operator" && opTabs === null) return <LoadingScreen />;
  if (!user) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/admin/login?next=${next}`} replace />;
  }

  // Pages that render their own secondary sidebar need the content area
  // flush so the nested nav sits next to the primary sidebar (its own
  // padding is the only gutter) instead of main's default p-8.
  const flush = isEventsDashboardRoute(location.pathname) || isLandingDashboardRoute(location.pathname);

  // Enforce tab access for operators: a route outside their grant renders
  // the access-denied panel instead of the page (the sidebar already hides
  // the entry — this covers deep links too).
  const denied =
    user.role === "operator" &&
    opTabs !== null &&
    (() => {
      const required = tabForPath(location.pathname);
      return required !== null && !opTabs.includes(required);
    })();

  return (
    <AdminShell
      user={{ name: user.name, email: user.email, role: user.role }}
      counts={counts}
      allowedTabs={user.role === "operator" ? (opTabs ?? []) : undefined}
      mainClassName={flush ? "p-0" : undefined}
    >
      {denied ? (
        <div className="p-4 lg:p-8">
          <div className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] surface-raised p-10 text-center">
            <h2 className="text-lg text-[var(--text-primary)]">No access</h2>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Your account does not have access to this section. Ask an admin to update your access.
            </p>
          </div>
        </div>
      ) : (
        <Outlet />
      )}
    </AdminShell>
  );
}
