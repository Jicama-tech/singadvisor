/**
 * The WhatsApp campaign placeholders, for the composer.
 *
 * MIRRORS Backend/src/modules/whatsapp/campaign-template.ts — the list and
 * validate() only. Rendering happens on the server, and the preview shows the
 * server's rendering, so there is no second renderer here to drift from it.
 */

export const PLACEHOLDERS = [
  { key: "name", label: "Name" },
  { key: "first_name", label: "First name" },
  { key: "company", label: "Company" },
  { key: "role", label: "Role" },
] as const;

const KNOWN = new Set<string>(PLACEHOLDERS.map((p) => p.key));

const PLACEHOLDER = /\{\{\s*([A-Za-z_]+)\s*(?:\|([^{}]*))?\}\}/g;

/** Unknown placeholders in a message — shown under the editor while typing,
 * and they block sending. */
export function unknownPlaceholders(text: string): string[] {
  const unknown: string[] = [];
  for (const m of text.matchAll(PLACEHOLDER)) {
    const key = m[1].toLowerCase();
    if (!KNOWN.has(key) && !unknown.includes(key)) unknown.push(key);
  }
  return unknown;
}
