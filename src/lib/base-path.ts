/**
 * The subpath the app is served from, e.g. "/singadvisor" — empty when the app
 * owns the domain root.
 *
 * Next.js applies `basePath` automatically to `next/link`, `next/image`,
 * `useRouter` and files served out of /public. It does NOT apply it to raw
 * markup you write yourself: `<a href>`, `<form action>`, `<source src>`, or a
 * path you stored in the database. Those go through `withBasePath()` below.
 *
 * Read from an env var rather than hardcoded so the same build config works at
 * the domain root and under a subpath. It must be NEXT_PUBLIC_* because client
 * components need it too, and it is inlined at build time — changing it
 * requires a rebuild, not just a restart.
 */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/**
 * Prefix an app-absolute path with the basePath.
 *
 * Leaves external URLs, anchors, and protocol-relative URLs untouched, so it is
 * safe to call on values whose origin you do not control (a candidate's
 * LinkedIn URL, for instance).
 */
export function withBasePath(path: string | null | undefined): string {
  if (!path) return "";
  if (!BASE_PATH) return path;
  // Anything that is not an app-absolute path is not ours to rewrite.
  if (!path.startsWith("/") || path.startsWith("//")) return path;
  // Never double-prefix.
  if (path === BASE_PATH || path.startsWith(`${BASE_PATH}/`)) return path;
  return `${BASE_PATH}${path}`;
}
