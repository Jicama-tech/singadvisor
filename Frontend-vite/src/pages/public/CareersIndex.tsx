import { useEffect, useState, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import MarketingShell from "@/components/site/MarketingShell";
import { Badge } from "@/components/ui/Badge";
import { Icon, type IconName } from "@/components/ui/Icon";
import { EmptyState, PageHero, Section, SectionHeader } from "@/components/ui/Section";
import { fetchJobs, type JobDoc } from "@/lib/contentClient";
import { cn, formatDate, formatSalaryRange } from "@/lib/utils";

const VALUES: { icon: IconName; title: string; body: string }[] = [
  {
    icon: "check",
    title: "We measure what changed",
    body: "Satisfaction scores are easy. We hold ourselves to whether behaviour was different six months later, and we design the work around that.",
  },
  {
    icon: "users",
    title: "Small team, real ownership",
    body: "There is no layer between you and the client. You will own a workstream end to end and see the effect of your decisions.",
  },
  {
    icon: "heart",
    title: "We say no to bad-fit work",
    body: "We turn down engagements we do not think will work. It costs us revenue and it is the reason people trust our recommendations.",
  },
  {
    icon: "sparkles",
    title: "Learning is the job",
    body: "Everyone gets an annual development budget and free access to every programme we run. It would be strange if we did not.",
  },
];

type Department = { department: string; count: number };

type CareersData = {
  jobs: JobDoc[];
  departments: Department[];
  total: number;
};

export default function CareersIndex() {
  const [searchParams] = useSearchParams();
  const department = searchParams.get("department");

  const [data, setData] = useState<CareersData | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const all = await fetchJobs();
      if (cancelled) return;

      const published = all.filter((j) => j.published);

      const departments: Department[] = [];
      for (const job of published) {
        const found = departments.find((d) => d.department === job.department);
        if (found) found.count += 1;
        else departments.push({ department: job.department, count: 1 });
      }
      departments.sort((a, b) => a.department.localeCompare(b.department));

      // Ignore an unrecognised department rather than showing an empty board.
      const active = departments.some((d) => d.department === department)
        ? department
        : undefined;

      setData({
        jobs: published
          .filter((j) => !active || j.department === active)
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
        departments,
        total: published.length,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [department]);

  if (!data) {
    return (
      <MarketingShell>
        <div className="container-page py-24">
          <div className="h-6 w-1/3 animate-pulse rounded bg-[var(--surface-sunken)]" />
        </div>
      </MarketingShell>
    );
  }

  const { jobs, departments, total } = data;
  const active = departments.some((d) => d.department === department)
    ? department
    : undefined;

  return (
    <MarketingShell>
      <Helmet>
        <title>Careers — SingAdvisor</title>
        <meta
          name="description"
          content="Open roles at SingAdvisor — facilitators, learning designers, partnerships and operations. Based in Singapore, hybrid and remote options available."
        />
      </Helmet>

      <PageHero
        eyebrow="Careers"
        title="Help us make learning that actually lands"
        description="We're a small team in Singapore with more demand than capacity. If you care about whether the training worked — not just whether it was well received — we should talk."
      />

      {/* ---- Openings ---------------------------------------------------- */}
      <Section id="openings">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <SectionHeader
            eyebrow="Open roles"
            title={`${total} position${total === 1 ? "" : "s"} open`}
            description="Don't see your role? Write to us anyway — we hire when we meet the right person."
          />
        </div>

        {departments.length > 1 && (
          <nav aria-label="Filter by department" className="mt-8 flex flex-wrap gap-2">
            <Chip to="/careers" active={!active}>
              All <span className="opacity-60">{total}</span>
            </Chip>
            {departments.map((d) => (
              <Chip
                key={d.department}
                to={`/careers?department=${encodeURIComponent(d.department)}`}
                active={active === d.department}
              >
                {d.department} <span className="opacity-60">{d.count}</span>
              </Chip>
            ))}
          </nav>
        )}

        {jobs.length === 0 ? (
          <div className="mt-10">
            <EmptyState
              title="No openings in this department"
              description="Nothing here right now — but we're always glad to hear from good people."
              action={
                <Link
                  to="/careers"
                  className="text-sm font-medium text-[var(--accent)] hover:underline"
                >
                  See all roles
                </Link>
              }
            />
          </div>
        ) : (
          <ul className="mt-10 flex flex-col gap-4">
            {jobs.map((job) => {
              const salary = formatSalaryRange(
                job.salaryMin,
                job.salaryMax,
                job.currency,
              );
              const closingSoon =
                job.closesAt &&
                new Date(job.closesAt).getTime() - Date.now() < 14 * 24 * 60 * 60 * 1000;

              return (
                <li key={job._id}>
                  <Link
                    to={`/careers/${job.slug}`}
                    className="group flex flex-col gap-4 rounded-[var(--radius-card)] border border-[var(--border-subtle)] surface-raised p-6 shadow-[var(--shadow-soft)] transition-all hover:-translate-y-0.5 hover:border-[var(--accent)]/40 hover:shadow-[var(--shadow-lift)] md:flex-row md:items-center"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-xl group-hover:text-[var(--accent)]">
                          {job.title}
                        </h3>
                        {closingSoon && (
                          <Badge tone="warn">
                            Closes {formatDate(job.closesAt!)}
                          </Badge>
                        )}
                      </div>
                      <p className="mt-1.5 text-sm leading-relaxed text-[var(--text-secondary)]">
                        {job.summary}
                      </p>
                      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-[var(--text-muted)]">
                        <span className="flex items-center gap-1.5">
                          <Icon name="briefcase" size={14} />
                          {job.department}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Icon name="map-pin" size={14} />
                          {job.location} · {job.workMode}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Icon name="clock" size={14} />
                          {job.employment}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 md:flex-col md:items-end">
                      {salary && (
                        <span className="text-sm font-semibold text-[var(--text-primary)]">
                          {salary}
                          <span className="font-normal text-[var(--text-muted)]">
                            {" "}
                            / yr
                          </span>
                        </span>
                      )}
                      <span className="flex items-center gap-1.5 text-sm font-medium text-[var(--accent)]">
                        View role
                        <Icon
                          name="arrow-right"
                          size={15}
                          className="transition-transform group-hover:translate-x-1"
                        />
                      </span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Section>

      {/* ---- Why us ------------------------------------------------------ */}
      <Section tone="sunken">
        <SectionHeader
          eyebrow="Working here"
          title="What you're signing up for"
          align="center"
        />
        <div className="mt-12 grid gap-6 sm:grid-cols-2">
          {VALUES.map((v) => (
            <div
              key={v.title}
              className="flex gap-4 rounded-[var(--radius-card)] surface-raised p-6 shadow-[var(--shadow-soft)]"
            >
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent-on-soft)]">
                <Icon name={v.icon} size={20} />
              </span>
              <div>
                <h3 className="text-lg">{v.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-[var(--text-secondary)]">
                  {v.body}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Section>
    </MarketingShell>
  );
}

function Chip({
  to,
  active,
  children,
}: {
  to: string;
  active: boolean;
  children: ReactNode;
}) {
  return (
    <Link
      to={to}
      aria-current={active ? "true" : undefined}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-[var(--accent)] text-[var(--accent-foreground)]"
          : "surface-sunken text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
      )}
    >
      {children}
    </Link>
  );
}
