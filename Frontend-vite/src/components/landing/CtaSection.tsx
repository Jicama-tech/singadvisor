import { ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import type { CtaContent, LandingVariant } from "@/lib/landing-client";

export function CtaSection({
  content,
  variant,
}: {
  content: CtaContent;
  variant: LandingVariant;
}) {
  if (variant === "minimal") {
    return (
      <section className="border-t border-[var(--border-subtle)] surface-raised py-16">
        <div className="container-page flex flex-col items-center gap-5 text-center">
          <h2 className="max-w-xl text-2xl text-[var(--text-primary)] md:text-3xl">
            {content.title}
          </h2>
          <p className="max-w-lg text-[var(--text-secondary)]">{content.description}</p>
          <div className="flex flex-wrap justify-center gap-3">
            <ButtonLink to={content.primaryCtaHref}>{content.primaryCtaLabel}</ButtonLink>
            <ButtonLink to={content.secondaryCtaHref} variant="secondary">
              {content.secondaryCtaLabel}
            </ButtonLink>
          </div>
        </div>
      </section>
    );
  }

  if (variant === "bold") {
    return (
      <section className="relative isolate overflow-hidden border-t border-[var(--border-subtle)] bg-[var(--color-ink-950)] py-24">
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-[var(--color-teal-900)]/40 via-transparent to-transparent" />
        <div className="container-page flex flex-col items-center gap-7 text-center">
          <h2 className="max-w-3xl font-[family-name:var(--font-display)] text-4xl text-white md:text-5xl">
            {content.title}
          </h2>
          <p className="max-w-xl text-lg text-white/70">{content.description}</p>
          <div className="flex flex-wrap justify-center gap-4">
            <ButtonLink to={content.primaryCtaHref} size="lg">
              {content.primaryCtaLabel}
              <Icon name="arrow-right" size={18} />
            </ButtonLink>
            <ButtonLink
              to={content.secondaryCtaHref}
              size="lg"
              variant="secondary"
              className="border-white/25 bg-transparent text-white hover:border-white hover:bg-white/10 hover:text-white"
            >
              {content.secondaryCtaLabel}
            </ButtonLink>
          </div>
        </div>
      </section>
    );
  }

  // ---- modern (default) — unchanged from the original design ----
  return (
    <section className="border-t border-[var(--border-subtle)] bg-[var(--color-ink-950)] py-20">
      <div className="container-page flex flex-col items-center gap-6 text-center">
        <h2 className="max-w-2xl text-3xl text-white md:text-4xl">{content.title}</h2>
        <p className="max-w-xl text-white/70">{content.description}</p>
        <div className="flex flex-wrap justify-center gap-3">
          <ButtonLink to={content.primaryCtaHref} size="lg">
            {content.primaryCtaLabel}
          </ButtonLink>
          <ButtonLink
            to={content.secondaryCtaHref}
            size="lg"
            variant="secondary"
            className="border-white/25 bg-transparent text-white hover:border-white hover:bg-white/10 hover:text-white"
          >
            {content.secondaryCtaLabel}
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
