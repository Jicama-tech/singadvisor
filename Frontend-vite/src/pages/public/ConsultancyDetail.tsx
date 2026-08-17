import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import MarketingShell from "@/components/site/MarketingShell";
import { AppImage as Image } from "@/components/ui/AppImage";
import { EnquiryForm } from "@/components/forms/EnquiryForm";
import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
import { fetchServiceBySlug, fetchServices, type ServiceDoc } from "@/lib/contentClient";

type ConsultancyDetailData = {
  service: ServiceDoc;
  allServices: ServiceDoc[];
  others: ServiceDoc[];
};

export default function ConsultancyDetail() {
  const { slug } = useParams();
  const [data, setData] = useState<ConsultancyDetailData | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!slug) {
        setData(null);
        return;
      }
      const service = await fetchServiceBySlug(slug);
      if (cancelled) return;
      if (!service || !service.published) {
        setData(null);
        return;
      }

      const all = await fetchServices();
      if (cancelled) return;

      const published = all.filter((s) => s.published).sort((a, b) => a.sortOrder - b.sortOrder);
      setData({
        service,
        allServices: published,
        others: published.filter((s) => s._id !== service._id),
      });
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
          <title>Service not found — SingAdvisor</title>
        </Helmet>
        <div className="container-page py-24 text-center">
          <h1 className="text-3xl">Page not found</h1>
          <p className="mt-3 text-[var(--text-secondary)]">
            This service doesn&apos;t exist or is no longer offered.
          </p>
          <Link
            to="/consultancy"
            className="mt-6 inline-block rounded-full bg-[var(--accent)] px-6 py-3 text-sm font-medium text-[var(--accent-foreground)] transition-colors hover:bg-[var(--accent-hover)]"
          >
            Back to consultancy
          </Link>
        </div>
      </MarketingShell>
    );
  }

  const { service, allServices, others } = data;
  // The Backend returns these as real arrays — no JSON parsing needed.
  const deliverables = service.deliverables;
  const idealFor = service.idealFor;

  return (
    <MarketingShell>
      <Helmet>
        <title>{service.title} — SingAdvisor</title>
        <meta name="description" content={service.summary} />
      </Helmet>

      <div className="border-b border-[var(--border-subtle)] surface-sunken">
        <div className="container-page py-10 md:py-14">
          <nav aria-label="Breadcrumb" className="mb-6 text-sm">
            <ol className="flex flex-wrap items-center gap-2 text-[var(--text-muted)]">
              <li>
                <Link to="/consultancy" className="hover:text-[var(--accent)]">
                  Consultancy
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li aria-current="page" className="text-[var(--text-primary)]">
                {service.title}
              </li>
            </ol>
          </nav>

          <div className="grid gap-10 lg:grid-cols-[1.2fr_1fr] lg:items-center">
            <div>
              <Badge tone="accent">{service.engagement}</Badge>
              <h1 className="mt-5 text-4xl md:text-5xl">{service.title}</h1>
              <p className="mt-4 max-w-2xl text-lg leading-relaxed text-[var(--text-secondary)]">
                {service.summary}
              </p>
            </div>
            <div className="relative aspect-[4/3] overflow-hidden rounded-[var(--radius-card)] shadow-[var(--shadow-lift)]">
              <Image
                src={service.image}
                alt=""
                fill
                sizes="(max-width: 1024px) 100vw, 40vw"
                className="object-cover"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="container-page grid gap-12 py-14 lg:grid-cols-[1.5fr_1fr] lg:gap-16">
        <div className="flex flex-col gap-12">
          <section>
            <h2 className="text-2xl">The engagement</h2>
            <div className="prose-body mt-4">
              <p>{service.description}</p>
            </div>
          </section>

          {deliverables.length > 0 && (
            <section>
              <h2 className="text-2xl">What you get</h2>
              <ul className="mt-5 flex flex-col gap-3">
                {deliverables.map((d) => (
                  <li
                    key={d}
                    className="flex items-start gap-3 rounded-xl surface-sunken p-4"
                  >
                    <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[var(--accent)] text-[var(--accent-foreground)]">
                      <Icon name="check" size={14} />
                    </span>
                    <span className="text-sm leading-relaxed text-[var(--text-secondary)]">
                      {d}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {idealFor.length > 0 && (
            <section>
              <h2 className="text-2xl">This is a good fit if…</h2>
              <ul className="mt-5 grid gap-3 sm:grid-cols-2">
                {idealFor.map((i) => (
                  <li
                    key={i}
                    className="rounded-xl border border-[var(--border-subtle)] p-4 text-sm leading-relaxed text-[var(--text-secondary)]"
                  >
                    {i}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {others.length > 0 && (
            <section>
              <h2 className="text-2xl">Other services</h2>
              <ul className="mt-5 flex flex-wrap gap-3">
                {others.map((o) => (
                  <li key={o._id}>
                    <Link
                      to={`/consultancy/${o.slug}`}
                      className="inline-flex items-center gap-2 rounded-full surface-sunken px-4 py-2 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:text-[var(--accent)]"
                    >
                      {o.title}
                      <Icon name="arrow-right" size={14} />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] surface-raised p-6 shadow-[var(--shadow-soft)]">
            <h2 className="text-xl">Enquire about this service</h2>
            <p className="mt-1.5 text-sm text-[var(--text-secondary)]">
              We&apos;ll come back within two working days with next steps.
            </p>
            <div className="mt-6">
              <EnquiryForm
                services={allServices.map((s) => ({ id: s._id, title: s.title }))}
                defaultServiceId={service._id}
              />
            </div>
          </div>
        </aside>
      </div>
    </MarketingShell>
  );
}
