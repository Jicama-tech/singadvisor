/**
 * Build-time replacement for the Next app's `src/app/sitemap.ts` /
 * `src/app/robots.ts` metadata routes (which a pure SPA cannot serve). Run
 * as part of the deploy before `vite build` (or after, outputting straight
 * into `public/`) — it fetches every published content slug from the
 * Backend's public endpoints and writes static `public/sitemap.xml` and
 * `public/robots.txt` files.
 *
 *   npx tsx scripts/generate-sitemap.ts [site-url] [api-url] [eventsh-public-url]
 *
 * Defaults read SITE_URL / VITE_API_URL / VITE_EVENTSH_PUBLIC_URL from the
 * environment (the same names the build itself uses).
 */
import { writeFileSync, mkdirSync } from "fs";
import { resolve } from "path";

const SITE_URL = (process.argv[2] || process.env.SITE_URL || "https://singadvisor.com").replace(/\/$/, "");
const API_URL = process.argv[3] || process.env.VITE_API_URL || "http://localhost:4000";
const EVENTSH_PUBLIC_URL = process.argv[4] || process.env.VITE_EVENTSH_PUBLIC_URL || "http://localhost:3001";
const ORGANIZER_ID = process.env.VITE_EVENTSH_ORGANIZER_ID || "";

async function fetchList<T>(url: string): Promise<T[]> {
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    return (await res.json()) as T[];
  } catch {
    return [];
  }
}

async function main() {
  const staticPaths = ["", "/about", "/contact", "/events", "/trainings", "/consultancy", "/careers", "/blog"];

  const [trainings, services, jobs, posts] = await Promise.all([
    fetchList<{ slug: string }>(`${API_URL}/trainings`),
    fetchList<{ slug: string }>(`${API_URL}/consultancy-services`),
    fetchList<{ slug: string }>(`${API_URL}/careers/jobs`),
    fetchList<{ slug: string }>(`${API_URL}/blog`),
  ]);

  let eventSlugs: string[] = [];
  if (ORGANIZER_ID) {
    // The Backend's public forwarder keeps the eventsh key off the build
    // machine; call eventsh's public route directly for the slug list.
    eventSlugs = await fetchList<{ slug: string }>(
      `${EVENTSH_PUBLIC_URL}/events/organizer/${ORGANIZER_ID}?publicOnly=true`,
    ).then((rows) => rows.map((e) => e.slug));
  }

  const urls: { loc: string; lastmod?: string }[] = [
    ...staticPaths.map((p) => ({ loc: `${SITE_URL}${p}` })),
    ...trainings.map((t) => ({ loc: `${SITE_URL}/trainings/${t.slug}` })),
    ...services.map((s) => ({ loc: `${SITE_URL}/consultancy/${s.slug}` })),
    ...jobs.map((j) => ({ loc: `${SITE_URL}/careers/${j.slug}` })),
    ...posts.map((p) => ({ loc: `${SITE_URL}/blog/${p.slug}` })),
    ...eventSlugs.map((slug) => ({ loc: `${SITE_URL}/events/${slug}` })),
  ];

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${u.loc}</loc></url>`).join("\n")}
</urlset>
`;

  const robots = `User-agent: *
Allow: /
Disallow: /admin

Sitemap: ${SITE_URL}/sitemap.xml
`;

  const outDir = resolve(process.cwd(), "public");
  mkdirSync(outDir, { recursive: true });
  writeFileSync(resolve(outDir, "sitemap.xml"), sitemap);
  writeFileSync(resolve(outDir, "robots.txt"), robots);
  console.log(
    `Wrote public/sitemap.xml (${urls.length} URLs) and public/robots.txt for ${SITE_URL}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
