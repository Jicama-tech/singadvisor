import { ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { withBasePath } from "@/lib/base-path";
import { withBackendUrl } from "@/lib/media-url";
import type { HeroContent, LandingVariant } from "@/lib/landing-client";

export function HeroSection({
  content,
  variant,
  trainingCount,
}: {
  content: HeroContent;
  variant: LandingVariant;
  trainingCount: number;
}) {
  const primaryLabel = content.primaryCtaLabel.replace("{count}", String(trainingCount));

  if (variant === "minimal") {
    return (
      <section className="border-b border-[var(--border-subtle)] surface-raised">
        <div className="container-page flex flex-col items-center gap-6 pb-20 pt-10 text-center md:pb-28 md:pt-14">
          <span className="inline-flex items-center gap-2 rounded-full bg-[var(--accent-soft)] px-4 py-1.5 text-xs font-medium text-[var(--accent-on-soft)]">
            <Icon name="map-pin" size={14} />
            {content.eyebrow}
          </span>

          <h1 className="max-w-3xl text-4xl leading-[1.12] text-[var(--text-primary)] md:text-5xl">
            {content.title} <span className="text-[var(--accent)]">{content.titleAccent}</span>
          </h1>

          <p className="max-w-xl text-lg leading-relaxed text-[var(--text-secondary)]">
            {content.description}
          </p>

          <div className="mt-2 flex flex-wrap justify-center gap-3">
            <ButtonLink to={content.primaryCtaHref} size="lg">
              {primaryLabel}
              <Icon name="arrow-right" size={18} />
            </ButtonLink>
            <ButtonLink to={content.secondaryCtaHref} size="lg" variant="secondary">
              {content.secondaryCtaLabel}
            </ButtonLink>
          </div>
        </div>
      </section>
    );
  }

  if (variant === "bold") {
    return (
      <section className="relative isolate overflow-hidden bg-[var(--color-ink-950)]">
        <div className="absolute inset-0 -z-10 opacity-50">
          <video
            autoPlay
            muted
            loop
            playsInline
            poster={withBasePath(withBackendUrl(content.posterSrc))}
            className="h-full w-full object-cover"
          >
            <source src={withBasePath(withBackendUrl(content.videoSrc))} type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-ink-950)] via-[var(--color-ink-950)]/70 to-[var(--color-ink-950)]/30" />
        </div>

        <div className="container-page relative pb-28 pt-14 md:pb-40 md:pt-20">
          <div className="grid gap-10 lg:grid-cols-[1.3fr_1fr] lg:items-center">
            <div className="animate-[var(--animate-fade-up)]">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-xs font-medium text-white ring-1 ring-inset ring-white/20 backdrop-blur">
                <Icon name="map-pin" size={14} />
                {content.eyebrow}
              </span>

              <h1 className="mt-6 text-5xl leading-[0.98] text-white md:text-7xl lg:text-8xl">
                {content.title}
                <span className="block text-[var(--color-teal-300)]">{content.titleAccent}</span>
              </h1>

              <p className="mt-8 max-w-xl text-xl leading-relaxed text-white/80">
                {content.description}
              </p>

              <div className="mt-10 flex flex-wrap gap-4">
                <ButtonLink to={content.primaryCtaHref} size="lg">
                  {primaryLabel}
                  <Icon name="arrow-right" size={18} />
                </ButtonLink>
                <ButtonLink
                  to={content.secondaryCtaHref}
                  size="lg"
                  variant="secondary"
                  className="border-white/25 bg-white/10 text-white backdrop-blur hover:border-white hover:bg-white/20 hover:text-white"
                >
                  {content.secondaryCtaLabel}
                </ButtonLink>
              </div>
            </div>

            <div className="rounded-[var(--radius-card)] border border-white/15 bg-white/10 p-7 backdrop-blur-lg shadow-[var(--shadow-lift)]">
              <p className="font-[family-name:var(--font-display)] text-5xl font-semibold text-white">
                {trainingCount}+
              </p>
              <p className="mt-2 text-sm text-white/70">
                Live programmes ready to book this month
              </p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  // ---- modern (default) — unchanged from the original design ----
  return (
    <section className="relative isolate overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <video
          autoPlay
          muted
          loop
          playsInline
          poster={withBasePath(withBackendUrl(content.posterSrc))}
          className="h-full w-full object-cover"
        >
          {/* Raw <source> is not touched by basePath — prefix it ourselves. */}
          <source src={withBasePath(withBackendUrl(content.videoSrc))} type="video/mp4" />
        </video>
        {/* Two-stop scrim keeps text at AA contrast over any video frame. */}
        <div className="absolute inset-0 bg-gradient-to-r from-[var(--color-ink-950)] via-[var(--color-ink-950)]/85 to-[var(--color-ink-950)]/40" />
      </div>

      <div className="container-page relative pb-24 pt-10 md:pb-36 md:pt-14">
        <div className="max-w-2xl animate-[var(--animate-fade-up)]">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-xs font-medium text-white ring-1 ring-inset ring-white/20 backdrop-blur">
            <Icon name="map-pin" size={14} />
            {content.eyebrow}
          </span>

          <h1 className="mt-6 text-4xl leading-[1.08] text-white md:text-6xl lg:text-7xl">
            {content.title}
            <span className="block text-[var(--color-teal-300)]">{content.titleAccent}</span>
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/80">
            {content.description}
          </p>

          <div className="mt-9 flex flex-wrap gap-3">
            <ButtonLink to={content.primaryCtaHref} size="lg">
              {primaryLabel}
              <Icon name="arrow-right" size={18} />
            </ButtonLink>
            <ButtonLink
              to={content.secondaryCtaHref}
              size="lg"
              variant="secondary"
              className="border-white/25 bg-white/10 text-white backdrop-blur hover:border-white hover:bg-white/20 hover:text-white"
            >
              {content.secondaryCtaLabel}
            </ButtonLink>
          </div>
        </div>
      </div>
    </section>
  );
}
