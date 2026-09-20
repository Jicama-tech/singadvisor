/**
 * Pull the display fields out of a Google ID token, in the browser.
 *
 * This is cosmetic and nothing else: it prefills a name and shows whose account
 * a submission is going under. It reads the token's own claims WITHOUT checking
 * a signature, so nothing here may be treated as proof of anything — the
 * Backend re-verifies the same token against Google's public keys and takes the
 * stored address from that, never from a form. A doctored or simply unreadable
 * token therefore costs an empty prefill and nothing more.
 *
 * The middle segment is base64url (`-`/`_`, no padding), which `atob` alone
 * rejects, and the name may be any UTF-8 — hence the two conversions rather
 * than the bare `atob(...)` a payload of pure ASCII would get away with.
 *
 * Lifted out of RegistrationForm unchanged when the membership purchase form
 * needed the same prefill. It is a pure function over a string with no layout
 * of its own, which is what makes it worth sharing where that file's own step
 * panels deliberately are not.
 */
export function readGoogleProfile(credential: string): { email: string; name: string } {
  try {
    const segment = credential.split(".")[1] ?? "";
    const base64 = segment.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    const json = decodeURIComponent(
      atob(padded)
        .split("")
        .map((char) => `%${char.charCodeAt(0).toString(16).padStart(2, "0")}`)
        .join(""),
    );
    const payload = JSON.parse(json) as { email?: unknown; name?: unknown };
    return {
      email: typeof payload.email === "string" ? payload.email : "",
      name: typeof payload.name === "string" ? payload.name : "",
    };
  } catch {
    return { email: "", name: "" };
  }
}
