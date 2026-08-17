import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { adminFetch } from "@/lib/adminFetch";
import { AdminEmpty, PageHeading, Panel } from "@/components/admin/AdminUI";
import { StatusSelect } from "@/components/admin/StatusSelect";
import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
import { APPLICATION_STATUSES } from "@/lib/constants";
import { updateApplicationStatus } from "@/adminActions";
import { formatDate } from "@/lib/utils";
import type { ApplicationDoc } from "@/lib/contentClient";

/**
 * Job applications inbox. The résumé download can't be a plain <a href> in a
 * SPA — the streaming endpoint is Bearer-guarded and the token lives in
 * sessionStorage, not a cookie — so it fetches the file as a blob and opens
 * it from an object URL instead.
 */
export default function ApplicationsList() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [applications, setApplications] = useState<ApplicationDoc[] | null>(null);
  const activeJob = searchParams.get("job") ?? undefined;

  const load = useCallback(async () => {
    const res = await adminFetch(`${__API_URL__}/careers/applications`);
    if (res.ok) setApplications((await res.json()) as ApplicationDoc[]);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const jobs = useMemo(() => {
    const map = new Map<string, { id: string; title: string; count: number }>();
    for (const a of applications ?? []) {
      const entry = map.get(String(a.jobId)) ?? { id: String(a.jobId), title: a.jobTitle, count: 0 };
      entry.count++;
      map.set(String(a.jobId), entry);
    }
    return [...map.values()];
  }, [applications]);

  async function downloadResume(a: ApplicationDoc) {
    if (!a.resumePath) return;
    const res = await adminFetch(`${__API_URL__}/careers/applications/${a._id}/resume`);
    if (!res.ok) {
      window.alert("Could not load this résumé.");
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const w = window.open(url, "_blank", "noopener,noreferrer");
    // Give the new tab a moment to grab the blob before revoking it.
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    if (w) w.opener = null;
  }

  if (!user) return null;

  const shown = activeJob
    ? (applications ?? []).filter((a) => String(a.jobId) === activeJob)
    : (applications ?? []);

  return (
      <div className="flex flex-col gap-8">
        <PageHeading
          title="Job applications"
          description={`${shown.length} shown of ${applications?.length ?? 0} total`}
        />

        {jobs.length > 0 && (
          <nav aria-label="Filter by role" className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setSearchParams({})}
              className={
                activeJob
                  ? "rounded-full border border-[var(--border-strong)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:text-[var(--accent)]"
                  : "rounded-full bg-[var(--accent)] px-3 py-1.5 text-xs font-medium text-[var(--accent-foreground)]"
              }
            >
              All roles <span className="opacity-60">{applications?.length ?? 0}</span>
            </button>
            {jobs.map((j) => (
              <button
                key={j.id}
                type="button"
                onClick={() => setSearchParams({ job: j.id })}
                className={
                  activeJob === j.id
                    ? "rounded-full bg-[var(--accent)] px-3 py-1.5 text-xs font-medium text-[var(--accent-foreground)]"
                    : "rounded-full border border-[var(--border-strong)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:text-[var(--accent)]"
                }
              >
                {j.title} <span className="opacity-60">{j.count}</span>
              </button>
            ))}
          </nav>
        )}

        {shown.length === 0 ? (
          <Panel>
            <AdminEmpty message="No applications yet." />
          </Panel>
        ) : (
          <div className="flex flex-col gap-4">
            {shown.map((a) => (
              <Panel key={a._id} className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h2 className="text-lg">{a.name}</h2>
                    <p className="text-sm text-[var(--text-secondary)]">
                      <a href={`mailto:${a.email}`} className="text-[var(--accent)] hover:underline">
                        {a.email}
                      </a>{" "}
                      ·{" "}
                      <a href={`tel:${a.phone}`} className="hover:underline">
                        {a.phone}
                      </a>
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-[var(--text-muted)]">{formatDate(a.createdAt)}</span>
                    <StatusSelect
                      id={a._id}
                      value={a.status}
                      options={APPLICATION_STATUSES}
                      action={updateApplicationStatus}
                      label={`Status for ${a.name}`}
                    />
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Badge tone="accent">{a.jobTitle}</Badge>
                  {a.resumePath && (
                    <button
                      type="button"
                      onClick={() => downloadResume(a)}
                      className="inline-flex items-center gap-1.5 rounded-full bg-[var(--surface-sunken)] px-3 py-1 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:text-[var(--accent)]"
                    >
                      <Icon name="external" size={13} />
                      Résumé
                    </button>
                  )}
                  {a.linkedin && (
                    <a
                      href={a.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-full bg-[var(--surface-sunken)] px-3 py-1 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:text-[var(--accent)]"
                    >
                      <Icon name="external" size={13} />
                      LinkedIn
                    </a>
                  )}
                  {a.portfolio && (
                    <a
                      href={a.portfolio}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-full bg-[var(--surface-sunken)] px-3 py-1 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:text-[var(--accent)]"
                    >
                      <Icon name="external" size={13} />
                      Portfolio
                    </a>
                  )}
                </div>

                <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-[var(--text-secondary)]">
                  {a.coverLetter}
                </p>
              </Panel>
            ))}
          </div>
        )}
      </div>
  );
}
