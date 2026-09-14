import { Field, controlBase } from "@/components/ui/Field";
import { publicUrlPrefix, type SlugSection } from "@/lib/publicUrl";
import { cn } from "@/lib/utils";

/**
 * The slug field, shown as the address it actually produces.
 *
 * Each of these used to be a bare box holding "why-training-dies-by-monday",
 * which says nothing about where that page lands. A published URL is three
 * parts — the site, the section the content sits under, and the slug — and
 * only the last is the admin's to type, so the other two are printed in front
 * of the box instead of being left to memory. src/lib/publicUrl.ts owns the
 * mapping and the reasoning behind it.
 *
 * Only the slug is submitted. The prefix is decoration, never part of the
 * value: the Backend stores a slug and composes its own links from it, so a
 * field that posted the whole address would have to strip it off again on the
 * way in, and one bad strip would write a URL into the slug column.
 */
export function SlugField({
  section,
  id,
  hint,
  error,
  defaultValue,
  placeholder,
  label = "URL slug",
}: {
  section: SlugSection;
  id: string;
  hint?: string;
  error?: string;
  defaultValue?: string;
  placeholder?: string;
  label?: string;
}) {
  return (
    <Field label={label} htmlFor={id} hint={hint} error={error}>
      <div
        className={cn(
          controlBase,
          "flex items-center gap-0.5",
          // The wrapper has to carry the focus treatment that a bare <input>
          // carries itself: the real input inside is borderless, so without
          // this the field would look dead while it is being typed into.
          "focus-within:border-[var(--accent)] focus-within:ring-2 focus-within:ring-[var(--ring)]/25",
        )}
      >
        {/* Smaller and muted: it is context, not an equal half of the value.
            shrink-0 keeps the whole address readable — it is the part that
            cannot be worked out by looking at what was typed — and select-all
            lifts it in one click for pasting somewhere else. */}
        <span className="shrink-0 select-all text-sm text-[var(--text-muted)]">
          {publicUrlPrefix(section)}
        </span>
        <input
          id={id}
          name="slug"
          type="text"
          defaultValue={defaultValue}
          placeholder={placeholder}
          // min-w-0 lets the input shrink rather than shoulder the prefix out
          // of the box: these fields sit in a half-width grid cell next to the
          // title, and the prefix is the longer half of the two.
          className="min-w-0 flex-1 bg-transparent p-0 text-inherit placeholder:text-[var(--text-muted)] focus:outline-none"
        />
      </div>
    </Field>
  );
}
