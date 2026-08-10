import Link from "next/link";
import { AdminEmpty, PageHeading, Panel, StatTile } from "@/components/admin/AdminUI";
import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
import { db } from "@/lib/db";
import { formatDate, formatDateTime } from "@/lib/utils";

export const metadata = { title: "Overview" };

export default async function AdminDashboard() {
  const [
    trainings,
    events,
    services,
    jobs,
    pendingRegs,
    newEnquiries,
    newApps,
    unreadMessages,
    subscribers,
    recentRegs,
    recentApps,
    recentEnquiries,
    nextEvent,
  ] = await Promise.all([
    db.training.count({ where: { published: true } }),
    db.event.count({ where: { published: true } }),
    db.consultancyService.count({ where: { published: true } }),
    db.jobPosting.count({ where: { published: true } }),
    db.registration.count({ where: { status: "pending" } }),
    db.consultancyEnquiry.count({ where: { status: "new" } }),
    db.jobApplication.count({ where: { status: "received" } }),
    db.contactMessage.count({ where: { handled: false } }),
    db.subscriber.count({ where: { active: true } }),
    db.registration.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        training: { select: { title: true } },
        event: { select: { title: true } },
      },
    }),
    db.jobApplication.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { job: { select: { title: true } } },
    }),
    db.consultancyEnquiry.findMany({ orderBy: { createdAt: "desc" }, take: 5 }),
    db.event.findFirst({
      where: { published: true, startsAt: { gte: new Date() } },
      orderBy: { startsAt: "asc" },
    }),
  ]);

  return (
    <>
      <PageHeading
        title="Overview"
        description="Everything needing attention, and what's live on the site."
      />

      {/* ---- Needs attention ------------------------------------------- */}
      <section aria-labelledby="attention">
        <h2 id="attention" className="mb-3 text-sm font-semibold text-[var(--text-secondary)]">
          Needs attention
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatTile
            label="Pending registrations"
            value={pendingRegs}
            href="/admin/registrations"
          />
          <StatTile label="New enquiries" value={newEnquiries} href="/admin/enquiries" />
          <StatTile
            label="New applications"
            value={newApps}
            href="/admin/applications"
          />
          <StatTile
            label="Unread messages"
            value={unreadMessages}
            href="/admin/messages"
          />
        </div>
      </section>

      {/* ---- Published content ----------------------------------------- */}
      <section aria-labelledby="content" className="mt-10">
        <h2 id="content" className="mb-3 text-sm font-semibold text-[var(--text-secondary)]">
          Published content
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <StatTile label="Trainings" value={trainings} href="/admin/trainings" />
          <StatTile label="Events" value={events} href="/admin/events" />
          <StatTile
            label="Consultancy services"
            value={services}
            href="/admin/consultancy"
          />
          <StatTile label="Open roles" value={jobs} href="/admin/careers" />
          <StatTile label="Subscribers" value={subscribers} hint="Newsletter list" />
        </div>
      </section>

      {nextEvent && (
        <Panel className="mt-10 p-5">
          <div className="flex flex-wrap items-center gap-4">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent-on-soft)]">
              <Icon name="calendar" size={20} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs uppercase tracking-wide text-[var(--text-muted)]">
                Next event
              </p>
              <p className="font-medium text-[var(--text-primary)]">
                {nextEvent.title}
              </p>
              <p className="text-sm text-[var(--text-secondary)]">
                {formatDateTime(nextEvent.startsAt)} · {nextEvent.venue}
              </p>
            </div>
            <Link
              href={`/admin/events/${nextEvent.id}`}
              className="text-sm font-medium text-[var(--accent)] hover:underline"
            >
              Edit
            </Link>
          </div>
        </Panel>
      )}

      {/* ---- Recent activity -------------------------------------------- */}
      <section aria-labelledby="recent" className="mt-10">
        <h2 id="recent" className="mb-3 text-sm font-semibold text-[var(--text-secondary)]">
          Recent activity
        </h2>
        <div className="grid gap-5 xl:grid-cols-3">
          <RecentPanel title="Registrations" href="/admin/registrations">
            {recentRegs.length === 0 ? (
              <AdminEmpty message="No registrations yet." />
            ) : (
              <ul className="divide-y divide-[var(--border-subtle)]">
                {recentRegs.map((r) => (
                  <li key={r.id} className="flex items-start gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-[var(--text-primary)]">
                        {r.name}
                      </p>
                      <p className="truncate text-xs text-[var(--text-secondary)]">
                        {r.training?.title ?? r.event?.title ?? "—"}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <Badge
                        tone={
                          r.status === "confirmed"
                            ? "success"
                            : r.status === "cancelled"
                              ? "danger"
                              : "warn"
                        }
                      >
                        {r.status}
                      </Badge>
                      <span className="text-[0.7rem] text-[var(--text-muted)]">
                        {formatDate(r.createdAt)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </RecentPanel>

          <RecentPanel title="Applications" href="/admin/applications">
            {recentApps.length === 0 ? (
              <AdminEmpty message="No applications yet." />
            ) : (
              <ul className="divide-y divide-[var(--border-subtle)]">
                {recentApps.map((a) => (
                  <li key={a.id} className="flex items-start gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-[var(--text-primary)]">
                        {a.name}
                      </p>
                      <p className="truncate text-xs text-[var(--text-secondary)]">
                        {a.job.title}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <Badge tone={a.status === "rejected" ? "danger" : "info"}>
                        {a.status}
                      </Badge>
                      <span className="text-[0.7rem] text-[var(--text-muted)]">
                        {formatDate(a.createdAt)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </RecentPanel>

          <RecentPanel title="Enquiries" href="/admin/enquiries">
            {recentEnquiries.length === 0 ? (
              <AdminEmpty message="No enquiries yet." />
            ) : (
              <ul className="divide-y divide-[var(--border-subtle)]">
                {recentEnquiries.map((e) => (
                  <li key={e.id} className="flex items-start gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-[var(--text-primary)]">
                        {e.company}
                      </p>
                      <p className="truncate text-xs text-[var(--text-secondary)]">
                        {e.name}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <Badge tone={e.status === "won" ? "success" : "neutral"}>
                        {e.status}
                      </Badge>
                      <span className="text-[0.7rem] text-[var(--text-muted)]">
                        {formatDate(e.createdAt)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </RecentPanel>
        </div>
      </section>
    </>
  );
}

function RecentPanel({
  title,
  href,
  children,
}: {
  title: string;
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Panel>
      <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-4 py-3">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">{title}</h3>
        <Link href={href} className="text-xs font-medium text-[var(--accent)] hover:underline">
          See all
        </Link>
      </div>
      {children}
    </Panel>
  );
}
