import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminEmpty, PageHeading, Panel } from "@/components/admin/AdminUI";
import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
import type { LandingSectionKey } from "@/lib/landing-client";
import {
  fetchLandingSectionsAdmin,
  patchLandingSectionMove,
  patchLandingSectionVisibility,
  type LandingSectionAdminRow,
} from "@/lib/landing-admin-client";

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

export default function LandingAdmin() {
  const { user } = useAuth();
  const [sections, setSections] = useState<LandingSectionAdminRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setSections(await fetchLandingSectionsAdmin());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load landing sections.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function move(key: LandingSectionKey, direction: "up" | "down") {
    await patchLandingSectionMove(key, direction);
    await load();
  }

  async function toggleVisible(section: LandingSectionAdminRow) {
    await patchLandingSectionVisibility(section.key, !section.visible);
    await load();
  }

  if (!user) return null;

  const ordered = [...(sections ?? [])].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <AdminShell
      user={{ name: user.name, email: user.email, role: user.role }}
      counts={{ registrations: 0, enquiries: 0, applications: 0, messages: 0 }}
    >
      <div className="flex flex-col gap-8">
        <PageHeading
          title="Landing page"
          description="What shows on the homepage, section by section — visibility, order, and copy."
        />

        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}

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
                    <button
                      type="button"
                      disabled={i === 0}
                      aria-label={`Move ${SECTION_LABELS[section.key]} up`}
                      onClick={() => move(section.key, "up")}
                      className="grid h-6 w-6 place-items-center rounded text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-sunken)] hover:text-[var(--accent)] disabled:pointer-events-none disabled:opacity-30"
                    >
                      <Icon name="chevron-down" size={14} className="rotate-180" />
                    </button>
                    <button
                      type="button"
                      disabled={i === ordered.length - 1}
                      aria-label={`Move ${SECTION_LABELS[section.key]} down`}
                      onClick={() => move(section.key, "down")}
                      className="grid h-6 w-6 place-items-center rounded text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-sunken)] hover:text-[var(--accent)] disabled:pointer-events-none disabled:opacity-30"
                    >
                      <Icon name="chevron-down" size={14} />
                    </button>
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
                    <button
                      type="button"
                      onClick={() => toggleVisible(section)}
                      className="rounded-full border border-[var(--border-strong)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--accent)]/50 hover:text-[var(--accent)]"
                    >
                      {section.visible ? "Hide" : "Show"}
                    </button>

                    <Link
                      to={`/admin/landing/${section.key}`}
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
      </div>
    </AdminShell>
  );
}
