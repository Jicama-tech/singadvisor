import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";

/**
 * eventsh-v1's CreateEventForm.tsx uses plain `react-quill@2.0.0` via React
 * .lazy — in a Vite SPA there is no SSR, so the module's `document` access at
 * init is simply safe to import directly (the old next/dynamic + ssr:false
 * wrapper was the Next-specific adaptation, now retired). React 18 pairing
 * matches eventsh exactly, so the maintained react-quill package works —
 * react-quill-new was only ever needed for this repo's previous React 19.
 */
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
