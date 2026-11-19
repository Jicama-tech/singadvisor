import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import MarketingShell from "@/components/site/MarketingShell";
import { AppImage as Image } from "@/components/ui/AppImage";
import { ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { PageHero, Section, SectionHeader } from "@/components/ui/Section";
import {
  fetchTrainingBySlug,
  fetchTrainings,
  type TrainingDoc,
} from "@/lib/contentClient";
import { withBackendUrl } from "@/lib/media-url";
import { ABOUT_DEFAULTS, resolveAbout, splitParagraphs, type AboutContent } from "@/lib/aboutContent";

type Trainer = NonNullable<TrainingDoc["trainers"]>[number];

export default function AboutPage() {
  const [trainers, setTrainers] = useState<Trainer[] | null>(null);
  // Starts on the shipped wording; Settings -> About overrides replace it
  // once /settings/public answers. If that call fails the page is unchanged.
  const [about, setAbout] = useState<AboutContent>(ABOUT_DEFAULTS);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(`${__API_URL__}/settings/public`);
        if (res.ok) {
          const body = (await res.json()) as { about?: Partial<Record<string, string>> };
          if (!cancelled) setAbout(resolveAbout(body.about));
        }
      } catch {
        /* keep the shipped wording */
      }
      const trainings = await fetchTrainings();

      // The Backend has no public trainer-list endpoint, so the team is
      // derived from the facilitators attached to published trainings. A
      // course credits several of them now, so what gets fetched is the
      // smallest set of trainings that between them introduce everyone — one
      // detail fetch per course that adds a new face, not one per course.
      const seen = new Set<string>();
      const unique = trainings.filter((t) => {
        const ids = t.trainerIds ?? [];
        if (ids.every((id) => seen.has(id))) return false;
        ids.forEach((id) => seen.add(id));
        return true;
      });
      const details = await Promise.all(unique.map((t) => fetchTrainingBySlug(t.slug)));

      if (cancelled) return;

      // Those courses still overlap — two of them can share a facilitator
      // without either being redundant — so the people themselves are deduped
      // by id, rather than relying on the course-level pass to have done it.
      const byId = new Map<string, Trainer>();
      for (const detail of details) {
        for (const trainer of detail?.trainers ?? []) byId.set(trainer._id, trainer);
      }
      setTrainers([...byId.values()].sort((a, b) => a.name.localeCompare(b.name)));
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!trainers) {
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
        <title>About — SingAdvisor</title>
        <meta
          name="description"
          content={about.metaDescription}
        />
      </Helmet>

      <PageHero
        eyebrow={about.heroEyebrow}
        title={about.heroTitle}
        description={about.heroDescription}
      />

      {/* ---- Story ------------------------------------------------------- */}
      <Section>
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
          <div className="prose-body">
            <SectionHeader eyebrow={about.storyEyebrow} title={about.storyTitle} />
            <div className="mt-5">
              {splitParagraphs(about.story).map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 self-start">
            <div className="relative aspect-[3/4] overflow-hidden rounded-[var(--radius-card)] shadow-[var(--shadow-lift)]">
              <Image
                src="/Images/Trainingimgae/who1.webp"
                alt="A SingAdvisor facilitator leading a session"
                fill
                sizes="(max-width: 1024px) 50vw, 25vw"
                className="object-cover"
              />
            </div>
            <div className="relative mt-8 aspect-[3/4] overflow-hidden rounded-[var(--radius-card)] shadow-[var(--shadow-lift)]">
              <Image
                src="/Images/Trainingimgae/traing.jpg"
                alt="Participants working through an exercise in small groups"
                fill
                sizes="(max-width: 1024px) 50vw, 25vw"
                className="object-cover"
              />
            </div>
          </div>
        </div>
      </Section>

      {/* ---- Mission & vision --------------------------------------------- */}
      <Section tone="sunken">
        <div className="grid gap-6 md:grid-cols-2">
          {[
            {
              image: "/Images/Trainingimgae/mission.jpg",
              label: about.missionLabel,
              title: about.missionTitle,
              body: about.missionBody,
            },
            {
              image: "/Images/Trainingimgae/vision.jpeg",
              label: about.visionLabel,
              title: about.visionTitle,
              body: about.visionBody,
            },
          ].map((item) => (
            <div
              key={item.label}
              className="overflow-hidden rounded-[var(--radius-card)] surface-raised shadow-[var(--shadow-soft)]"
            >
              <div className="relative aspect-[16/9]">
                <Image
                  src={withBackendUrl(item.image)}
                  alt=""
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-cover"
                />
              </div>
              <div className="p-7">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">
                  {item.label}
                </span>
                <h3 className="mt-2 text-2xl">{item.title}</h3>
                <p className="mt-3 leading-relaxed text-[var(--text-secondary)]">
                  {item.body}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* ---- Principles ---------------------------------------------------- */}
      <Section>
        <SectionHeader
          eyebrow={about.principlesEyebrow}
          title={about.principlesTitle}
          description={about.principlesDescription}
          align="center"
        />
        <div className="mt-12 grid gap-6 md:grid-cols-2">
          {[
            { title: about.principle1Title, body: about.principle1Body },
            { title: about.principle2Title, body: about.principle2Body },
            { title: about.principle3Title, body: about.principle3Body },
            { title: about.principle4Title, body: about.principle4Body },
          ].map((p, i) => (
            <div
              key={p.title}
              className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] p-7"
            >
              <span className="font-[family-name:var(--font-display)] text-3xl font-semibold text-[var(--accent)]/30">
                0{i + 1}
              </span>
              <h3 className="mt-3 text-xl">{p.title}</h3>
              <p className="mt-2 leading-relaxed text-[var(--text-secondary)]">
                {p.body}
              </p>
            </div>
          ))}
        </div>
      </Section>

      {/* ---- Team ---------------------------------------------------------- */}
      {trainers.length > 0 && (
        <Section tone="sunken">
          <SectionHeader
            eyebrow={about.teamEyebrow}
            title={about.teamTitle}
            align="center"
          />
          <div className="mx-auto mt-12 grid max-w-4xl gap-6 sm:grid-cols-2">
            {trainers.map((t) => (
              <div
                key={t._id}
                className="flex flex-col gap-4 rounded-[var(--radius-card)] surface-raised p-7 shadow-[var(--shadow-soft)] sm:flex-row"
              >
                <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full surface-sunken">
                  <Image
                    src={withBackendUrl(t.photo)}
                    alt=""
                    fill
                    sizes="96px"
                    className="object-cover"
                  />
                </div>
                <div>
                  <h3 className="text-lg">{t.name}</h3>
                  <p className="text-sm text-[var(--accent)]">{t.title}</p>
                  <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">
                    {t.bio}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* ---- CTA ----------------------------------------------------------- */}
      <Section>
        <div className="flex flex-col items-center gap-6 rounded-[var(--radius-card)] bg-[var(--color-ink-950)] px-6 py-16 text-center">
          <h2 className="max-w-2xl text-3xl text-white md:text-4xl">
            {about.ctaTitle}
          </h2>
          <p className="max-w-xl text-white/70">
            {about.ctaBody}
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <ButtonLink to="/contact" size="lg">
              Get in touch
              <Icon name="arrow-right" size={18} />
            </ButtonLink>
            <ButtonLink
              to="/careers"
              size="lg"
              variant="secondary"
              className="border-white/25 bg-transparent text-white hover:border-white hover:bg-white/10 hover:text-white"
            >
              See open roles
            </ButtonLink>
          </div>
        </div>
      </Section>
    </MarketingShell>
  );
}
