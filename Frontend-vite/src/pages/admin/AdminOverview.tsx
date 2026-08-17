import { useAuth } from "@/hooks/useAuth";
import { PageHeading, StatTile, Panel, AdminEmpty } from "@/components/admin/AdminUI";
import { Link } from "react-router-dom";

/**
 * Dashboard home. The Next version server-rendered four Prisma counts as
 * sidebar badges plus a simple overview; the SPA keeps the shell alive and
 * defers live badges to a later pass — counts currently come back as zeros
 * until the inbox pages (which fetch the real lists) also report them up.
 */
export default function AdminOverview() {
  const { user } = useAuth();
  if (!user) return null;

  return (
      <div className="flex flex-col gap-8">
        <PageHeading
          title="Overview"
          description="Everything the site publishes, and everything people have sent in."
        />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile label="Trainings" value="—" />
          <StatTile label="Events" value="—" />
          <StatTile label="Consultancy services" value="—" />
          <StatTile label="Blog posts" value="—" />
        </div>

        <Panel className="p-6">
          <h2 className="text-lg">Quick links</h2>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {[
              ["/admin/trainings/new", "New training"],
              ["/admin/events/new", "New event"],
              ["/admin/consultancy/new", "New consultancy service"],
              ["/admin/careers/new", "New job posting"],
              ["/admin/blog/new", "New blog post"],
              ["/admin/landing", "Edit landing page"],
            ].map(([href, label]) => (
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

        <AdminEmpty
          title="Inbox preview coming soon"
          description="Registrations, enquiries, applications and messages will surface here once their pages are ported."
        />
      </div>
  );
}
