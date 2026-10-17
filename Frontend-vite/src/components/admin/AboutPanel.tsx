import { useEffect, useState, type FormEvent } from "react";
import { adminFetch } from "@/lib/adminFetch";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { Panel } from "@/components/admin/AdminUI";
import { ABOUT_DEFAULTS, resolveAbout, type AboutContent, type AboutKey } from "@/lib/aboutContent";

/**
 * Settings -> About: the copy on the public About page.
 *
 * Every field is pre-filled with what the page currently says (the shipped
 * wording until somebody edits it), so the admin edits in place rather than
 * facing empty boxes. Saving stores only what differs from the shipped
 * wording; a field cleared or set back to it returns to following the default.
 * The team section is not edited here — it is built from the facilitators on
 * published trainings.
 */

type FieldDef = { key: AboutKey; label: string; long?: boolean; hint?: string };
type Group = { title: string; description?: string; fields: FieldDef[] };

const GROUPS: Group[] = [
  {
    title: "Page header",
    description: "The top of the page, and the description search engines show.",
    fields: [
      { key: "heroEyebrow", label: "Small label above the title" },
      { key: "heroTitle", label: "Title" },
      { key: "heroDescription", label: "Intro text", long: true },
      { key: "metaDescription", label: "Search-engine description", long: true, hint: "Shown in Google results; around 150 characters works best." },
    ],
  },
  {
    title: "Our story",
    fields: [
      { key: "storyEyebrow", label: "Small label" },
      { key: "storyTitle", label: "Heading" },
      { key: "story", label: "Story", long: true, hint: "Leave a blank line between paragraphs." },
    ],
  },
  {
    title: "Mission",
    fields: [
      { key: "missionLabel", label: "Label" },
      { key: "missionTitle", label: "Heading" },
      { key: "missionBody", label: "Text", long: true },
    ],
  },
  {
    title: "Vision",
    fields: [
      { key: "visionLabel", label: "Label" },
      { key: "visionTitle", label: "Heading" },
      { key: "visionBody", label: "Text", long: true },
    ],
  },
  {
    title: "How we work",
    description: "Four principles, shown as numbered cards.",
    fields: [
      { key: "principlesEyebrow", label: "Small label" },
      { key: "principlesTitle", label: "Heading" },
      { key: "principlesDescription", label: "Intro text", long: true },
      { key: "principle1Title", label: "Principle 1 — title" },
      { key: "principle1Body", label: "Principle 1 — text", long: true },
      { key: "principle2Title", label: "Principle 2 — title" },
      { key: "principle2Body", label: "Principle 2 — text", long: true },
      { key: "principle3Title", label: "Principle 3 — title" },
      { key: "principle3Body", label: "Principle 3 — text", long: true },
      { key: "principle4Title", label: "Principle 4 — title" },
      { key: "principle4Body", label: "Principle 4 — text", long: true },
    ],
  },
  {
    title: "Team",
    description: "The people shown come from the facilitators on your published trainings; only the heading is edited here.",
    fields: [
      { key: "teamEyebrow", label: "Small label" },
      { key: "teamTitle", label: "Heading" },
    ],
  },
  {
    title: "Closing call to action",
    description: "The dark banner at the bottom. Its two buttons (Get in touch, See open roles) are fixed.",
    fields: [
      { key: "ctaTitle", label: "Heading" },
      { key: "ctaBody", label: "Text", long: true },
    ],
  },
];

export function AboutPanel({
  about,
  onSaved,
  onMessage,
  onError,
}: {
  /** The saved overrides from GET /settings (absent keys = shipped wording). */
  about: Partial<Record<string, string>> | undefined;
  onSaved: (settings: { about?: Partial<Record<string, string>> }) => void;
  onMessage: (m: string) => void;
  onError: (m: string) => void;
}) {
  const [values, setValues] = useState<AboutContent>(() => resolveAbout(about));
  const [saving, setSaving] = useState(false);

  // Re-sync when the saved copy changes (first load, or after a save).
  useEffect(() => {
    setValues(resolveAbout(about));
  }, [about]);

  const set = (key: AboutKey, v: string) => setValues((cur) => ({ ...cur, [key]: v }));

  async function save(e: FormEvent) {
    e.preventDefault();
    // Only what differs from the shipped wording is stored; '' = follow default.
    const payload: Record<string, string> = {};
    for (const key of Object.keys(ABOUT_DEFAULTS) as AboutKey[]) {
      const v = values[key].trim();
      payload[key] = v === ABOUT_DEFAULTS[key].trim() ? "" : v;
    }
    setSaving(true);
    onError("");
    onMessage("");
    try {
      const res = await adminFetch(`${__API_URL__}/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ about: payload }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        const m = body?.message;
        throw new Error(Array.isArray(m) ? m.join(" ") : m || "Could not save the About page.");
      }
      onSaved((await res.json()) as { about?: Partial<Record<string, string>> });
      onMessage("About page saved.");
    } catch (err) {
      onError(err instanceof Error ? err.message : "Could not save the About page.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="flex flex-col gap-6">
      <Panel className="p-6">
        <h2 className="text-lg">About page</h2>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Everything below is the text on the public About page, shown as it reads today. Edit any
          of it and save — clearing a box puts the original wording back. Photos are not edited
          here.
        </p>
        <div className="mt-4">
          <a
            href="/about"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-[var(--accent)] hover:underline"
          >
            View the live page
          </a>
        </div>
      </Panel>

      {GROUPS.map((g) => (
        <Panel key={g.title} className="p-6">
          <h3 className="text-base font-semibold text-[var(--text-primary)]">{g.title}</h3>
          {g.description && (
            <p className="mt-1 text-sm text-[var(--text-secondary)]">{g.description}</p>
          )}
          <div className="mt-4 flex flex-col gap-4">
            {g.fields.map((f) => {
              const id = `about-${f.key}`;
              return (
                <Field key={f.key} label={f.label} htmlFor={id} hint={f.hint}>
                  {f.long ? (
                    <Textarea
                      id={id}
                      value={values[f.key]}
                      onChange={(e) => set(f.key, e.target.value)}
                      rows={f.key === "story" ? 12 : 3}
                      maxLength={6000}
                    />
                  ) : (
                    <Input
                      id={id}
                      value={values[f.key]}
                      onChange={(e) => set(f.key, e.target.value)}
                      maxLength={6000}
                    />
                  )}
                </Field>
              );
            })}
          </div>
        </Panel>
      ))}

      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save About page"}
        </Button>
        <Button type="button" variant="secondary" onClick={() => setValues({ ...ABOUT_DEFAULTS })}>
          Restore original wording
        </Button>
      </div>
    </form>
  );
}
