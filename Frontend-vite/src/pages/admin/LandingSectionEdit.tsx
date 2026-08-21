import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import LandingShell from "@/components/admin/LandingShell";
import { PageHeading, AdminEmpty } from "@/components/admin/AdminUI";
import { ConsultancySectionForm } from "@/components/admin/landing/ConsultancySectionForm";
import { CtaSectionForm } from "@/components/admin/landing/CtaSectionForm";
import { HeroSectionForm } from "@/components/admin/landing/HeroSectionForm";
import { ListSectionForm } from "@/components/admin/landing/ListSectionForm";
import { PillarsSectionForm } from "@/components/admin/landing/PillarsSectionForm";
import { StatsSectionForm } from "@/components/admin/landing/StatsSectionForm";
import {
  fetchLandingSectionAdmin,
  type LandingSectionAdminRow,
} from "@/lib/landing-admin-client";
import {
  LANDING_SECTION_KEYS,
  type ConsultancyContent,
  type CtaContent,
  type HeroContent,
  type LandingSectionKey,
  type ListContent,
  type PillarsContent,
  type StatsContent,
} from "@/lib/landing-client";
import { fetchPublishedEvents, toEventCardData } from "@/lib/events-client";
import { fetchJobs, fetchPosts, fetchServices, fetchTrainings } from "@/lib/contentClient";
import type { EventCardData } from "@/components/cards/EventCard";
import type { PostCardData } from "@/components/cards/PostCard";
import type { TrainingCardData } from "@/components/cards/TrainingCard";
import type { JobListItem } from "@/components/landing/CareersSection";
import {
  saveBlogListSection,
  saveCareersListSection,
  saveConsultancySection,
  saveCtaSection,
  saveEventsListSection,
  saveHeroSection,
  savePillarsSection,
  saveStatsSection,
  saveTrainingsListSection,
} from "@/adminActions";
import type { FormState } from "@/lib/form-state";

const SECTION_LABELS: Record<LandingSectionKey, string> = {
  hero: "Hero",
  stats: "Stats bar",
  pillars: "Four pillars",
  trainings: "Featured trainings",
  events: "Upcoming events",
  consultancy: "Consultancy",
  careers: "Careers",
  blog: "From the blog",
  cta: "Closing call-to-action",
};

// The preview always fetches up to this many real items and lets the "Items
// to show" field slice down live, client-side — so that field's preview
// stays reactive without needing another server round trip.
const PREVIEW_SAMPLE_SIZE = 12;

function isLandingSectionKey(value: string | undefined): value is LandingSectionKey {
  return !!value && (LANDING_SECTION_KEYS as readonly string[]).includes(value);
}

