import path from "node:path";

/**
 * Where candidate résumés are stored.
 *
 * Deliberately NOT under public/:
 *
 *  1. Next.js resolves the public directory at build time, so a file written
 *     there afterwards is never served — every résumé uploaded after a deploy
 *     would 404 for the admin trying to read it.
 *  2. Anything under public/ is world-readable to whoever has the URL.
 *     Résumés are personal data and belong behind the admin session.
 *
 * Files are served by src/app/admin/resumes/[file]/route.ts, which verifies
 * the session before streaming.
 *
 * Override with UPLOAD_DIR to point at a persistent volume in production.
 */
export const UPLOAD_DIR =
  process.env.UPLOAD_DIR ?? path.join(process.cwd(), "var", "uploads");

/**
 * Stored filenames are always `<uuid><ext>` — we generate them, never trusting
 * the uploader's filename. Anything else is rejected before touching the disk,
 * which makes path traversal ("../../etc/passwd") structurally impossible.
 */
const SAFE_NAME = /^[0-9a-f-]{36}\.(pdf|doc|docx)$/i;

export function isSafeStoredName(name: string): boolean {
  return SAFE_NAME.test(name);
}

/**
 * Resolve a stored filename to an absolute path, or null if it is not a name
 * we could have produced. `basename` strips any directory component that
 * survived, as a second line of defence.
 */
export function resolveUploadPath(name: string): string | null {
  const base = path.basename(name);
  if (!isSafeStoredName(base)) return null;
  return path.join(UPLOAD_DIR, base);
}

/** The admin-only URL a stored résumé is downloaded from. */
export function resumeHref(name: string | null | undefined): string | null {
  if (!name) return null;
  const base = path.basename(name);
  return isSafeStoredName(base) ? `/admin/resumes/${base}` : null;
}
