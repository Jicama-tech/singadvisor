import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { withBasePath } from "@/lib/base-path";

/**
 * Renders a post's markdown body.
 *
 * `react-markdown` builds React elements rather than injecting an HTML string,
 * so a post can never introduce a <script> or an event handler even if the
 * stored content is malicious. Raw HTML in the source is ignored by default —
 * that is deliberate, do not enable rehype-raw here.
 *
 * Styling is done with explicit component overrides instead of a typography
 * plugin so headings share the site's display font and colour tokens.
 */
export function ArticleBody({ content }: { content: string }) {
  return (
    <div className="text-[1.0625rem] leading-[1.75] text-[var(--text-secondary)]">
      <Markdown
        remarkPlugins={[remarkGfm]}
        components={{
          h2: ({ children }) => (
            <h2 className="mt-12 mb-4 text-2xl text-[var(--text-primary)] md:text-3xl">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="mt-9 mb-3 text-xl text-[var(--text-primary)]">
              {children}
            </h3>
          ),
          p: ({ children }) => <p className="my-5">{children}</p>,
          strong: ({ children }) => (
            <strong className="font-semibold text-[var(--text-primary)]">
              {children}
            </strong>
          ),
          a: ({ href, children }) => {
            const url = href ?? "#";
            const external = /^https?:\/\//.test(url);
            return (
              <a
                href={external ? url : withBasePath(url)}
                target={external ? "_blank" : undefined}
                rel={external ? "noopener noreferrer" : undefined}
                className="font-medium text-[var(--accent)] underline underline-offset-2 hover:no-underline"
              >
                {children}
              </a>
            );
          },
          ul: ({ children }) => (
            <ul className="my-5 flex list-disc flex-col gap-2 pl-5 marker:text-[var(--accent)]">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="my-5 flex list-decimal flex-col gap-2 pl-5 marker:text-[var(--accent)]">
              {children}
            </ol>
          ),
          li: ({ children }) => <li className="pl-1.5">{children}</li>,
          blockquote: ({ children }) => (
            <blockquote className="my-8 border-l-4 border-[var(--accent)] bg-[var(--surface-sunken)] py-1 pl-6 pr-4 text-[1.125rem] italic text-[var(--text-primary)]">
              {children}
            </blockquote>
          ),
          code: ({ children }) => (
            <code className="rounded bg-[var(--surface-sunken)] px-1.5 py-0.5 font-mono text-[0.875em] text-[var(--text-primary)]">
              {children}
            </code>
          ),
          pre: ({ children }) => (
            // Long code must scroll inside its own box, never widen the page.
            <pre className="my-6 overflow-x-auto rounded-xl bg-[var(--color-ink-950)] p-5 text-sm text-[var(--color-ink-100)]">
              {children}
            </pre>
          ),
          hr: () => <hr className="my-10 border-[var(--border-subtle)]" />,
          table: ({ children }) => (
            <div className="my-6 overflow-x-auto">
              <table className="w-full min-w-[30rem] text-left text-sm">
                {children}
              </table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border-b border-[var(--border-strong)] px-3 py-2 font-semibold text-[var(--text-primary)]">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border-b border-[var(--border-subtle)] px-3 py-2">
              {children}
            </td>
          ),
        }}
      >
        {content}
      </Markdown>
    </div>
  );
}
