import type { Metadata } from "next";
import { AppImage as Image } from "@/components/ui/AppImage";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EnquiryForm } from "@/components/forms/EnquiryForm";
import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
import { db } from "@/lib/db";
import { parseList } from "@/lib/utils";

export const revalidate = 60;

type Params = Promise<{ slug: string }>;

export async function generateStaticParams() {
  const services = await db.consultancyService.findMany({
    where: { published: true },
    select: { slug: true },
  });
  return services.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug } = await params;
  const service = await db.consultancyService.findUnique({
    where: { slug },
    select: { title: true, summary: true, image: true },
  });
  if (!service) return { title: "Service not found" };
  return {
    title: service.title,
    description: service.summary,
    openGraph: {
      title: service.title,
      description: service.summary,
      images: [service.image],
    },
  };
}

export default async function ConsultancyDetailPage({
  params,
}: {
  params: Params;
}) {
  const { slug } = await params;

  const service = await db.consultancyService.findUnique({ where: { slug } });
  if (!service || !service.published) notFound();

  const deliverables = parseList(service.deliverables);
  const idealFor = parseList(service.idealFor);

  const allServices = await db.consultancyService.findMany({
    where: { published: true },
    select: { id: true, title: true, slug: true },
    orderBy: { sortOrder: "asc" },
  });
  const others = allServices.filter((s) => s.id !== service.id);

  return (
    <>
      <div className="border-b border-[var(--border-subtle)] surface-sunken">
        <div className="container-page py-10 md:py-14">
          <nav aria-label="Breadcrumb" className="mb-6 text-sm">
            <ol className="flex flex-wrap items-center gap-2 text-[var(--text-muted)]">
              <li>
                <Link href="/consultancy" className="hover:text-[var(--accent)]">
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
                priority
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
                  <li key={o.id}>
                    <Link
                      href={`/consultancy/${o.slug}`}
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
              <EnquiryForm services={allServices} defaultServiceId={service.id} />
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}
