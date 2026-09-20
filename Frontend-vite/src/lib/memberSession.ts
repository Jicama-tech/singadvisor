/**
 * Remembers the Google credential a reader signed in with, so a member is
 * asked once rather than on every members-only page they open.
 *
 * What is stored is the Google ID token itself. Three things make that a
 * reasonable thing to keep in the browser, and they are worth stating because
 * "JWT in localStorage" is otherwise a smell:
 *
 * 1. It is short-lived by construction — Google issues these with about an
 *    hour's life — and this module refuses to hand back an expired one, so a
 *    stale copy is inert rather than dangerous.
 * 2. It proves an email address and nothing else. It is not a session for this
 *    site: every request re-verifies it against Google's public keys, and the
 *    Backend grants nothing on the strength of the browser having it.
 * 3. It opens only members-only reading. The admin's own session is a separate
 *    token in sessionStorage and is unaffected by any of this.
 *
 * localStorage rather than sessionStorage on purpose: a reader who follows a
 * second link from a newsletter, in a new tab, should not be asked again.
 * Every accessor is wrapped, because storage throws outright in a private
 * window and a reader in one should meet a sign-in button, not a broken page.
 */

const KEY = "singadvisor.member.credential";

/** A minute of headroom: a token that expires while the request is in flight
 * is a confusing failure, and asking slightly early costs one click. */
const EXPIRY_SKEW_MS = 60_000;

/** Reads the `exp` claim without verifying anything — the Backend does the
 * verifying, and all this decides is whether sending it is worth the trip. */
function expiryOf(credential: string): number | null {
  try {
    const segment = credential.split(".")[1] ?? "";
    const base64 = segment.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    const payload = JSON.parse(atob(padded)) as { exp?: unknown };
    return typeof payload.exp === "number" ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

/** The stored credential, or null when there is none, it cannot be read, or it
 * has expired. An expired one is cleared on the way past so it is not carried
 * around forever. */
export function loadMemberCredential(): string | null {
  let stored: string | null = null;
  try {
    stored = localStorage.getItem(KEY);
  } catch {
    return null;
  }
  if (!stored) return null;

  const expiresAt = expiryOf(stored);
  // A token with no readable expiry is treated as unusable rather than
  // eternal — the safe reading of "I cannot tell when this dies".
  if (expiresAt === null || Date.now() > expiresAt - EXPIRY_SKEW_MS) {
    clearMemberCredential();
    return null;
  }
  return stored;
}

export function saveMemberCredential(credential: string): void {
  try {
    localStorage.setItem(KEY, credential);
  } catch {
    // A private window, or storage disabled. The reader stays signed in for
    // this page and is asked again on the next one — worse, but not broken.
  }
}

export function clearMemberCredential(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* nothing to do, and nothing depends on it having worked */
  }
}
