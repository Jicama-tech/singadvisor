/**
 * Split an article's sanitized HTML in two, at a safe top-level boundary, so
 * something can be placed part-way down it.
 *
 * Returns null — meaning "render it whole" — whenever splitting would be wrong
 * or unsafe, and that fallback is the point: an advert is never worth breaking
 * somebody's article over.
 *
 * Pure, and kept out of ArticleBody so the rules below can be exercised
 * directly. They are the sort that look obviously right and are quietly wrong
 * on the third real post:
 *
 * - It splits only BETWEEN top-level elements, never inside one, so a list or
 *   a table cannot be cut in half.
 * - It measures by text length rather than block count, so the break lands
 *   visually mid-article instead of after the sixth of forty short paragraphs.
 * - It refuses to break immediately after a heading, which would strand the
 *   heading above an advert and away from the section it introduces.
 * - It bails out entirely rather than drop content it cannot account for.
 */

/** Don't interrupt a short post. Below this many top-level blocks there is no
 * "middle" worth the name, and the insert would land almost at the top. */
export const MIN_BLOCKS_TO_SPLIT = 6;

/** Always leave this many blocks either side, so the insert can never sit
 * immediately under the first line or just above the last. */
export const MIN_BLOCKS_EITHER_SIDE = 2;

export function splitArticleHtml(html: string): { before: string; after: string } | null {
  // No DOMParser outside a browser. This app is a SPA with no SSR, so this is
  // belt-and-braces rather than a live path — but the fallback is free.
  if (typeof DOMParser === "undefined") return null;

  let body: HTMLElement | null = null;
  try {
    body = new DOMParser().parseFromString(`<body>${html}</body>`, "text/html").body;
  } catch {
    return null;
  }
  if (!body) return null;

  // Bare text directly under the body would be dropped by the outerHTML
  // reserialization below, silently deleting a sentence from the article. Quill
  // wraps everything in block elements so this should never fire — which is
  // exactly why it must fail safe rather than be assumed.
  for (const node of Array.from(body.childNodes)) {
    if (node.nodeType === 3 && (node.textContent ?? "").trim() !== "") return null;
  }

  const blocks = Array.from(body.children);
  if (blocks.length < MIN_BLOCKS_TO_SPLIT) return null;

  const lengths = blocks.map((block) => (block.textContent ?? "").length);
  const total = lengths.reduce((sum, n) => sum + n, 0);
  if (total === 0) return null;

  let running = 0;
  let index = blocks.length;
  for (let i = 0; i < blocks.length; i++) {
    running += lengths[i];
    if (running >= total / 2) {
      index = i + 1;
      break;
    }
  }

  // Never orphan a heading from the section it introduces.
  while (index > 0 && /^H[1-6]$/.test(blocks[index - 1].tagName)) index--;

  // Clamp inside the margins, then re-check — walking back past a run of
  // headings can push the index outside them on an otherwise long-enough post.
  const highest = blocks.length - MIN_BLOCKS_EITHER_SIDE;
  index = Math.max(MIN_BLOCKS_EITHER_SIDE, Math.min(index, highest));
  if (index < MIN_BLOCKS_EITHER_SIDE || index > highest) return null;

  // A clamp that lands on a heading would reintroduce the orphan the walk-back
  // just avoided, so refuse rather than place it badly.
  if (/^H[1-6]$/.test(blocks[index - 1].tagName)) return null;

  return {
    before: blocks.slice(0, index).map((block) => block.outerHTML).join(""),
    after: blocks.slice(index).map((block) => block.outerHTML).join(""),
  };
}
