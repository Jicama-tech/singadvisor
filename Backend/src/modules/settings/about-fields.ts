/**
 * The editable copy on the public About page, keyed by field.
 *
 * Kept as a whitelist rather than a typed class: the page has ~25 independent
 * text slots and every one is "a string, blank means the page's own wording".
 * Unknown keys are dropped on write, so the stored object can never grow
 * fields nothing renders.
 *
 * The team section is not here — it is derived from the facilitators on
 * published trainings, and is edited where those are.
 */
export const ABOUT_FIELD_KEYS = [
  'metaDescription',
  'heroEyebrow',
  'heroTitle',
  'heroDescription',
  'storyEyebrow',
  'storyTitle',
  /** Paragraphs separated by a blank line. */
  'story',
  'missionLabel',
  'missionTitle',
  'missionBody',
  'visionLabel',
  'visionTitle',
  'visionBody',
  'principlesEyebrow',
  'principlesTitle',
  'principlesDescription',
  'principle1Title',
  'principle1Body',
  'principle2Title',
  'principle2Body',
  'principle3Title',
  'principle3Body',
  'principle4Title',
  'principle4Body',
  'teamEyebrow',
  'teamTitle',
  'ctaTitle',
  'ctaBody',
] as const;

export type AboutFieldKey = (typeof ABOUT_FIELD_KEYS)[number];
export type AboutContent = Partial<Record<AboutFieldKey, string>>;

/** Generous for the story, but stops a pasted book. */
export const ABOUT_FIELD_MAX = 6000;

/**
 * Reduce arbitrary input to a clean AboutContent: known keys, strings only,
 * trimmed, length-capped. Anything else is ignored rather than rejected, so a
 * form from a slightly older or newer frontend still saves.
 */
export function sanitizeAbout(input: unknown): AboutContent {
  const out: AboutContent = {};
  if (!input || typeof input !== 'object') return out;
  const src = input as Record<string, unknown>;
  for (const key of ABOUT_FIELD_KEYS) {
    const v = src[key];
    if (typeof v === 'string') out[key] = v.trim().slice(0, ABOUT_FIELD_MAX);
  }
  return out;
}
