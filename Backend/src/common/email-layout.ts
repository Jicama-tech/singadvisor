/**
 * The SingAdvisor wrapper every outgoing email goes through.
 *
 * Callers write the middle — a few paragraphs — and this supplies the header,
 * the frame and the footer, so an enrolment confirmation, a membership welcome
 * and a members-only announcement arrive looking like the same company wrote
 * them.
 *
 * WHY IT LOOKS LIKE 2005 HTML. Email clients are not browsers. Outlook renders
 * with Word's engine, Gmail strips <style> blocks and anything it does not
 * recognise, and neither supports flexbox, grid, CSS custom properties or
 * external stylesheets. So: tables for layout, every style inline, six-digit
 * hex (three-digit shorthand is unreliable in Outlook), and no shorthand
 * `background` where `bgcolor` will do. None of this is cargo-culted — each
 * line is the version that survives all three.
 *
 * NO IMAGES, DELIBERATELY. A logo would mean a remote <img>, and most clients
 * block remote images until the reader clicks "show images" — so the brand
 * would be invisible exactly when first impressions are made, and the header
 * would collapse to a broken-image box. A styled text wordmark always renders.
 *
 * The palette is the site's own, resolved from Frontend-vite/src/index.css:
 * teal-600 #0d8266 as the accent, ink-950 #08111f for text.
 */

/** Brand constants, kept here so an email cannot drift from the site quietly.
 * Mirrors SITE in Frontend-vite/src/lib/constants.ts. */
const BRAND = {
  name: 'SingAdvisor',
  tagline: 'Training, events, consultancy and careers — built around people.',
  accent: '#0d8266',
  ink: '#08111f',
  body: '#4a5567',
  muted: '#8590a2',
  hairline: '#e4e8ee',
  canvas: '#f4f6f9',
  card: '#ffffff',
} as const;

/** Public origin of the site — where a reader is sent. Same source and same
 * trailing-slash trim as ShareService.siteUrl. */
function siteUrl(): string {
  return (process.env.SITE_URL || 'https://singadvisor.com').replace(/\/+$/, '');
}

function escapeHtml(value: string): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * A call-to-action button.
 *
 * A table with the padding on the CELL, never on the anchor. Word's engine
 * (Outlook on Windows) ignores padding on inline elements, so padding the <a>
 * leaves the label jammed against the edges of the coloured block. The anchor
 * carries only type and colour.
 *
 * No whitespace or newline inside the <a> either: some clients underline it,
 * giving a stray underscore either side of the label.
 *
 * These notes live here rather than as an HTML comment in the markup, because
 * anything inside the template string is shipped to every recipient and shows
 * up in "view source" — internal reasoning is not theirs to read, and it is
 * dead weight against Gmail's ~102KB clipping threshold.
 */
