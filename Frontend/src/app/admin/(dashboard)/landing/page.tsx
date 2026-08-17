import Link from "next/link";
import { moveLandingSection, setLandingSectionVisibility } from "@/app/admin/actions";
import { AdminEmpty, PageHeading, Panel } from "@/components/admin/AdminUI";
import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
import type { LandingSectionKey } from "@/lib/landing-client";
import { fetchLandingSectionsAdmin } from "@/lib/landing-admin-client";

export const metadata = { title: "Landing page" };

const SECTION_LABELS: Record<LandingSectionKey, string> = {
  hero: "Hero",
  stats: "Stats bar",
  pillars: "Four pillars",
  trainings: "Featured trainings",
  events: "Upcoming events",
  consultancy: "Consultancy",
  careers: "Careers",
  blog: "From the blog",
  cta: "Closing call-to-action",
};

const SECTION_HINTS: Partial<Record<LandingSectionKey, string>> = {
  trainings: "Copy and item count only — programmes are managed under Trainings.",
  events: "Copy and item count only — events are managed under Events.",
  careers: "Copy and item count only — openings are managed under Careers.",
  blog: "Copy and item count only — articles are managed under Blog.",
};

export default async function AdminLandingPage() {
  const sections = await fetchLandingSectionsAdmin();
  const ordered = [...sections].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <>
      <PageHeading
        title="Landing page"
        description="What shows on the homepage, section by section — visibility, order, and copy."
      />

      <Panel>
        {ordered.length === 0 ? (
          <AdminEmpty message="No landing sections found. Run `npm run seed:landing` in Backend/." />
        ) : (
          <ul className="divide-y divide-[var(--border-subtle)]">
            {ordered.map((section, i) => (
              <li
                key={section.key}
                className="flex flex-wrap items-center gap-4 px-5 py-4"
              >
                <div className="flex flex-col gap-1">
                  <form action={moveLandingSection}>
                    <input type="hidden" name="key" value={section.key} />
                    <input type="hidden" name="direction" value="up" />
                    <button
                      type="submit"
                      disabled={i === 0}
                      aria-label={`Move ${SECTION_LABELS[section.key]} up`}
                      className="grid h-6 w-6 place-items-center rounded text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-sunken)] hover:text-[var(--accent)] disabled:pointer-events-none disabled:opacity-30"
                    >
                      <Icon name="chevron-down" size={14} className="rotate-180" />
                    </button>
                  </form>
                  <form action={moveLandingSection}>
                    <input type="hidden" name="key" value={section.key} />
                    <input type="hidden" name="direction" value="down" />
                    <button
                      type="submit"
                      disabled={i === ordered.length - 1}
                      aria-label={`Move ${SECTION_LABELS[section.key]} down`}
                      className="grid h-6 w-6 place-items-center rounded text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-sunken)] hover:text-[var(--accent)] disabled:pointer-events-none disabled:opacity-30"
                    >
                      <Icon name="chevron-down" size={14} />
                    </button>
                  </form>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-[var(--text-primary)]">
                      {SECTION_LABELS[section.key]}
                    </span>
                    <span className="font-mono text-xs text-[var(--text-muted)]">
                      {section.key}
                    </span>
                    <Badge tone={section.visible ? "success" : "neutral"}>
                      {section.visible ? "Visible" : "Hidden"}
                    </Badge>
                  </div>
                  {SECTION_HINTS[section.key] && (
                    <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                      {SECTION_HINTS[section.key]}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <form action={setLandingSectionVisibility}>
                    <input type="hidden" name="key" value={section.key} />
                    <input type="hidden" name="visible" value={String(!section.visible)} />
                    <button
                      type="submit"
                      className="rounded-full border border-[var(--border-strong)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--accent)]/50 hover:text-[var(--accent)]"
                    >
                      {section.visible ? "Hide" : "Show"}
                    </button>
                  </form>

                  <Link
                    href={`/admin/landing/${section.key}`}
                    aria-label={`Edit ${SECTION_LABELS[section.key]}`}
                    className="grid h-8 w-8 place-items-center rounded-lg text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-sunken)] hover:text-[var(--accent)]"
                  >
                    <Icon name="pencil" size={15} />
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </>
  );
}
