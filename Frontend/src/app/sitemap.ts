import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { fetchPublishedEvents } from "@/lib/events-client";

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [trainings, upcomingEvents, pastEvents, services, jobs, posts] = await Promise.all([
    db.training.findMany({
      where: { published: true },
      select: { slug: true, updatedAt: true },
    }),
    // No single "all published, any date" Backend route — merge both
    // directions instead. Past events keep valid URLs, so they belong here
    // same as the original unfiltered Prisma query did.
    fetchPublishedEvents(),
    fetchPublishedEvents({ includePast: true }),
    db.consultancyService.findMany({
      where: { published: true },
      select: { slug: true, updatedAt: true },
    }),
    db.jobPosting.findMany({
      where: { published: true },
      select: { slug: true, updatedAt: true },
    }),
    db.blogPost.findMany({
      where: { published: true },
      select: { slug: true, updatedAt: true },
    }),
  ]);

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE, priority: 1, changeFrequency: "weekly" },
    { url: `${BASE}/trainings`, priority: 0.9, changeFrequency: "weekly" },
    { url: `${BASE}/events`, priority: 0.9, changeFrequency: "daily" },
    { url: `${BASE}/consultancy`, priority: 0.9, changeFrequency: "monthly" },
    { url: `${BASE}/careers`, priority: 0.9, changeFrequency: "daily" },
    { url: `${BASE}/blog`, priority: 0.8, changeFrequency: "weekly" },
    { url: `${BASE}/about`, priority: 0.6, changeFrequency: "monthly" },
    { url: `${BASE}/contact`, priority: 0.6, changeFrequency: "yearly" },
  ];

  const entries = (
    prefix: string,
    rows: { slug: string; updatedAt: Date }[],
    priority: number,
  ): MetadataRoute.Sitemap =>
    rows.map((row) => ({
      url: `${BASE}${prefix}/${row.slug}`,
      lastModified: row.updatedAt,
      priority,
      changeFrequency: "weekly" as const,
    }));

  const events = [...upcomingEvents, ...pastEvents].map((e) => ({
    slug: e.slug,
    updatedAt: new Date(e.updatedAt),
  }));

  return [
    ...staticRoutes,
    ...entries("/trainings", trainings, 0.8),
    ...entries("/events", events, 0.8),
    ...entries("/consultancy", services, 0.8),
    ...entries("/careers", jobs, 0.8),
    ...entries("/blog", posts, 0.7),
  ];
}
