import { useEffect, useState, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import MarketingShell from "@/components/site/MarketingShell";
import { AppImage as Image } from "@/components/ui/AppImage";
import { RegistrationForm } from "@/components/forms/RegistrationForm";
import { TrainingCard } from "@/components/cards/TrainingCard";
import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
import { fetchTrainingBySlug, fetchTrainings, type TrainingDoc } from "@/lib/contentClient";
import { formatDuration, formatPrice } from "@/lib/utils";

type TrainingDetailData = {
  training: TrainingDoc;
  related: TrainingDoc[];
};

export default function TrainingDetail() {
  const { slug } = useParams();
  const [data, setData] = useState<TrainingDetailData | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!slug) {
        setData(null);
        return;
      }
      const training = await fetchTrainingBySlug(slug);
      if (cancelled) return;
      if (!training || !training.published) {
        setData(null);
        return;
      }

      const all = await fetchTrainings();
      if (cancelled) return;

      const related = all
        .filter(
          (t) => t.published && t.category === training.category && t._id !== training._id,
        )
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .slice(0, 3);

      setData({ training, related });
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
          <title>Training not found — SingAdvisor</title>
        </Helmet>
        <div className="container-page py-24 text-center">
          <h1 className="text-3xl">Page not found</h1>
          <p className="mt-3 text-[var(--text-secondary)]">
            This programme doesn&apos;t exist or is no longer listed.
          </p>
          <Link
            to="/trainings"
            className="mt-6 inline-block rounded-full bg-[var(--accent)] px-6 py-3 text-sm font-medium text-[var(--accent-foreground)] transition-colors hover:bg-[var(--accent-hover)]"
          >
            Back to trainings
          </Link>
        </div>
      </MarketingShell>
    );
  }

  const { training, related } = data;
  // The Backend returns these as real arrays — no JSON parsing needed.
  const outcomes = training.outcomes;
  const modules = training.modules;

  return (
    <MarketingShell>
      <Helmet>
        <title>{training.title} — SingAdvisor</title>
        <meta name="description" content={training.summary} />
      </Helmet>

      {/* ---- Header --------------------------------------------------- */}
      <div className="border-b border-[var(--border-subtle)] surface-sunken">
        <div className="container-page py-10 md:py-14">
          <nav aria-label="Breadcrumb" className="mb-6 text-sm">
            <ol className="flex flex-wrap items-center gap-2 text-[var(--text-muted)]">
              <li>
                <Link to="/" className="hover:text-[var(--accent)]">
                  Home
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li>
                <Link to="/trainings" className="hover:text-[var(--accent)]">
                  Trainings
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li aria-current="page" className="text-[var(--text-primary)]">
                {training.title}
              </li>
            </ol>
          </nav>

          <div className="grid gap-10 lg:grid-cols-[1.2fr_1fr] lg:items-center">
            <div>
              <div className="flex flex-wrap gap-2">
                <Badge tone="accent">{training.category}</Badge>
                <Badge>{training.level}</Badge>
                <Badge tone="info">{training.format}</Badge>
              </div>

              <h1 className="mt-5 text-4xl md:text-5xl">{training.title}</h1>
              <p className="mt-4 max-w-2xl text-lg leading-relaxed text-[var(--text-secondary)]">
                {training.summary}
              </p>

              <dl className="mt-8 flex flex-wrap gap-x-10 gap-y-4">
                <Fact icon="clock" label="Duration">
                  {formatDuration(training.durationHrs)}
                </Fact>
                <Fact icon="map-pin" label="Format">
                  {training.format}
                </Fact>
                <Fact icon="sparkles" label="Investment">
                  {formatPrice(training.priceCents, training.currency)}
                </Fact>
              </dl>
            </div>

            <div className="relative aspect-[4/3] overflow-hidden rounded-[var(--radius-card)] shadow-[var(--shadow-lift)]">
              <Image
                src={training.image}
                alt=""
                fill
                sizes="(max-width: 1024px) 100vw, 40vw"
                className="object-cover"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ---- Body ----------------------------------------------------- */}
      <div className="container-page grid gap-12 py-14 lg:grid-cols-[1.5fr_1fr] lg:gap-16">
        <div className="flex flex-col gap-12">
          <section>
            <h2 className="text-2xl">About this programme</h2>
            <div className="prose-body mt-4">
              <p>{training.description}</p>
            </div>
          </section>

          {outcomes.length > 0 && (
            <section>
              <h2 className="text-2xl">What you&apos;ll walk away with</h2>
              <ul className="mt-5 grid gap-3 sm:grid-cols-2">
                {outcomes.map((o) => (
                  <li
                    key={o}
                    className="flex items-start gap-3 rounded-xl surface-sunken p-4"
                  >
                    <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[var(--accent)] text-[var(--accent-foreground)]">
                      <Icon name="check" size={14} />
                    </span>
                    <span className="text-sm leading-relaxed text-[var(--text-secondary)]">
                      {o}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {modules.length > 0 && (
            <section>
              <h2 className="text-2xl">Session outline</h2>
              <ol className="mt-5 flex flex-col">
                {modules.map((m, i) => (
                  <li
                    key={m}
                    className="flex gap-4 border-l-2 border-[var(--border-strong)] pb-6 pl-6 last:pb-0 relative"
                  >
                    <span className="absolute -left-[13px] top-0 grid h-6 w-6 place-items-center rounded-full bg-[var(--accent)] text-xs font-semibold text-[var(--accent-foreground)]">
                      {i + 1}
                    </span>
                    <span className="text-[var(--text-primary)]">{m}</span>
                  </li>
                ))}
              </ol>
            </section>
          )}

          {training.trainer && (
            <section>
              <h2 className="text-2xl">Your facilitator</h2>
              <div className="mt-5 flex flex-col gap-5 rounded-[var(--radius-card)] border border-[var(--border-subtle)] p-6 sm:flex-row">
                <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full surface-sunken">
                  <Image
                    src={training.trainer.photo}
                    alt=""
                    fill
                    sizes="96px"
                    className="object-cover"
                  />
                </div>
                <div>
                  <h3 className="text-lg">{training.trainer.name}</h3>
                  <p className="text-sm text-[var(--accent)]">
                    {training.trainer.title}
                  </p>
                  <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">
                    {training.trainer.bio}
                  </p>
                </div>
              </div>
            </section>
          )}
        </div>

        {/* ---- Enrolment ---------------------------------------------- */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div
            id="enrol"
            className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] surface-raised p-6 shadow-[var(--shadow-soft)]"
          >
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-xl">Enrol</h2>
              <span className="font-[family-name:var(--font-display)] text-2xl font-semibold text-[var(--accent)]">
                {formatPrice(training.priceCents, training.currency)}
              </span>
            </div>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              Register your interest and we&apos;ll confirm the next available
              date that suits you.
            </p>
            <div className="mt-6">
              <RegistrationForm
                kind="training"
                id={training._id}
                title={training.title}
              />
            </div>
          </div>
        </aside>
      </div>

      {related.length > 0 && (
        <div className="border-t border-[var(--border-subtle)] surface-sunken py-16">
          <div className="container-page">
            <h2 className="text-2xl">More for {training.category.toLowerCase()} audiences</h2>
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((t) => (
                <TrainingCard key={t._id} training={t} />
              ))}
            </div>
          </div>
        </div>
      )}
    </MarketingShell>
  );
}

function Fact({
  icon,
  label,
  children,
}: {
  icon: "clock" | "map-pin" | "sparkles";
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent-on-soft)]">
        <Icon name={icon} size={18} />
      </span>
      <div>
        <dt className="text-xs uppercase tracking-wide text-[var(--text-muted)]">
          {label}
        </dt>
        <dd className="font-medium text-[var(--text-primary)]">{children}</dd>
      </div>
    </div>
  );
}
