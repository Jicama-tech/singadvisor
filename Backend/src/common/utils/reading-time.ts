/** Matches Frontend-vite/src/lib/utils.ts. Kept in step deliberately: the two
 * run over the same text and a reader who sees "6 min read" on the card and
 * "5 min read" on the article notices. */
const WORDS_PER_MINUTE = 200;

/**
 * Estimated reading time in whole minutes, never less than one.
 *
 * This moved to the Backend when the public blog list stopped shipping post
 * bodies. The cards previously computed it in the browser from `content`,
 * which meant every visitor to /blog downloaded the full text of every post to
 * render a badge — and, once posts could be members-only, would have handed
 * out the very thing the gate exists to withhold.
 *
 * Markdown/HTML syntax is stripped first so `##`, `**` and tags do not inflate
 * the count. The frontend's version predates the rich-text editor and strips
 * only Markdown; this one also drops tags, because what it is given now is
 * HTML. The difference is a word or two on a long post, well inside the
 * rounding.
 */
export function readingMinutes(text: string): number {
  const words = (text || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[#>*_`~|-]/g, ' ')
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}
