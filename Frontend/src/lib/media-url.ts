const BACKEND_PUBLIC_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? "";

/**
 * Resolves a path returned by the Backend's uploads endpoint (e.g.
 * "/uploads/landing/<uuid>.jpg") into a fully-qualified URL the browser can
 * fetch directly from the Backend — a different origin from the Frontend,
 * so a bare "/uploads/..." would otherwise resolve against the wrong
 * server (a 404, not a broken image, since the Frontend has no such route).
 *
 * Leaves anything that is not one of our own upload paths untouched — the
 * pre-upload convention of a plain /public path (e.g.
 * "/Images/Trainingimgae/consultancy.jpg"), and already-absolute URLs, both
 * pass through as-is. Safe to compose with withBasePath() in either order.
 */
export function withBackendUrl(path: string | null | undefined): string {
  if (!path) return "";
  if (!path.startsWith("/uploads/")) return path;
  return `${BACKEND_PUBLIC_URL}${path}`;
}
