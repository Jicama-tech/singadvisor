import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { adminFetch } from "@/lib/adminFetch";
import { PageHeading, StatTile, Panel } from "@/components/admin/AdminUI";
import { Link } from "react-router-dom";

type OverviewStats = {
  trainings: number;
  events: number;
  consultancyServices: number;
  posts: number;
  jobs: number;
  ticketsSold: number;
  revenue: number;
  revenueCurrency: string;
  inbox: {
    registrations: number;
    enquiries: number;
    applications: number;
    messages: number;
  };
  totals: {
    registrations: number;
    enquiries: number;
    applications: number;
    contactMessages: number;
  };
};

const formatRevenue = (minor: number, currency: string) => {
  const amount = minor / 100;
  if (currency === "SGD") return `S$${amount.toLocaleString("en-SG", { minimumFractionDigits: 2 })}`;
  return `${currency} ${amount.toLocaleString()}`;
};

/**
 * Dashboard home — every figure now comes from GET /admin/overview-stats
 * (content counts + eventsh events/tickets/revenue + inbox unreads). "—"
 * tiles only ever appear while loading or when the endpoint errors.
 */
export default function AdminOverview() {
  const { user } = useAuth();
  const [stats, setStats] = useState<OverviewStats | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await adminFetch(`${__API_URL__}/admin/overview-stats`);
        if (res.ok && !cancelled) setStats((await res.json()) as OverviewStats);
      } catch {
        /* keep the "—" tiles */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!user) return null;

  return (
    <div className="flex flex-col gap-8">
      <PageHeading
        title="Overview"
        description="Everything the site publishes, everything people have sent in, and what the event platform reports."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Trainings" value={stats ? String(stats.trainings) : "—"} />
        <StatTile label="Events" value={stats ? String(stats.events) : "—"} />
        <StatTile label="Consultancy services" value={stats ? String(stats.consultancyServices) : "—"} />
        <StatTile label="Blog posts" value={stats ? String(stats.posts) : "—"} />
      </div>

      <Panel className="p-6">
        <h2 className="text-lg">Events & revenue</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl bg-[var(--surface-sunken)] p-4 text-center">
            <p className="text-2xl font-semibold text-[var(--text-primary)]">
              {stats ? String(stats.ticketsSold) : "—"}
            </p>
            <p className="mt-1 text-xs text-[var(--text-muted)]">Tickets sold</p>
          </div>
          <div className="rounded-xl bg-[var(--surface-sunken)] p-4 text-center">
            <p className="text-2xl font-semibold text-[var(--text-primary)]">
              {stats ? formatRevenue(stats.revenue, stats.revenueCurrency) : "—"}
            </p>
            <p className="mt-1 text-xs text-[var(--text-muted)]">Ticket revenue</p>
          </div>
          <div className="rounded-xl bg-[var(--surface-sunken)] p-4 text-center">
            <p className="text-2xl font-semibold text-[var(--text-primary)]">
              {stats ? String(stats.jobs) : "—"}
            </p>
            <p className="mt-1 text-xs text-[var(--text-muted)]">Open job postings</p>
          </div>
        </div>
      </Panel>

      <Panel className="p-6">
        <h2 className="text-lg">Inbox</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {[
            ["/admin/registrations", "Registrations", stats?.totals.registrations],
            ["/admin/enquiries", "Enquiries", stats?.totals.enquiries],
            ["/admin/applications", "Applications", stats?.totals.applications],
            ["/admin/messages", "Messages", stats?.totals.contactMessages],
          ].map(([href, label, count]) => (
            <Link
              key={href as string}
              to={href as string}
              className="flex items-center justify-between rounded-xl bg-[var(--surface-sunken)] px-4 py-3 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:text-[var(--accent)]"
            >
              {label}
              <span className="font-semibold text-[var(--text-primary)]">
                {stats ? String(count) : "—"}
              </span>
            </Link>
          ))}
        </div>
      </Panel>

      {(() => {
        // Operators see only the quick links their access tabs allow (the
        // same keys the sidebar uses); admins see all of them.
        const allowed = user.tabs;
        const links = [
          ["/admin/trainings/new", "New training", "trainings"],
          ["/admin/events/new", "New event", "events"],
          ["/admin/consultancy/new", "New consultancy service", "consultancy"],
          ["/admin/careers/new", "New job posting", "careers"],
          ["/admin/blog/new", "New blog post", "blog"],
          ["/admin/landing", "Edit landing page", "landing"],
        ].filter((entry) => !allowed || allowed.includes(entry[2] as string));
        if (links.length === 0) return null;
        return (
          <Panel className="p-6">
            <h2 className="text-lg">Quick links</h2>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {links.map(([href, label]) => (
                <Link
                  key={href}
                  to={href}
                  className="rounded-lg border border-[var(--border-subtle)] px-4 py-3 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
                >
                  {label} →
                </Link>
              ))}
            </div>
          </Panel>
        );
      })()}
    </div>
  );
}
