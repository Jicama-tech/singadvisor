import { Link } from "react-router-dom";
import { AppImage as Image } from "@/components/ui/AppImage";
import { ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Section, SectionHeader } from "@/components/ui/Section";
import { withBackendUrl } from "@/lib/media-url";
import type { ConsultancyContent, LandingVariant } from "@/lib/landing-client";

type Service = { id: string; slug: string; title: string; summary: string };

export function ConsultancySection({
  content,
  variant,
  services,
}: {
  content: ConsultancyContent;
  variant: LandingVariant;
  services: Service[];
}) {
  if (variant === "minimal") {
    return (
      <Section>
        <div className="mx-auto max-w-2xl text-center">
          <SectionHeader
            eyebrow={content.eyebrow}
            title={content.title}
            description={content.description}
            align="center"
          />
          <ul className="mt-8 flex flex-col text-left">
            {services.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/consultancy/${s.slug}`}
                  className="group flex items-center justify-between gap-3 border-b border-[var(--border-subtle)] py-3 transition-colors hover:text-[var(--accent)]"
                >
                  <span className="font-medium text-[var(--text-primary)] group-hover:text-[var(--accent)]">
                    {s.title}
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
          <ButtonLink href={content.ctaHref} className="mt-8">
            {content.ctaLabel}
            <Icon name="arrow-right" size={16} />
          </ButtonLink>
        </div>
      </Section>
    );
  }

  if (variant === "bold") {
    return (
      <Section tone="sunken">
        <div className="overflow-hidden rounded-[var(--radius-card)] shadow-[var(--shadow-lift)]">
          <div className="relative aspect-[16/7] w-full">
            <Image
              src={withBackendUrl(content.image)}
              alt="Consultants working through a capability plan with a client team"
              fill
              sizes="100vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-ink-950)] via-[var(--color-ink-950)]/50 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-8 md:p-12">
              <span className="text-xs font-semibold uppercase tracking-wider text-white/70">
                {content.eyebrow}
              </span>
              <h2 className="mt-2 max-w-2xl text-3xl text-white md:text-4xl">{content.title}</h2>
              <p className="mt-3 max-w-xl text-white/80">{content.description}</p>
            </div>
          </div>

          <div className="surface-raised p-8 md:p-12">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {services.map((s) => (
                <Link
                  key={s.id}
                  href={`/consultancy/${s.slug}`}
                  className="group rounded-xl border border-[var(--border-subtle)] p-5 transition-all hover:-translate-y-0.5 hover:border-[var(--accent)]/40 hover:shadow-[var(--shadow-lift)]"
                >
                  <span className="block font-medium text-[var(--text-primary)] group-hover:text-[var(--accent)]">
                    {s.title}
                  </span>
                  <span className="mt-1 block text-sm text-[var(--text-secondary)]">
                    {s.summary}
                  </span>
                </Link>
              ))}
            </div>
            <ButtonLink href={content.ctaHref} className="mt-8">
              {content.ctaLabel}
              <Icon name="arrow-right" size={16} />
            </ButtonLink>
          </div>
        </div>
      </Section>
    );
  }

  // ---- modern (default) — unchanged from the original design ----
  return (
    <Section tone="sunken">
      <div className="grid items-center gap-12 lg:grid-cols-2">
        <div className="relative aspect-[4/3] overflow-hidden rounded-[var(--radius-card)] shadow-[var(--shadow-lift)]">
          <Image
            src={withBackendUrl(content.image)}
            alt="Consultants working through a capability plan with a client team"
            fill
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="object-cover"
          />
        </div>

        <div>
          <SectionHeader
            eyebrow={content.eyebrow}
            title={content.title}
            description={content.description}
          />

          <ul className="mt-8 flex flex-col gap-3">
            {services.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/consultancy/${s.slug}`}
                  className="group flex items-start gap-3 rounded-xl p-3 transition-colors hover:bg-[var(--surface)]"
                >
                  <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent-on-soft)]">
                    <Icon name="check" size={16} />
                  </span>
                  <span>
                    <span className="block font-medium text-[var(--text-primary)] group-hover:text-[var(--accent)]">
                      {s.title}
                    </span>
                    <span className="block text-sm text-[var(--text-secondary)]">{s.summary}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>

          <ButtonLink href={content.ctaHref} className="mt-8">
            {content.ctaLabel}
            <Icon name="arrow-right" size={16} />
          </ButtonLink>
        </div>
      </div>
    </Section>
  );
}
