import { useMemo } from "react";
import DOMPurify from "dompurify";
import { withBackendUrl } from "@/lib/media-url";

/**
 * Renders a post's body — now the rich-text editor's HTML output (the Blog
 * editor switched from a Markdown textarea to a Quill-based WYSIWYG editor,
 * matching jicamaTech's blog form). Sanitized with DOMPurify before
 * `dangerouslySetInnerHTML` so a post can never introduce a <script> or an
 * event handler even if the stored content were somehow malicious — the
 * same non-negotiable a Markdown-only renderer used to give for free.
 *
 * Styling: a scoped `article-body` class in index.css carries the same
 * heading/paragraph/list/quote/code treatment the old per-tag component
 * overrides gave, since raw HTML can't take per-element React props.
 */
export function ArticleBody({ content }: { content: string }) {
  const clean = useMemo(
    () =>
      DOMPurify.sanitize(content, {
        ALLOWED_TAGS: [
          "h2",
          "h3",
          "p",
          "strong",
          "em",
          "u",
          "a",
          "ul",
          "ol",
          "li",
          "blockquote",
          "code",
          "pre",
          "hr",
          "br",
          "img",
          "table",
          "thead",
          "tbody",
          "tr",
          "th",
          "td",
          "span",
        ],
        ALLOWED_ATTR: ["href", "target", "rel", "src", "alt", "class"],
      }),
    [content],
  );

  // Inline images insert as a relative /uploads/content/... path (same
  // convention every other image field in the app stores) — rewrite to the
  // Backend's public origin here at render time, same as withBackendUrl
  // does for a plain <img>'s src prop, since this HTML never passes through
  // AppImage.
  const withImageUrls = useMemo(
    () => clean.replace(/src="(\/uploads\/[^"]*)"/g, (_m, path) => `src="${withBackendUrl(path)}"`),
    [clean],
  );

  return (
    <div
      className="article-body text-[1.0625rem] leading-[1.75] text-[var(--text-secondary)]"
      dangerouslySetInnerHTML={{ __html: withImageUrls }}
    />
  );
}
