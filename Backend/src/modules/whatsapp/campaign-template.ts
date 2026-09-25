/**
 * The campaign template language: `{{name}}`-style placeholders plus
 * `{Hi|Hello|Hey}` spintax. Ported from kioscart-v1's campaign-template.ts,
 * with SingAdvisor's placeholders in place of a shop's.
 *
 * The template is the WhatsApp text AFTER htmlToWhatsapp — braces and pipes
 * pass through that conversion untouched, so a placeholder typed in the Quill
 * composer arrives here as typed.
 *
 * The frontend only needs the list of placeholders and validate(); its
 * preview comes from the server, so there is no browser twin of render() to
 * keep in step. Frontend-vite/src/lib/campaignTemplate.ts mirrors the list.
 *
 * Rendering is two passes, in a fixed order:
 *
 *  1. Spintax, on the raw template. Every `{a|b|c}` that is not part of a
 *     `{{…}}` token becomes ONE of its options, chosen by
 *     fnv1a32(seed + ":" + n) — `n` counting spintax groups left to right.
 *     Deterministic, so the preview and the send pick the same greeting; per
 *     recipient, so a hundred people do not all get the identical message,
 *     which is the pattern WhatsApp treats as bulk spam.
 *
 *  2. Placeholders, on the result. Values go in as plain text and are never
 *     scanned again, so a contact called "{a|b}" or "{{role}}" cannot inject
 *     markup — the order of the passes is what guarantees it.
 */

/** The placeholders a template may use. Anything else is reported by
 * validate() and blocks sending, so "{{nmae}}" is caught in the composer
 * rather than delivered. */
export const KNOWN_PLACEHOLDERS = ['name', 'first_name', 'company', 'role'] as const;

export type CampaignPlaceholder = (typeof KNOWN_PLACEHOLDERS)[number];

export type CampaignVars = Partial<Record<CampaignPlaceholder, string>>;

const KNOWN = new Set<string>(KNOWN_PLACEHOLDERS);

/** What an empty value becomes when the template gives no fallback of its
 * own: "Hi there" rather than "Hi ". Company and role have no sensible
 * stand-in, so they simply disappear. */
const DEFAULT_FALLBACK: Record<string, string> = {
  name: 'there',
  first_name: 'there',
};

/** A `{{…}}` token, or a single-brace group with no braces inside — the
 * double-brace branch FIRST, so `{{name|friend}}` is consumed whole before
 * its inside could be read as the spintax group `{name|friend}`. */
const SPIN_SCAN = /\{\{[\s\S]*?\}\}|\{[^{}]*\}/g;

/** SPIN_SCAN's single-brace branch alone, for the part after the last `}}`. */
const SINGLE = /\{[^{}]*\}/g;

/** `{{ key }}` or `{{ key | fallback }}`. */
const PLACEHOLDER = /\{\{\s*([A-Za-z_]+)\s*(?:\|([^{}]*))?\}\}/g;

/** 32-bit FNV-1a over UTF-16 code units. */
export function fnv1a32(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/**
 * Pass 1. `n` counts only real spintax groups (ones with a `|`); a plain
 * `{word}` is left as typed and does not shift the choices after it.
 *
 * Split at the last `}}` so the scan stays linear: over the whole string, the
 * lazy `\{\{[\s\S]*?\}\}` rescans to the end from every `{{` with no `}}`
 * after it, which is quadratic on a template of "{{{{{{…".
 */
function spin(template: string, seed: string): string {
  let n = 0;
  const pick = (match: string) => {
    if (match.startsWith('{{')) return match;
    const inner = match.slice(1, -1);
    if (!inner.includes('|')) return match;
    const options = inner.split('|');
    const choice = options[fnv1a32(`${seed}:${n}`) % options.length];
    n += 1;
    return choice;
  };
  const last = template.lastIndexOf('}}');
  const cut = last < 0 ? 0 : last + 2;
  return template.slice(0, cut).replace(SPIN_SCAN, pick) + template.slice(cut).replace(SINGLE, pick);
}

/** Render a template for one recipient. */
export function render(template: string, vars: CampaignVars, seed: string): string {
  const spun = spin(String(template ?? ''), String(seed ?? ''));
  const values = vars as Record<string, string | undefined>;
  return spun.replace(PLACEHOLDER, (match, rawKey: string, rawFallback?: string) => {
    const key = rawKey.toLowerCase();
    if (!KNOWN.has(key)) return match;
    const value = values[key];
    if (value != null && value.trim() !== '') return value.trim();
    if (rawFallback !== undefined) return rawFallback.trim();
    return DEFAULT_FALLBACK[key] ?? '';
  });
}

/** Unknown placeholders — distinct, lowercased, in order of first use. A
 * non-empty list blocks sending. */
export function validate(template: string): { unknown: string[] } {
  const unknown: string[] = [];
  for (const m of String(template ?? '').matchAll(PLACEHOLDER)) {
    const key = m[1].toLowerCase();
    if (!KNOWN.has(key) && !unknown.includes(key)) unknown.push(key);
  }
  return { unknown };
}

/**
 * A person's name as a greeting can use it, or '' so the fallback applies.
 * Imports and walk-in forms fill the name with placeholders of their own —
 * "Hi Guest User" is worse than "Hi there".
 */
const NOT_A_NAME = /^(guest|guest user|user|customer|unknown|n\/?a|na|none|-+|test)$/i;

export function cleanName(raw: string | null | undefined, email?: string | null): string {
  const name = String(raw ?? '').replace(/\s+/g, ' ').trim();
  if (!name || NOT_A_NAME.test(name)) return '';
  // A name that is just the mailbox part of the address is not a name.
  const local = String(email ?? '').split('@')[0]?.toLowerCase();
  if (local && name.toLowerCase() === local) return '';
  return name;
}

export function firstNameOf(name: string): string {
  return name.split(' ')[0] ?? '';
}
