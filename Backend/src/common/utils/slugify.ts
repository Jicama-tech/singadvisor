/**
 * Mirrors Frontend's `slugify` in `src/lib/utils.ts` — same output for the
 * same input, so slugs generated here are interchangeable with the ones the
 * old Next app generated. (The events module predates this shared util and
 * keeps its own private copy; new modules import this one.)
 */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
