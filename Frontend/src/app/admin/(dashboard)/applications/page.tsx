import Link from "next/link";
import { updateApplicationStatus } from "@/app/admin/actions";
import { AdminEmpty, PageHeading, Panel } from "@/components/admin/AdminUI";
import { StatusSelect } from "@/components/admin/StatusSelect";
import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
import { APPLICATION_STATUSES } from "@/lib/constants";
import { db } from "@/lib/db";
import { withBasePath } from "@/lib/base-path";
import { resumeHref } from "@/lib/uploads";
import { cn, formatDate } from "@/lib/utils";

export const metadata = { title: "Applications" };

export default async function AdminApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ job?: string }>;
}) {
  const { job: jobFilter } = await searchParams;

  const jobs = await db.jobPosting.findMany({
    select: { id: true, title: true, _count: { select: { applications: true } } },
    orderBy: { createdAt: "desc" },
  });

  // Ignore an unknown job id rather than rendering an empty list with no
  // explanation.
  const activeJob = jobs.some((j) => j.id === jobFilter) ? jobFilter : undefined;

  const applications = await db.jobApplication.findMany({
    where: activeJob ? { jobId: activeJob } : {},
    orderBy: { createdAt: "desc" },
    include: { job: { select: { title: true, slug: true } } },
  });

  const total = jobs.reduce((sum, j) => sum + j._count.applications, 0);

  return (
    <>
      <PageHeading
        title="Job applications"
        description={`${applications.length} shown of ${total} total`}
      />

      {jobs.length > 0 && (
        <nav aria-label="Filter by role" className="mb-6 flex flex-wrap gap-2">
          <Chip href="/admin/applications" active={!activeJob}>
            All roles <span className="opacity-60">{total}</span>
          </Chip>
          {jobs
            .filter((j) => j._count.applications > 0)
            .map((j) => (
              <Chip
                key={j.id}
                href={`/admin/applications?job=${j.id}`}
                active={activeJob === j.id}
              >
                {j.title} <span className="opacity-60">{j._count.applications}</span>
              </Chip>
            ))}
        </nav>
      )}

      {applications.length === 0 ? (
        <Panel>
          <AdminEmpty message="No applications yet." />
        </Panel>
      ) : (
        <div className="flex flex-col gap-4">
          {applications.map((a) => (
            <Panel key={a.id} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="text-lg">{a.name}</h2>
                  <p className="text-sm text-[var(--text-secondary)]">
                    <a href={`mailto:${a.email}`} className="text-[var(--accent)] hover:underline">
                      {a.email}
                    </a>{" "}
                    ·{" "}
                    <a href={`tel:${a.phone}`} className="hover:underline">
                      {a.phone}
                    </a>
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-[var(--text-muted)]">
                    {formatDate(a.createdAt)}
                  </span>
                  <StatusSelect
                    id={a.id}
                    value={a.status}
                    options={APPLICATION_STATUSES}
                    action={updateApplicationStatus}
                    label={`Status for ${a.name}`}
                  />
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Badge tone="accent">{a.job.title}</Badge>
                {resumeHref(a.resumePath) && (
                  <a
                    // Served by the admin-only streaming route, not from
                    // public/. withBasePath because this is a raw <a>.
                    href={withBasePath(resumeHref(a.resumePath)!)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-full bg-[var(--surface-sunken)] px-3 py-1 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:text-[var(--accent)]"
                  >
                    <Icon name="upload" size={13} />
                    {a.resumeName ?? "Resume"}
                  </a>
                )}
                {a.linkedin && (
                  <a
                    href={a.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-full bg-[var(--surface-sunken)] px-3 py-1 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:text-[var(--accent)]"
                  >
                    <Icon name="linkedin" size={13} />
                    LinkedIn
                  </a>
                )}
                {a.portfolio && (
                  <a
                    href={a.portfolio}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-full bg-[var(--surface-sunken)] px-3 py-1 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:text-[var(--accent)]"
                  >
                    <Icon name="external" size={13} />
                    Portfolio
                  </a>
                )}
              </div>

              <p className="mt-4 whitespace-pre-wrap rounded-xl surface-sunken p-4 text-sm leading-relaxed text-[var(--text-secondary)]">
                {a.coverLetter}
              </p>
            </Panel>
          ))}
        </div>
      )}
    </>
  );
}

function Chip({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors",
        active
          ? "bg-[var(--accent)] text-[var(--accent-foreground)]"
          : "surface-raised border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
      )}
    >
      {children}
    </Link>
  );
}
