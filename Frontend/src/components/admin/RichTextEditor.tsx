"use client";

import dynamic from "next/dynamic";
import "react-quill-new/dist/quill.snow.css";

/**
 * eventsh-v1's CreateEventForm.tsx uses plain `react-quill@2.0.0` via React
 * .lazy — works there only because it's a Vite SPA under React 18. Under
 * this app's React 19 that package crashes at runtime
 * ("react_dom_1.default.findDOMNode is not a function" — findDOMNode was
 * removed) even though it happens to install; confirmed by actually
 * mounting it, not assumed. Using the maintained `react-quill-new` fork
 * instead (explicit `react: "^16 || ^17 || ^18 || ^19"` peer range, drops
 * the findDOMNode dependency) — same API, drop-in otherwise.
 *
 * Also, regardless of which package: it touches `document` at module init,
 * so it MUST go through next/dynamic with ssr:false, or the page crashes
 * with "document is not defined" on the server — eventsh's React.lazy gives
 * zero SSR protection, this is the one genuinely non-cosmetic adaptation
 * porting Quill into Next.js requires.
 */
const ReactQuill = dynamic(() => import("react-quill-new"), {
  ssr: false,
  loading: () => (
    <div className="h-40 animate-pulse rounded-xl border border-[var(--border-strong)] bg-[var(--surface-sunken)]" />
  ),
});

export function RichTextEditor({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="rich-text-editor rounded-xl border border-[var(--border-strong)] bg-[var(--surface)] [&_.ql-toolbar]:rounded-t-xl [&_.ql-toolbar]:border-[var(--border-strong)] [&_.ql-container]:rounded-b-xl [&_.ql-container]:border-[var(--border-strong)] [&_.ql-editor]:min-h-[10rem]">
      <ReactQuill theme="snow" value={value} onChange={onChange} placeholder={placeholder} />
    </div>
  );
}
