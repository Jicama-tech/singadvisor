import { useMemo, useRef, useState } from "react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import { adminFetch } from "@/lib/adminFetch";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { PLACEHOLDERS, unknownPlaceholders } from "@/lib/campaignTemplate";

/**
 * Writing a WhatsApp campaign.
 *
 * A Quill editor, but NOT the app's usual one. RichTextEditor ships Quill's
 * default toolbar, which is right for a blog post rendered as HTML and wrong
 * here, because WhatsApp is not HTML. Its entire formatting vocabulary is:
 *
 *     *bold*     _italic_     ~strikethrough~     ```monospace```
 *
 * There is no underline and no font size. A message carrying either arrives
 * as plain text with the markup gone. So those buttons are deliberately
 * absent: a control that appears to work and silently does nothing is worse
 * than one that is not offered, and the note under the editor says why rather
 * than leaving somebody to discover it from a delivered message.
 *
 * Headings, lists and links ARE offered — they have honest equivalents, and
 * the server's htmlToWhatsapp does the conversion (a heading becomes bold on
 * its own line, a list gets real bullets, a labelled link becomes
 * "label (url)").
 *
 * The image is NOT a Quill format. WhatsApp sends one image with the text as
 * its caption, not text with pictures embedded in it, so it is a separate
 * control with its own upload — and the caption limit that comes with it is
 * a quarter of the plain-text limit, which is why attaching one changes the
 * counter below.
 *
 * Personalisation, as in kioscart-v1's campaigns: `{{name}}` and friends are
 * filled per recipient on the server, and `{Hi|Hello|Hey}` picks one option
 * per person so a hundred people do not get a hundred identical messages —
 * the pattern WhatsApp treats as bulk spam. The buttons insert a placeholder
 * at the cursor; nothing here renders them, the preview does.
 */

/** WhatsApp's own limits. Attaching an image makes the text a caption. */
const MAX_TEXT = 4096;
const MAX_CAPTION = 1024;

