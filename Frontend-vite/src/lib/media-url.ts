const BACKEND_PUBLIC_URL = __API_URL__;
const EVENTSH_PUBLIC_URL = __EVENTSH_PUBLIC_URL__;

/**
 * Resolves a path returned by the Backend's uploads endpoint (e.g.
 * "/uploads/landing/<uuid>.jpg") into a fully-qualified URL the browser can
 * fetch directly from the Backend — a different origin from the SPA, so a
 * bare "/uploads/..." would otherwise resolve against the wrong server.
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

/**
 * Same idea as withBackendUrl, but for event images — those come from
 * eventsh (Phase 4 API-client integration), a different origin from this
 * app's own Backend, so they need their own public base URL.
 */
export function withEventshUrl(path: string | null | undefined): string {
  if (!path) return "";
  if (!path.startsWith("/uploads/")) return path;
  return `${EVENTSH_PUBLIC_URL}${path}`;
}
