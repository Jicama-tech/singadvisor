/**
 * The subpath the app is served from, e.g. "/singadvisor" — empty when the app
 * owns the domain root. In the Vite build this is baked in via the build
 * `base` option when needed; components keep calling withBasePath() so a
 * future subpath deployment needs no call-site changes.
 */
export const BASE_PATH = "";

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
  if (!path.startsWith("/") || path.startsWith("//")) return path;
  if (path === BASE_PATH || path.startsWith(`${BASE_PATH}/`)) return path;
  return `${BASE_PATH}${path}`;
}
