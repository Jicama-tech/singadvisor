import { Fragment, type ReactNode } from "react";
import { CareersSection } from "@/components/landing/CareersSection";
import { ConsultancySection } from "@/components/landing/ConsultancySection";
import { CtaSection } from "@/components/landing/CtaSection";
import { EventsSection } from "@/components/landing/EventsSection";
import { HeroSection } from "@/components/landing/HeroSection";
import { PillarsSection } from "@/components/landing/PillarsSection";
import { StatsSection } from "@/components/landing/StatsSection";
import { TrainingsSection } from "@/components/landing/TrainingsSection";
import { BlogSection } from "@/components/landing/BlogSection";
import { db } from "@/lib/db";
import { fetchPublishedEvents, toEventCardData } from "@/lib/events-client";
import {
  fetchLandingSections,
  type LandingSectionKey,
  type LandingVariant,
  type HeroContent,
  type StatsContent,
  type PillarsContent,
  type ConsultancyContent,
  type CtaContent,
  type ListContent,
} from "@/lib/landing-client";
import { LANDING_DEFAULTS, LANDING_DEFAULT_ORDER } from "@/lib/landing-defaults";

// Content is editable through the admin CMS, so the home page revalidates
// rather than being fully static.
export const revalidate = 60;

export default async function HomePage() {
  // Fetched first (and separately from the Promise.all below) because the
  // DB-driven sections' `take` counts depend on it.
  const sections = await fetchLandingSections();
  const order: LandingSectionKey[] =
    sections.length > 0
      ? (sections.map((s) => s.key) as LandingSectionKey[])
      : LANDING_DEFAULT_ORDER;

  function contentFor<T>(key: LandingSectionKey): T {
    return (sections.find((s) => s.key === key)?.content ?? LANDING_DEFAULTS[key]) as T;
  }

  function variantFor(key: LandingSectionKey): LandingVariant {
    return sections.find((s) => s.key === key)?.variant ?? "modern";
  }

  const hero = contentFor<HeroContent>("hero");
  const stats = contentFor<StatsContent>("stats");
  const pillars = contentFor<PillarsContent>("pillars");
  const consultancy = contentFor<ConsultancyContent>("consultancy");
  const cta = contentFor<CtaContent>("cta");
  const trainingsCopy = contentFor<ListContent>("trainings");
  const eventsCopy = contentFor<ListContent>("events");
  const careersCopy = contentFor<ListContent>("careers");
  const blogCopy = contentFor<ListContent>("blog");

  const [featuredTrainings, upcomingEvents, services, jobs, posts, trainingCount] =
    await Promise.all([
      db.training.findMany({
        where: { published: true, featured: true },
        orderBy: { sortOrder: "asc" },
        take: trainingsCopy.take,
      }),
      fetchPublishedEvents().then((rows) => rows.slice(0, eventsCopy.take)),
      db.consultancyService.findMany({
        where: { published: true },
        orderBy: { sortOrder: "asc" },
        take: 4,
      }),
      db.jobPosting.findMany({
        where: { published: true },
        orderBy: { createdAt: "desc" },
        take: careersCopy.take,
      }),
      db.blogPost.findMany({
        where: { published: true },
        orderBy: [{ featured: "desc" }, { publishedAt: "desc" }],
        take: blogCopy.take,
        include: { author: { select: { name: true, photo: true } } },
      }),
      db.training.count({ where: { published: true } }),
    ]);

  const sectionNodes: Partial<Record<LandingSectionKey, ReactNode>> = {
    hero: <HeroSection content={hero} variant={variantFor("hero")} trainingCount={trainingCount} />,
    stats: <StatsSection content={stats} variant={variantFor("stats")} />,
    pillars: <PillarsSection content={pillars} variant={variantFor("pillars")} />,
    trainings:
      featuredTrainings.length > 0 ? (
        <TrainingsSection content={trainingsCopy} variant={variantFor("trainings")} items={featuredTrainings} />
      ) : null,
    events:
      upcomingEvents.length > 0 ? (
        <EventsSection
          content={eventsCopy}
          variant={variantFor("events")}
          items={upcomingEvents.map(toEventCardData)}
        />
      ) : null,
    consultancy: (
      <ConsultancySection content={consultancy} variant={variantFor("consultancy")} services={services} />
    ),
    careers:
      jobs.length > 0 ? (
        <CareersSection content={careersCopy} variant={variantFor("careers")} items={jobs} />
      ) : null,
    blog:
      posts.length > 0 ? (
        <BlogSection content={blogCopy} variant={variantFor("blog")} items={posts} />
      ) : null,
    cta: <CtaSection content={cta} variant={variantFor("cta")} />,
  };

  return (
    <>
      {order.map((key) => (
        <Fragment key={key}>{sectionNodes[key]}</Fragment>
      ))}
    </>
  );
}

export const metadata = {
  description:
    "SingAdvisor runs trainings, events and consultancy engagements in Singapore for students, corporate teams and professionals — and is hiring.",
};
