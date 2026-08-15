import { notFound } from "next/navigation";
import {
  saveBlogListSection,
  saveCareersListSection,
  saveEventsListSection,
  saveTrainingsListSection,
} from "@/app/admin/actions";
import { PageHeading } from "@/components/admin/AdminUI";
import { ConsultancySectionForm } from "@/components/admin/landing/ConsultancySectionForm";
import { CtaSectionForm } from "@/components/admin/landing/CtaSectionForm";
import { HeroSectionForm } from "@/components/admin/landing/HeroSectionForm";
import { ListSectionForm } from "@/components/admin/landing/ListSectionForm";
import { PillarsSectionForm } from "@/components/admin/landing/PillarsSectionForm";
import { StatsSectionForm } from "@/components/admin/landing/StatsSectionForm";
import { db } from "@/lib/db";
import { fetchPublishedEvents, toEventCardData } from "@/lib/events-client";
import { fetchLandingSectionAdmin } from "@/lib/landing-admin-client";
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

function isLandingSectionKey(value: string): value is LandingSectionKey {
  return (LANDING_SECTION_KEYS as readonly string[]).includes(value);
}

export default async function EditLandingSectionPage({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  const { key } = await params;
  if (!isLandingSectionKey(key)) notFound();

  const section = await fetchLandingSectionAdmin(key);

  return (
    <>
      <PageHeading title={SECTION_LABELS[key]} description="Landing page section" />

      {key === "hero" && (
        <HeroSectionForm
          content={section.content as HeroContent}
          variant={section.variant}
          trainingCount={await db.training.count({ where: { published: true } })}
        />
      )}

      {key === "stats" && (
        <StatsSectionForm content={section.content as StatsContent} variant={section.variant} />
      )}

      {key === "pillars" && (
        <PillarsSectionForm content={section.content as PillarsContent} variant={section.variant} />
      )}

      {key === "consultancy" && (
        <ConsultancySectionForm
          content={section.content as ConsultancyContent}
          variant={section.variant}
          services={await db.consultancyService.findMany({
            where: { published: true },
            orderBy: { sortOrder: "asc" },
            take: 4,
          })}
        />
      )}

      {key === "cta" && <CtaSectionForm content={section.content as CtaContent} variant={section.variant} />}

      {key === "trainings" && (
        <ListSectionForm
          content={section.content as ListContent}
          variant={section.variant}
          action={saveTrainingsListSection}
          managedElsewhereLabel="Trainings"
          kind="trainings"
          items={await db.training.findMany({
            where: { published: true, featured: true },
            orderBy: { sortOrder: "asc" },
            take: PREVIEW_SAMPLE_SIZE,
          })}
        />
      )}

      {key === "events" && (
        <ListSectionForm
          content={section.content as ListContent}
          variant={section.variant}
          action={saveEventsListSection}
          managedElsewhereLabel="Events"
          kind="events"
          items={(await fetchPublishedEvents()).slice(0, PREVIEW_SAMPLE_SIZE).map(toEventCardData)}
        />
      )}

      {key === "careers" && (
        <ListSectionForm
          content={section.content as ListContent}
          variant={section.variant}
          action={saveCareersListSection}
          managedElsewhereLabel="Careers"
          kind="careers"
          items={await db.jobPosting.findMany({
            where: { published: true },
            orderBy: { createdAt: "desc" },
            take: PREVIEW_SAMPLE_SIZE,
          })}
        />
      )}

      {key === "blog" && (
        <ListSectionForm
          content={section.content as ListContent}
          variant={section.variant}
          action={saveBlogListSection}
          managedElsewhereLabel="Blog"
          kind="blog"
          items={await db.blogPost.findMany({
            where: { published: true },
            orderBy: [{ featured: "desc" }, { publishedAt: "desc" }],
            take: PREVIEW_SAMPLE_SIZE,
            include: { author: { select: { name: true, photo: true } } },
          })}
        />
      )}
    </>
  );
}
