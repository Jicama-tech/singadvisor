import type { MetadataRoute } from "next";
import { withBasePath } from "@/lib/base-path";

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: withBasePath("/"),
      // The admin area must never be indexed. Robots paths are matched
      // against the URL as the crawler sees it, so they carry the basePath.
      // Resumes need no rule: they are served only from under /admin.
      disallow: [withBasePath("/admin"), withBasePath("/admin/")],
    },
    sitemap: `${BASE}/sitemap.xml`,
  };
}
