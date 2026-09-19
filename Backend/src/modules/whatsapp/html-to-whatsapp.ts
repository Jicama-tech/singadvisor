/**
 * Rich text, as WhatsApp can actually render it.
 *
 * The campaign composer is a Quill editor, so what arrives is HTML. WhatsApp
 * has no HTML: it has four inline markers and nothing else.
 *
 *   *bold*        _italic_        ~strikethrough~        ```monospace```
 *
 * There is NO underline and NO font size — not "unsupported by this code",
 * unsupported by WhatsApp. A message carrying <u> or font-size lands as plain
 * text with the markup stripped, so the composer deliberately does not offer
 * those buttons. Offering them would mean a formatting control that silently
 * does nothing, which is worse than not having one.
 *
 * Headings are the one liberty taken: Quill has them, WhatsApp does not, and
 * a heading is clearly meant to stand out — so it becomes bold on its own
 * line, which is what a person writing a heading wanted.
 *
 * Written as a small hand-rolled parser rather than a DOM library because the
 * Backend has no DOM, jsdom is a heavy dependency for this, and the input is
 * Quill's output: a predictable, shallow subset of HTML rather than arbitrary
 * markup from the web.
 */

/** What Quill emits that we can carry across, and what it becomes. */
const INLINE: Array<{ tag: string; marker: string }> = [
  { tag: 'strong', marker: '*' },
  { tag: 'b', marker: '*' },
  { tag: 'em', marker: '_' },
  { tag: 'i', marker: '_' },
  { tag: 's', marker: '~' },
  { tag: 'del', marker: '~' },
  { tag: 'strike', marker: '~' },
];

/** Entities Quill produces. Ampersand LAST on the way out, or "&amp;lt;"
 * would decode to "<" in two passes. */
function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');
}

/**
 * Quill wraps every line in <p>, and an empty line is `<p><br></p>`. Lists
 * come through as <ul>/<ol> of <li>. Convert block structure to newlines and
 * bullets first, then inline markers, then strip whatever is left.
 */
export function htmlToWhatsapp(html: string): string {
  if (!html) return '';

  let text = html;

  // Block-level: each becomes its own line.
  text = text.replace(/<br\s*\/?>/gi, '\n');

  // Ordered lists need their numbers, so they are handled before the generic
  // <li> rule and counted per list.
  text = text.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, (_m, inner: string) => {
    let n = 0;
    const numbered = inner.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_m2, item: string) => {
      n += 1;
      return `${n}. ${item.trim()}\n`;
    });
    return `\n${numbered}`;
  });

  // Unordered lists. WhatsApp renders no bullet of its own, so one is drawn.
  text = text.replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, (_m, inner: string) => {
    const bulleted = inner.replace(
      /<li[^>]*>([\s\S]*?)<\/li>/gi,
      (_m2, item: string) => `• ${item.trim()}\n`,
    );
    return `\n${bulleted}`;
  });

  // Any <li> outside a list Quill did not close properly.
  text = text.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_m, item: string) => `• ${item.trim()}\n`);

  // Headings: bold, on their own line. See the note above.
  //
  // Inner bold is STRIPPED first. A heading is already being made bold, and
  // `<h2><strong>Hello</strong></h2>` — which is what Quill produces the
  // moment somebody bolds a heading, an entirely ordinary thing to do —
  // otherwise gets wrapped twice and goes out as `**Hello**`. WhatsApp reads
  // a doubled marker as literal text, so the reader sees the asterisks and no
  // bold at all. Observed in a real campaign.
  text = text.replace(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/gi, (_m, inner: string) => {
    const withoutBold = inner.replace(/<\/?(strong|b)(\s[^>]*)?>/gi, '');
    return `*${withoutBold.trim()}*\n`;
  });

  // Blockquote — WhatsApp added "> " quoting, which renders on current
  // clients and degrades to a visible "> " on old ones. Either is readable.
  text = text.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, (_m, inner: string) =>
    inner
      .trim()
      .split('\n')
      .map((line) => `> ${line}`)
      .join('\n'),
  );

  // Code block, then inline code.
  text = text.replace(
    /<pre[^>]*>([\s\S]*?)<\/pre>/gi,
    (_m, inner: string) => '```\n' + inner.replace(/<[^>]+>/g, '').trim() + '\n```',
  );
  text = text.replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, (_m, inner: string) => '`' + inner + '`');

  // Paragraphs close a line.
  text = text.replace(/<\/p>/gi, '\n');
  text = text.replace(/<p[^>]*>/gi, '');

  // Links: WhatsApp autolinks a bare URL and cannot label one, so the label is
  // kept and the URL put after it — unless they are the same, which is the
  // common case and would otherwise print twice.
  text = text.replace(
    /<a[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi,
    (_m, href: string, label: string) => {
      const plain = label.replace(/<[^>]+>/g, '').trim();
      if (!plain || plain === href) return href;
      return `${plain} (${href})`;
    },
  );

  // Inline markers. Applied after blocks so a <strong> inside an <li> is
  // already on its own line.
  for (const { tag, marker } of INLINE) {
    const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'gi');
    text = text.replace(re, (_m, inner: string) => {
      const plain = inner.trim();
      // An empty or whitespace-only run would emit "**", which WhatsApp shows
      // literally rather than treating as formatting.
      if (!plain) return inner;
      return `${marker}${plain}${marker}`;
    });
  }

  // Everything else — <u>, <span style=font-size>, Quill's class-based
  // alignment and colour — has no WhatsApp equivalent. The text survives; the
  // markup does not.
  text = text.replace(/<[^>]+>/g, '');

  // Backstop for any other route to a doubled marker — nested <strong><b>,
  // or a <strong> wrapping an <li> that was already emphasised. A doubled
  // marker is never what anyone meant and WhatsApp renders it literally, so
  // it collapses to the single one that actually works.
  text = text
    .replace(/\*\*(?=\S)/g, '*')
    .replace(/(?<=\S)\*\*/g, '*')
    .replace(/__(?=\S)/g, '_')
    .replace(/(?<=\S)__/g, '_')
    .replace(/~~(?=\S)/g, '~')
    .replace(/(?<=\S)~~/g, '~');

  text = decodeEntities(text);

  // Tidy the whitespace the block rules leave behind: no trailing spaces, and
  // at most one blank line, which is as much vertical space as WhatsApp shows.
  text = text
    .split('\n')
    .map((line) => line.replace(/[ \t]+$/g, ''))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return text;
}

/** Whether the composer produced anything a person would actually receive.
 * `<p><br></p>` is what an empty Quill editor emits. */
export function isBlankHtml(html: string): boolean {
  return htmlToWhatsapp(html).length === 0;
}