export function emailButton(label: string, url: string): string {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0;">
      <tr>
        <td align="center" bgcolor="${BRAND.accent}" style="padding:13px 28px;border-radius:6px;">
          <a href="${escapeHtml(url)}" style="font-family:Helvetica,Arial,sans-serif;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">${escapeHtml(label)}</a>
        </td>
      </tr>
    </table>`;
}

export type BrandedEmail = {
  /** The line under the wordmark — what this message is. Short: "Enrolment
   * confirmed", "Membership active". */
  preheading?: string;
  /** The caller's own HTML: paragraphs, lists, whatever it needs. Already
   * escaped by the caller — this wrapper does not touch it. */
  body: string;
  /**
   * The one-line summary email clients show beside the subject in the inbox
   * list. Without it they scrape the first text they find, which is usually
   * "Hi Jane," — a wasted line in every inbox this lands in.
   */
  preview?: string;
};

/**
 * Wrap a message body in the SingAdvisor frame.
 *
 * The body is inserted verbatim; escaping is the caller's job, because only the
 * caller knows which parts are user-supplied. Every string this function adds
 * itself is either a constant or escaped here.
 */
export function brandedEmail({ preheading, body, preview }: BrandedEmail): string {
  const site = siteUrl();

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(BRAND.name)}</title>
</head>
<body style="margin:0;padding:0;background-color:${BRAND.canvas};">
${
  // Hidden preview text. The character padding after it stops the client
  // pulling the first line of the body in alongside it.
  preview
    ? `<div style="display:none;font-size:1px;color:${BRAND.canvas};line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${escapeHtml(
        preview,
      )}${'&#847;&zwnj;&nbsp;'.repeat(30)}</div>`
    : ''
}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${BRAND.canvas}" style="background-color:${BRAND.canvas};">
  <tr>
    <td align="center" style="padding:32px 16px;">

      <!-- 600px is the width every client agrees on; wider gets cut off in
           Outlook's reading pane. -->
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:100%;">

        <!-- Wordmark -->
        <tr>
          <td align="left" style="padding:0 0 20px 0;">
            <a href="${escapeHtml(site)}" style="text-decoration:none;">
              <span style="font-family:Georgia,'Times New Roman',serif;font-size:23px;font-weight:700;color:${BRAND.ink};letter-spacing:-0.2px;">Sing</span><span style="font-family:Georgia,'Times New Roman',serif;font-size:23px;font-weight:700;color:${BRAND.accent};letter-spacing:-0.2px;">Advisor</span>
            </a>
          </td>
        </tr>

        <!-- Card -->
        <tr>
          <td bgcolor="${BRAND.card}" style="background-color:${BRAND.card};border:1px solid ${BRAND.hairline};border-radius:10px;">
            <!-- A solid accent rule across the top of the card. A 3px table row
                 rather than a border, because Outlook drops border-radius and
                 renders partial borders inconsistently. -->
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr><td bgcolor="${BRAND.accent}" height="3" style="height:3px;line-height:3px;font-size:3px;background-color:${BRAND.accent};">&nbsp;</td></tr>
              <tr>
                <td style="padding:32px;font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:1.65;color:${BRAND.body};">
                  ${
                    preheading
                      ? `<p style="margin:0 0 18px 0;font-size:12px;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;color:${BRAND.accent};">${escapeHtml(
                          preheading,
                        )}</p>`
                      : ''
                  }
                  ${body}
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:22px 4px 0 4px;font-family:Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:${BRAND.muted};">
            <p style="margin:0 0 6px 0;">${escapeHtml(BRAND.tagline)}</p>
            <p style="margin:0;">
              <a href="${escapeHtml(site)}" style="color:${BRAND.muted};text-decoration:underline;">${escapeHtml(
                site.replace(/^https?:\/\//, ''),
              )}</a>
            </p>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

/** Paragraph and list helpers, so callers style nothing themselves. Inline
 * styles cannot be inherited from a parent in Outlook, so every <p> in a body
 * needs its own — which is exactly the sort of thing that gets forgotten. */
export const p = (html: string) =>
  `<p style="margin:0 0 14px 0;font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:1.65;color:${BRAND.body};">${html}</p>`;

export const strong = (text: string) =>
  `<strong style="color:${BRAND.ink};font-weight:600;">${escapeHtml(text)}</strong>`;

/**
 * A label/value row — "Seats: 1", "Amount due: S$150.00".
 *
 * The LABEL is escaped here; the VALUE is not, because callers legitimately
 * pass markup (a styled link, a <br />). So any caller putting dynamic text
 * in `value` must escape it first — escapeEmailHtml is exported for exactly
 * that. This asymmetry has already caught one call site out; it is spelled
 * out rather than quietly fixed because escaping inside detail() would
 * double-escape the three callers that already do it right.
 */
export const detail = (label: string, value: string) =>
  `<p style="margin:0 0 8px 0;font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:${BRAND.body};">${strong(
    label,
  )} ${value}</p>`;

export const bullets = (items: string[]) =>
  items.length === 0
    ? ''
    : `<ul style="margin:0 0 14px 0;padding-left:20px;font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:1.7;color:${BRAND.body};">${items
        .map((i) => `<li style="margin:0 0 6px 0;">${i}</li>`)
        .join('')}</ul>`;

export { BRAND, escapeHtml as escapeEmailHtml };
