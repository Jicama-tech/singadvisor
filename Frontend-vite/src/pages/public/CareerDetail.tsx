import { useEffect, useState, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import MarketingShell from "@/components/site/MarketingShell";
import { ApplicationForm } from "@/components/forms/ApplicationForm";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { fetchJobBySlug, fetchJobs, type JobDoc } from "@/lib/contentClient";
import { formatDate, formatSalaryRange } from "@/lib/utils";

type CareerDetailData = {
  job: JobDoc;
  otherJobs: JobDoc[];
};

export default function CareerDetail() {
  const { slug } = useParams();
  const [data, setData] = useState<CareerDetailData | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!slug) {
        setData(null);
        return;
      }
      const job = await fetchJobBySlug(slug);
      if (cancelled) return;
      if (!job || !job.published) {
        setData(null);
        return;
      }

      const all = await fetchJobs();
      if (cancelled) return;

      const otherJobs = all
        .filter((j) => j.published && j._id !== job._id)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 4);

      setData({ job, otherJobs });
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (!data) {
    if (data === undefined) {
      return (
        <MarketingShell>
          <div className="container-page py-24">
            <div className="h-6 w-1/3 animate-pulse rounded bg-[var(--surface-sunken)]" />
          </div>
        </MarketingShell>
      );
    }
    return (
      <MarketingShell>
        <Helmet>
          <title>Role not found — SingAdvisor</title>
        </Helmet>
        <div className="container-page py-24 text-center">
          <h1 className="text-3xl">Page not found</h1>
          <p className="mt-3 text-[var(--text-secondary)]">
            This role doesn&apos;t exist or is no longer open.
          </p>
          <Link
            to="/careers"
            className="mt-6 inline-block rounded-full bg-[var(--accent)] px-6 py-3 text-sm font-medium text-[var(--accent-foreground)] transition-colors hover:bg-[var(--accent-hover)]"
          >
            Back to careers
          </Link>
        </div>
      </MarketingShell>
    );
  }

  const { job, otherJobs } = data;
  // The Backend returns these as real arrays — no JSON parsing needed.
  const requirements = job.requirements;
  const benefits = job.benefits;
  const salary = formatSalaryRange(job.salaryMin, job.salaryMax, job.currency);
  const closed = !!job.closesAt && new Date(job.closesAt) < new Date();

  // Google for Jobs picks this up, which is where most candidates actually
  // find postings. `createdAt`/`closesAt` are already ISO strings.
  const jobLd = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: job.title,
    description: job.description,
    datePosted: job.createdAt,
    ...(job.closesAt ? { validThrough: job.closesAt } : {}),
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
    <MarketingShell>
      <Helmet>
        <title>{job.title} — SingAdvisor</title>
        <meta name="description" content={job.summary} />
      </Helmet>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jobLd) }}
      />

      <div className="border-b border-[var(--border-subtle)] surface-sunken">
        <div className="container-page py-10 md:py-14">
          <nav aria-label="Breadcrumb" className="mb-6 text-sm">
            <ol className="flex flex-wrap items-center gap-2 text-[var(--text-muted)]">
              <li>
                <Link to="/careers" className="hover:text-[var(--accent)]">
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

          {/* A same-page anchor, so a plain <a> (native hash scroll) rather
              than a router Link, which would resolve "#apply" against the
              root route. */}
          {!closed && (
            <a
              href="#apply"
              className="mt-8 inline-flex items-center justify-center gap-2 rounded-full font-medium transition-all duration-200 whitespace-nowrap bg-[var(--accent)] text-[var(--accent-foreground)] shadow-[var(--shadow-soft)] hover:bg-[var(--accent-hover)] hover:shadow-[var(--shadow-lift)] active:scale-[0.98] h-13 px-8 text-base"
            >
              Apply for this role
              <Icon name="arrow-right" size={18} />
            </a>
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
                <ButtonLink to="/careers" variant="secondary">
                  See open roles
                </ButtonLink>
              </div>
            ) : (
              <div className="mt-5 rounded-[var(--radius-card)] border border-[var(--border-subtle)] surface-raised p-6 shadow-[var(--shadow-soft)] md:p-8">
                <ApplicationForm jobId={job._id} jobTitle={job.title} />
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
                    <li key={o._id}>
                      <Link
                        to={`/careers/${o.slug}`}
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
    </MarketingShell>
  );
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-[var(--text-muted)]">
        {label}
      </dt>
      <dd className="mt-1 font-medium text-[var(--text-primary)]">{children}</dd>
    </div>
  );
}