export function WhatsappMessageEditor({
  value,
  onChange,
  imageUrl,
  onImageChange,
}: {
  /** The editor's HTML. Converted to WhatsApp markup on the server. */
  value: string;
  onChange: (html: string) => void;
  imageUrl: string | null;
  onImageChange: (url: string | null) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const quillRef = useRef<ReactQuill>(null);

  /** Put `{{key}}` where the cursor is — or at the end if the editor was
   * never focused — and leave the cursor after it, ready to keep typing. */
  function insertPlaceholder(key: string) {
    const quill = quillRef.current?.getEditor();
    if (!quill) return;
    const token = `{{${key}}}`;
    const at = quill.getSelection(true)?.index ?? Math.max(0, quill.getLength() - 1);
    quill.insertText(at, token, "user");
    quill.setSelection(at + token.length, 0, "user");
  }
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  /** Only the formats that survive the trip. Memoised because Quill
   * reinitialises its toolbar whenever this object identity changes. */
  const modules = useMemo(
    () => ({
      toolbar: [
        [{ header: [2, 3, false] }],
        ["bold", "italic", "strike"],
        [{ list: "bullet" }, { list: "ordered" }],
        ["link", "blockquote", "code-block"],
        ["clean"],
      ],
    }),
    [],
  );

  /** Belt and braces: even if a format reaches the editor by paste, it is not
   * in this list, so Quill drops it rather than storing markup the server
   * would only throw away. */
  const formats = useMemo(
    () => ["header", "bold", "italic", "strike", "list", "bullet", "link", "blockquote", "code-block"],
    [],
  );

  /** Roughly what the message will weigh once the tags are gone. Not the
   * server's conversion — that is authoritative and runs on preview — but
   * close enough to warn before somebody writes three thousand characters
   * into a caption that can hold a thousand. */
  const plainLength = useMemo(() => {
    const withBreaks = value.replace(/<\/(p|div|li|h[1-6])>/gi, "\n").replace(/<br\s*\/?>/gi, "\n");
    return withBreaks
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .trim().length;
  }, [value]);

  const unknown = useMemo(
    () => unknownPlaceholders(value.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ")),
    [value],
  );

  const limit = imageUrl ? MAX_CAPTION : MAX_TEXT;
  const overLimit = plainLength > limit;

  async function upload(file: File) {
    setUploading(true);
    setUploadError(null);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await adminFetch(`${__API_URL__}/uploads/whatsapp`, { method: "POST", body });
      const data = (await res.json().catch(() => null)) as { url?: string; message?: string } | null;
      if (!res.ok || !data?.url) {
        setUploadError(data?.message ?? "That image would not upload.");
        return;
      }
      onImageChange(data.url);
    } catch {
      setUploadError("Could not reach the server.");
    } finally {
      setUploading(false);
      // So picking the same file again still fires a change event.
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="rich-text-editor rounded-xl border border-[var(--border-strong)] bg-[var(--surface)] [&_.ql-toolbar]:rounded-t-xl [&_.ql-toolbar]:border-[var(--border-strong)] [&_.ql-container]:rounded-b-xl [&_.ql-container]:border-[var(--border-strong)] [&_.ql-editor]:min-h-[9rem]">
        <ReactQuill
          ref={quillRef}
          theme="snow"
          value={value}
          onChange={onChange}
          modules={modules}
          formats={formats}
          placeholder="{Hi|Hello} {{first_name}}, just a reminder that…"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-[var(--text-secondary)]">Insert:</span>
        {PLACEHOLDERS.map((p) => (
          <button
            key={p.key}
            type="button"
            onClick={() => insertPlaceholder(p.key)}
            className="rounded-full border border-[var(--border-strong)] bg-[var(--surface-raised)] px-3 py-1 text-xs font-medium text-[var(--text-primary)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
          >
            {p.label}
          </button>
        ))}
      </div>

      <p className="text-xs leading-relaxed text-[var(--text-muted)]">
        Each person gets their own copy. <code>{"{{first_name}}"}</code> becomes their first
        name, and <code>{"{{name|friend}}"}</code> says “friend” when a contact has no name
        (without a fallback, a missing name reads “there”). Write{" "}
        <code>{"{Hi|Hello|Hey}"}</code> and each person gets one of those at random, so the
        messages are not all identical.
      </p>

      {unknown.length > 0 && (
        <p role="alert" className="text-sm font-medium text-red-600 dark:text-red-400">
          {unknown.map((k) => `{{${k}}}`).join(", ")}{" "}
          {unknown.length === 1 ? "is not a placeholder" : "are not placeholders"}. Use{" "}
          {PLACEHOLDERS.map((p) => `{{${p.key}}}`).join(", ")}.
        </p>
      )}

      <p className="text-xs leading-relaxed text-[var(--text-muted)]">
        WhatsApp supports <strong>bold</strong>, <em>italic</em>, <s>strikethrough</s> and
        monospace only — it has no underline and no text sizes, so those are not offered here.
        A heading is sent as bold on its own line.
      </p>

      {/* The image. Separate from the editor because WhatsApp attaches one
          image to a message rather than embedding pictures in text. */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void upload(file);
          }}
        />
        {!imageUrl ? (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
          >
            <Icon name="image" size={15} />
            {uploading ? "Uploading…" : "Attach an image"}
          </Button>
        ) : (
          <div className="flex items-center gap-3 rounded-xl border border-[var(--border-subtle)] surface-sunken p-2">
            <img
              // `${__API_URL__}${imageUrl}` — the same shape PostForm uses for
              // uploaded images. The stored value is a server-relative
              // /uploads/... path; the API origin is what serves it.
              src={`${__API_URL__}${imageUrl}`}
              alt="Attached to this campaign"
              className="h-14 w-14 rounded-lg object-cover"
            />
            <div className="text-xs text-[var(--text-secondary)]">
              <p className="font-medium text-[var(--text-primary)]">Image attached</p>
              <p>Sent with the message as its caption.</p>
            </div>
            <Button type="button" variant="secondary" size="sm" onClick={() => onImageChange(null)}>
              Remove
            </Button>
          </div>
        )}

        <span
          className={`ml-auto text-xs ${
            overLimit ? "font-medium text-red-600 dark:text-red-400" : "text-[var(--text-muted)]"
          }`}
        >
          {plainLength} / {limit}
          {imageUrl && " (caption limit)"}
        </span>
      </div>

      {uploadError && (
        <p role="alert" className="text-sm font-medium text-red-600 dark:text-red-400">
          {uploadError}
        </p>
      )}

      {overLimit && (
        <p role="alert" className="text-sm font-medium text-red-600 dark:text-red-400">
          {imageUrl
            ? `WhatsApp limits an image caption to ${MAX_CAPTION} characters. Shorten the message or remove the image.`
            : `WhatsApp limits a message to ${MAX_TEXT} characters.`}
        </p>
      )}
    </div>
  );
}
