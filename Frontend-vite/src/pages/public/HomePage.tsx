import { Fragment, useEffect, useState, type ReactNode } from "react";
import { Helmet } from "react-helmet-async";
import MarketingShell from "@/components/site/MarketingShell";
import { CareersSection, type JobListItem } from "@/components/landing/CareersSection";
import { ConsultancySection } from "@/components/landing/ConsultancySection";
import { CtaSection } from "@/components/landing/CtaSection";
import { EventsSection } from "@/components/landing/EventsSection";
import { HeroSection } from "@/components/landing/HeroSection";
import { PillarsSection } from "@/components/landing/PillarsSection";
import { StatsSection } from "@/components/landing/StatsSection";
import { TrainingsSection } from "@/components/landing/TrainingsSection";
import { BlogSection } from "@/components/landing/BlogSection";
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
  type LandingSectionRow,
} from "@/lib/landing-client";
import { LANDING_DEFAULTS, LANDING_DEFAULT_ORDER } from "@/lib/landing-defaults";
import { fetchJobs, fetchPosts, fetchServices, fetchTrainings } from "@/lib/contentClient";
import type { EventCardData } from "@/components/cards/EventCard";
import type { PostCardData } from "@/components/cards/PostCard";
import type { TrainingCardData } from "@/components/cards/TrainingCard";

type HomeData = {
  sections: LandingSectionRow[];
  featuredTrainings: TrainingCardData[];
  upcomingEvents: EventCardData[];
  services: { _id: string; slug: string; title: string; summary: string }[];
  jobs: JobListItem[];
  posts: PostCardData[];
  trainingCount: number;
};

export default function HomePage() {
  const [data, setData] = useState<HomeData | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const sections = await fetchLandingSections();
      const take = (key: LandingSectionKey, fallback: number) =>
        (sections.find((s) => s.key === key)?.content as ListContent | undefined)?.take ?? fallback;

      const [trainings, events, services, jobs, posts] = await Promise.all([
        fetchTrainings(),
        fetchPublishedEvents(),
        fetchServices(),
        fetchJobs(),
        fetchPosts(),
      ]);

      if (cancelled) return;

      setData({
        sections,
        featuredTrainings: trainings
          .filter((t) => t.featured)
          .slice(0, take("trainings", 3))
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
        upcomingEvents: events.slice(0, take("events", 3)).map(toEventCardData),
        services: services.slice(0, 4),
        jobs: jobs.slice(0, take("careers", 3)).map((j) => ({
          slug: j.slug,
          title: j.title,
          summary: j.summary,
          department: j.department,
          workMode: j.workMode,
          salaryMin: j.salaryMin,
          salaryMax: j.salaryMax,
          currency: j.currency,
        })),
        posts: posts.slice(0, take("blog", 3)).map((p) => ({
          slug: p.slug,
          title: p.title,
          excerpt: p.excerpt,
          coverImage: p.coverImage,
          category: p.category,
          content: p.content,
          publishedAt: p.publishedAt ? new Date(p.publishedAt) : null,
          author: p.author ? { name: p.author.name, photo: p.author.photo } : null,
        })),
        trainingCount: trainings.length,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!data) {
    return (
      <MarketingShell>
        <div className="container-page py-24">
          <div className="h-6 w-1/3 animate-pulse rounded bg-[var(--surface-sunken)]" />
        </div>
      </MarketingShell>
    );
  }

  const { sections } = data;
  const order: LandingSectionKey[] =
    sections.length > 0 ? (sections.map((s) => s.key) as LandingSectionKey[]) : LANDING_DEFAULT_ORDER;

  const contentFor = <T,>(key: LandingSectionKey): T =>
    (sections.find((s) => s.key === key)?.content ?? LANDING_DEFAULTS[key]) as T;
  const variantFor = (key: LandingSectionKey): LandingVariant =>
    sections.find((s) => s.key === key)?.variant ?? "modern";

  const hero = contentFor<HeroContent>("hero");
  const stats = contentFor<StatsContent>("stats");
  const pillars = contentFor<PillarsContent>("pillars");
  const consultancy = contentFor<ConsultancyContent>("consultancy");
  const cta = contentFor<CtaContent>("cta");
  const trainingsCopy = contentFor<ListContent>("trainings");
  const eventsCopy = contentFor<ListContent>("events");
  const careersCopy = contentFor<ListContent>("careers");
  const blogCopy = contentFor<ListContent>("blog");

  const sectionNodes: Partial<Record<LandingSectionKey, ReactNode>> = {
    hero: <HeroSection content={hero} variant={variantFor("hero")} trainingCount={data.trainingCount} />,
    stats: <StatsSection content={stats} variant={variantFor("stats")} />,
    pillars: <PillarsSection content={pillars} variant={variantFor("pillars")} />,
    trainings:
      data.featuredTrainings.length > 0 ? (
        <TrainingsSection content={trainingsCopy} variant={variantFor("trainings")} items={data.featuredTrainings} />
      ) : null,
    events:
      data.upcomingEvents.length > 0 ? (
        <EventsSection content={eventsCopy} variant={variantFor("events")} items={data.upcomingEvents} />
      ) : null,
    consultancy: (
      <ConsultancySection
        content={consultancy}
        variant={variantFor("consultancy")}
        services={data.services.map((s) => ({ id: s._id, slug: s.slug, title: s.title, summary: s.summary }))}
      />
    ),
    careers:
      data.jobs.length > 0 ? (
        <CareersSection content={careersCopy} variant={variantFor("careers")} items={data.jobs} />
      ) : null,
    blog:
      data.posts.length > 0 ? (
        <BlogSection content={blogCopy} variant={variantFor("blog")} items={data.posts} />
      ) : null,
    cta: <CtaSection content={cta} variant={variantFor("cta")} />,
  };

  return (
    <MarketingShell>
      <Helmet>
        <title>SingAdvisor — Training, events, consultancy and careers</title>
        <meta
          name="description"
          content="SingAdvisor runs trainings, events and consultancy engagements in Singapore for students, corporate teams and professionals — and is hiring."
        />
      </Helmet>
      {order.map((key) => (
        <Fragment key={key}>{sectionNodes[key]}</Fragment>
      ))}
    </MarketingShell>
  );
}
