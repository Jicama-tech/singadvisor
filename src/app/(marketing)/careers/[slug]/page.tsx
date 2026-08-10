import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ApplicationForm } from "@/components/forms/ApplicationForm";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { db } from "@/lib/db";
import { formatDate, formatSalaryRange, parseList } from "@/lib/utils";

export const revalidate = 60;

type Params = Promise<{ slug: string }>;

export async function generateStaticParams() {
  const jobs = await db.jobPosting.findMany({
    where: { published: true },
    select: { slug: true },
  });
  return jobs.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug } = await params;
  const job = await db.jobPosting.findUnique({
    where: { slug },
    select: { title: true, summary: true, department: true, location: true },
  });
  if (!job) return { title: "Role not found" };
  return {
    title: `${job.title} — ${job.location}`,
    description: job.summary,
  };
}

export default async function JobDetailPage({ params }: { params: Params }) {
  const { slug } = await params;

  const job = await db.jobPosting.findUnique({ where: { slug } });
  if (!job || !job.published) notFound();

  const requirements = parseList(job.requirements);
  const benefits = parseList(job.benefits);
  const salary = formatSalaryRange(job.salaryMin, job.salaryMax, job.currency);
  const closed = !!job.closesAt && job.closesAt < new Date();

  const otherJobs = await db.jobPosting.findMany({
    where: { published: true, id: { not: job.id } },
    select: { id: true, title: true, slug: true, department: true },
    take: 4,
  });

  // Google for Jobs picks this up, which is where most candidates actually
  // find postings.
  const jobLd = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: job.title,
    description: job.description,
    datePosted: job.createdAt.toISOString(),
    ...(job.closesAt ? { validThrough: job.closesAt.toISOString() } : {}),
    employmentType: job.employment.toUpperCase().replace("-", "_"),
    hiringOrganization: {
      "@type": "Organization",
      name: "SingAdvisor",
    },
    jobLocation: {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        addressLocality: job.location,
        addressCountry: "SG",
      },
    },
    ...(job.salaryMin && job.salaryMax
      ? {
          baseSalary: {
            "@type": "MonetaryAmount",
            currency: job.currency,
            value: {
              "@type": "QuantitativeValue",
              minValue: job.salaryMin,
              maxValue: job.salaryMax,
              unitText: "YEAR",
            },
          },
        }
      : {}),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jobLd) }}
      />

      <div className="border-b border-[var(--border-subtle)] surface-sunken">
        <div className="container-page py-10 md:py-14">
          <nav aria-label="Breadcrumb" className="mb-6 text-sm">
            <ol className="flex flex-wrap items-center gap-2 text-[var(--text-muted)]">
              <li>
                <Link href="/careers" className="hover:text-[var(--accent)]">
                  Careers
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li aria-current="page" className="text-[var(--text-primary)]">
                {job.title}
              </li>
            </ol>
          </nav>

          <div className="flex flex-wrap gap-2">
            <Badge tone="accent">{job.department}</Badge>
            <Badge>{job.employment}</Badge>
            <Badge tone="info">{job.workMode}</Badge>
            {closed && <Badge tone="danger">Applications closed</Badge>}
          </div>

          <h1 className="mt-5 max-w-3xl text-4xl md:text-5xl">{job.title}</h1>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-[var(--text-secondary)]">
            {job.summary}
          </p>

          <dl className="mt-8 flex flex-wrap gap-x-10 gap-y-4">
            <Fact label="Location">
              {job.location} · {job.workMode}
            </Fact>
            <Fact label="Experience">{job.experience}</Fact>
            {salary && <Fact label="Salary">{salary} / year</Fact>}
            {job.closesAt && (
              <Fact label={closed ? "Closed" : "Closes"}>
                {formatDate(job.closesAt)}
              </Fact>
            )}
          </dl>

          {!closed && (
            <ButtonLink href="#apply" size="lg" className="mt-8">
              Apply for this role
              <Icon name="arrow-right" size={18} />
            </ButtonLink>
          )}
        </div>
      </div>

      <div className="container-page grid gap-12 py-14 lg:grid-cols-[1.5fr_1fr] lg:gap-16">
        <div className="flex flex-col gap-12">
          <section>
            <h2 className="text-2xl">About the role</h2>
            <div className="prose-body mt-4">
              <p>{job.description}</p>
            </div>
          </section>

          {requirements.length > 0 && (
            <section>
              <h2 className="text-2xl">What we&apos;re looking for</h2>
              <ul className="mt-5 flex flex-col gap-3">
                {requirements.map((r) => (
                  <li key={r} className="flex items-start gap-3">
                    <span className="mt-1 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[var(--accent-soft)] text-[var(--accent-on-soft)]">
                      <Icon name="check" size={12} />
                    </span>
                    <span className="text-[var(--text-secondary)]">{r}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-5 rounded-xl surface-sunken p-4 text-sm text-[var(--text-secondary)]">
                Meet most of these but not all? Apply anyway. We would rather
                read your application than have you rule yourself out.
              </p>
            </section>
          )}

          {benefits.length > 0 && (
            <section>
              <h2 className="text-2xl">What we offer</h2>
              <ul className="mt-5 grid gap-3 sm:grid-cols-2">
                {benefits.map((b) => (
                  <li
                    key={b}
                    className="flex items-start gap-3 rounded-xl surface-sunken p-4 text-sm leading-relaxed text-[var(--text-secondary)]"
                  >
                    <Icon
                      name="sparkles"
                      size={16}
                      className="mt-0.5 shrink-0 text-[var(--accent)]"
                    />
                    {b}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* ---- Application ------------------------------------------ */}
          <section id="apply" className="scroll-mt-24">
            <h2 className="text-2xl">Apply</h2>
            {closed ? (
              <div className="mt-5 flex flex-col items-start gap-4 rounded-[var(--radius-card)] surface-sunken p-6">
                <p className="text-[var(--text-secondary)]">
                  Applications for this role closed on{" "}
                  {formatDate(job.closesAt!)}.
                </p>
                <ButtonLink href="/careers" variant="secondary">
                  See open roles
                </ButtonLink>
              </div>
            ) : (
              <div className="mt-5 rounded-[var(--radius-card)] border border-[var(--border-subtle)] surface-raised p-6 shadow-[var(--shadow-soft)] md:p-8">
                <ApplicationForm jobId={job.id} jobTitle={job.title} />
              </div>
            )}
          </section>
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="flex flex-col gap-6">
            <div className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] surface-raised p-6 shadow-[var(--shadow-soft)]">
              <h2 className="text-lg">How hiring works here</h2>
              <ol className="mt-4 flex flex-col gap-4">
                {[
                  ["Application review", "Within one week, always with a reply."],
                  ["Intro call", "30 minutes with the hiring manager."],
                  ["Working session", "A real task, paid if it takes over two hours."],
                  ["Team conversation", "Meet the people you'd work with."],
                  ["Offer", "Usually within three weeks end to end."],
                ].map(([title, body], i) => (
                  <li key={title} className="flex gap-3">
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[var(--accent-soft)] text-xs font-semibold text-[var(--accent-on-soft)]">
                      {i + 1}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-[var(--text-primary)]">
                        {title}
                      </p>
                      <p className="text-xs text-[var(--text-secondary)]">{body}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            {otherJobs.length > 0 && (
              <div className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] p-6">
                <h2 className="text-lg">Other openings</h2>
                <ul className="mt-4 flex flex-col gap-3">
                  {otherJobs.map((o) => (
                    <li key={o.id}>
                      <Link
                        href={`/careers/${o.slug}`}
                        className="group flex items-center justify-between gap-3 text-sm"
                      >
                        <span>
                          <span className="block font-medium text-[var(--text-primary)] group-hover:text-[var(--accent)]">
                            {o.title}
                          </span>
                          <span className="block text-xs text-[var(--text-muted)]">
                            {o.department}
                          </span>
                        </span>
                        <Icon
                          name="arrow-right"
                          size={15}
                          className="shrink-0 text-[var(--text-muted)] transition-transform group-hover:translate-x-1 group-hover:text-[var(--accent)]"
                        />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </aside>
      </div>
    </>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-[var(--text-muted)]">
        {label}
      </dt>
      <dd className="mt-1 font-medium text-[var(--text-primary)]">{children}</dd>
    </div>
  );
}
