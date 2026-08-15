import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { Section, SectionHeader } from "@/components/ui/Section";
import type { LandingVariant, ListContent } from "@/lib/landing-client";
import { formatSalaryRange } from "@/lib/utils";

export type JobListItem = {
  slug: string;
  title: string;
  summary: string;
  department: string;
  workMode: string;
  salaryMin: number | null;
  salaryMax: number | null;
  currency: string;
};

export function CareersSection({
  content,
  variant,
  items,
}: {
  content: ListContent;
  variant: LandingVariant;
  items: JobListItem[];
}) {
  const header = (
    <div className="flex flex-wrap items-end justify-between gap-6">
      <SectionHeader eyebrow={content.eyebrow} title={content.title} description={content.description} />
      <ButtonLink href={content.ctaHref} variant="secondary">
        {content.ctaLabel}
        <Icon name="arrow-right" size={16} />
      </ButtonLink>
    </div>
  );

  if (variant === "minimal") {
    return (
      <Section>
        {header}
        <ul className="mt-10 flex flex-col divide-y divide-[var(--border-subtle)]">
          {items.map((job) => (
            <li key={job.slug}>
              <Link
                href={`/careers/${job.slug}`}
                className="group flex flex-wrap items-center justify-between gap-3 py-4 transition-colors hover:text-[var(--accent)]"
              >
                <span className="font-medium text-[var(--text-primary)] group-hover:text-[var(--accent)]">
                  {job.title}
                </span>
                <span className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
                  {job.department}
                  <Icon
                    name="arrow-right"
                    size={15}
                    className="transition-transform group-hover:translate-x-1 group-hover:text-[var(--accent)]"
                  />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Section>
    );
  }

  if (variant === "bold") {
    return (
      <Section>
        {header}
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((job) => {
            const salary = formatSalaryRange(job.salaryMin, job.salaryMax, job.currency);
            return (
              <Link key={job.slug} href={`/careers/${job.slug}`} className="group">
                <Card interactive className="h-full">
                  <CardBody className="gap-3">
                    <Badge tone="accent">{job.department}</Badge>
                    <h3 className="text-lg group-hover:text-[var(--accent)]">{job.title}</h3>
                    <p className="line-clamp-2 text-sm text-[var(--text-secondary)]">{job.summary}</p>
                    <div className="mt-auto flex flex-wrap items-center gap-2 pt-2">
                      <Badge tone="info">{job.workMode}</Badge>
                      {salary && <Badge>{salary}</Badge>}
                    </div>
                  </CardBody>
                </Card>
              </Link>
            );
          })}
        </div>
      </Section>
    );
  }

  // ---- modern (default) — unchanged from the original design ----
  return (
    <Section>
      {header}
      <ul className="mt-12 flex flex-col gap-3">
        {items.map((job) => {
          const salary = formatSalaryRange(job.salaryMin, job.salaryMax, job.currency);
          return (
            <li key={job.slug}>
              <Link
                href={`/careers/${job.slug}`}
                className="group flex flex-wrap items-center gap-4 rounded-[var(--radius-card)] border border-[var(--border-subtle)] surface-raised p-5 transition-all hover:-translate-y-0.5 hover:border-[var(--accent)]/40 hover:shadow-[var(--shadow-lift)]"
              >
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg group-hover:text-[var(--accent)]">{job.title}</h3>
                  <p className="mt-1 line-clamp-1 text-sm text-[var(--text-secondary)]">
                    {job.summary}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge>{job.department}</Badge>
                  <Badge tone="info">{job.workMode}</Badge>
                  {salary && <Badge tone="accent">{salary}</Badge>}
                </div>
                <Icon
                  name="arrow-right"
                  className="shrink-0 text-[var(--text-muted)] transition-transform group-hover:translate-x-1 group-hover:text-[var(--accent)]"
                />
              </Link>
            </li>
          );
        })}
      </ul>
    </Section>
  );
}
