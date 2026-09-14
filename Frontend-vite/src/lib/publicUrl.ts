/**
 * Where a slug actually lives on the public site.
 *
 * A slug on its own is not an address, and the admin is the one place that
 * kept showing it as if it were: the forms took a bare "why-training-dies-by-
 * monday" and the list columns printed a bare "/why-training-dies-by-monday",
 * neither of which tells you which page that is or lets you paste it to
 * anyone. Both now show the whole URL, built here.
 *
 * The section is the part that cannot be derived, because the admin routes and
 * the public routes are deliberately not the same shape — /admin/blog/:id
 * edits what the world reads at /blog/:slug, addressed by id on one side and
 * by slug on the other. So callers name their section, and SlugSection is the
 * closed list that App.tsx's public routes and scripts/generate-sitemap.ts
 * already agree on. A seventh kind of content will not typecheck until its
 * public route is added here as well, which is the point.
 */

/** The middle of the address, between the site and the slug. */
export type SlugSection =
  | "blog"
  | "newsletter"
  | "events"
  | "trainings"
  | "consultancy"
  | "careers";

/** Everything before the slug, for a field that prints it in front of an
 * editable box. Carries the trailing slash, so it reads as an address mid-way
 * through rather than a domain with a path stuck on. */
export function publicUrlPrefix(section: SlugSection): string {
  return `${__SITE_URL__}/${section}/`;
}

/** The finished address of a published page. */
export function publicUrl(section: SlugSection, slug: string): string {
  return `${publicUrlPrefix(section)}${slug}`;
}