export default function LandingSectionEdit() {
  const { user } = useAuth();
  const { key } = useParams();
  const navigate = useNavigate();
  const [section, setSection] = useState<LandingSectionAdminRow | null>(null);
  // Which tab's row `section` actually belongs to. React renders the new
  // key BEFORE effects run, so on a client-side tab switch `section` still
  // holds the previous tab's row for one frame — rendering that frame would
  // feed the wrong tab's content into the new form and crash it. Gating on
  // this key makes the mismatch render as blank-while-loading instead.
  const [sectionKey, setSectionKey] = useState<string | null>(null);
  const [items, setItems] = useState<{
    trainings: TrainingCardData[];
    events: EventCardData[];
    careers: JobListItem[];
    blog: PostCardData[];
    services: { id: string; slug: string; title: string; summary: string }[];
    trainingCount: number;
  }>({ trainings: [], events: [], careers: [], blog: [], services: [], trainingCount: 0 });

  useEffect(() => {
    if (!isLandingSectionKey(key)) return;
    // Reset the loaded section whenever the tab changes — without this, a
    // client-side tab switch renders the NEW tab's form against the
    // PREVIOUS tab's content (e.g. StatsSectionForm mapping over the hero's
    // content), which crashes the whole shell. A brief blank-while-loading
    // matches the fresh-page-load behavior.
    setSection(null);
    let cancelled = false;
    void (async () => {
      try {
        const [sec, trainings, services, jobs, posts, events] = await Promise.all([
          fetchLandingSectionAdmin(key),
          fetchTrainings(),
          fetchServices(),
          fetchJobs(),
          fetchPosts(),
          fetchPublishedEvents(),
        ]);
        if (cancelled) return;
        setSection(sec);
        setSectionKey(key);
        setItems({
          trainings: trainings
            .filter((t) => t.featured)
            .slice(0, PREVIEW_SAMPLE_SIZE)
            .map((t) => ({
              slug: t.slug,
              title: t.title,
              summary: t.summary,
              image: t.image,
              category: t.category,
              durationHrs: t.durationHrs,
              format: t.format,
              priceCents: t.priceCents,
              currency: t.currency,
            })),
          events: events.slice(0, PREVIEW_SAMPLE_SIZE).map(toEventCardData),
          careers: jobs.slice(0, PREVIEW_SAMPLE_SIZE).map((j) => ({
            slug: j.slug,
            title: j.title,
            summary: j.summary,
            department: j.department,
            workMode: j.workMode,
            salaryMin: j.salaryMin,
            salaryMax: j.salaryMax,
            currency: j.currency,
          })),
          blog: posts
            .filter((p) => p.published)
            .slice(0, PREVIEW_SAMPLE_SIZE)
            .map((p) => ({
              slug: p.slug,
              title: p.title,
              excerpt: p.excerpt,
              coverImage: p.coverImage,
              category: p.category,
              content: p.content,
              publishedAt: p.publishedAt ? new Date(p.publishedAt) : null,
              author: p.author
                ? { name: p.author.name, photo: p.author.photo }
                : null,
              writtenByName: p.writtenByName || undefined,
            })),
          services: services.slice(0, 4).map((s) => ({ id: s._id, slug: s.slug, title: s.title, summary: s.summary })),
          trainingCount: trainings.length,
        });
      } catch {
        /* section fetch failure surfaces via the empty state below */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [key]);

  if (!user) return null;
  if (!isLandingSectionKey(key)) {
    return (
      <LandingShell>
        <AdminEmpty title="Unknown section" message="That landing section does not exist." />
      </LandingShell>
    );
  }
  if (!section || sectionKey !== key) return null;

  // Navigation on save — the old server actions redirect()ed; the SPA
  // actions return ok and the page navigates.
  const navigateOnOk = (action: (fd: FormData) => Promise<FormState>) =>
    async (fd: FormData) => {
      const result = await action(fd);
      if (result.ok) navigate("/admin/landing");
      return result;
    };

  return (
    <LandingShell>
      <div className="flex flex-col gap-8">
        <PageHeading title={SECTION_LABELS[key]} description="Landing page section" />

        {key === "hero" && (
          <HeroSectionForm
            content={section.content as HeroContent}
            variant={section.variant}
            trainingCount={items.trainingCount}
            action={navigateOnOk(saveHeroSection)}
          />
        )}

        {key === "stats" && (
          <StatsSectionForm content={section.content as StatsContent} variant={section.variant} action={navigateOnOk(saveStatsSection)} />
        )}

        {key === "pillars" && (
          <PillarsSectionForm content={section.content as PillarsContent} variant={section.variant} action={navigateOnOk(savePillarsSection)} />
        )}

        {key === "consultancy" && (
          <ConsultancySectionForm
            content={section.content as ConsultancyContent}
            variant={section.variant}
            services={items.services}
            action={navigateOnOk(saveConsultancySection)}
          />
        )}

        {key === "cta" && (
          <CtaSectionForm content={section.content as CtaContent} variant={section.variant} action={navigateOnOk(saveCtaSection)} />
        )}

        {key === "trainings" && (
          <ListSectionForm
            content={section.content as ListContent}
            variant={section.variant}
            action={navigateOnOk(saveTrainingsListSection)}
            managedElsewhereLabel="Trainings"
            kind="trainings"
            items={items.trainings}
          />
        )}

        {key === "events" && (
          <ListSectionForm
            content={section.content as ListContent}
            variant={section.variant}
            action={navigateOnOk(saveEventsListSection)}
            managedElsewhereLabel="Events"
            kind="events"
            items={items.events}
          />
        )}

        {key === "careers" && (
          <ListSectionForm
            content={section.content as ListContent}
            variant={section.variant}
            action={navigateOnOk(saveCareersListSection)}
            managedElsewhereLabel="Careers"
            kind="careers"
            items={items.careers}
          />
        )}

        {key === "blog" && (
          <ListSectionForm
            content={section.content as ListContent}
            variant={section.variant}
            action={navigateOnOk(saveBlogListSection)}
            managedElsewhereLabel="Blog"
            kind="blog"
            items={items.blog}
          />
        )}
      </div>
    </LandingShell>
  );
}
