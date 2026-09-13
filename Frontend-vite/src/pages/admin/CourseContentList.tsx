import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { adminFetch } from "@/lib/adminFetch";
import { AdminEmpty, PageHeading, Panel, TableWrap, Td, Th } from "@/components/admin/AdminUI";
import TrainingsShell from "@/components/admin/TrainingsShell";
import { FormError } from "@/components/forms/FormShell";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
import { formatMins } from "@/lib/course-content";
import { fetchCurriculumSummaries, type CurriculumSummary } from "@/lib/courseContentClient";

/** The /trainings/admin payload, narrowed to what this table shows — a course
 * is the existing Training, there is no separate Course record. */
type AdminTraining = {
  _id: string;
  slug: string;
  title: string;
};

/** The curriculum's own state, never the training's — the Courses tab already
 * says whether the brochure is live. Anything built but not yet taken live
 * reads as a draft, so a half-finished course and an untouched one can't look
 * alike. */
function curriculumStatus(
  curriculum: CurriculumSummary | null,
): { label: string; tone: BadgeTone } {
  if (!curriculum || curriculum.moduleCount + curriculum.itemCount === 0) {
    return { label: "Not started", tone: "neutral" };
  }
  if (curriculum.publishedItemCount > 0) return { label: "Published", tone: "success" };
  return { label: "Draft curriculum", tone: "warn" };
}

export default function CourseContentList() {
  const { user } = useAuth();
  const [trainings, setTrainings] = useState<AdminTraining[] | null>(null);
  const [summaries, setSummaries] = useState<CurriculumSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      // Two reads rather than one: the curriculum counters live on their own
      // endpoint so TrainingsService.findAll never has to know this module
      // exists. Both are cheap — the summary is two aggregations.
      const [res, curricula] = await Promise.all([
        adminFetch(`${__API_URL__}/trainings/admin`),
        fetchCurriculumSummaries(),
      ]);
      if (res.ok) setTrainings((await res.json()) as AdminTraining[]);
      setSummaries(curricula);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load the course content.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Courses with nothing built are deliberately kept in the list — seeing
  // which are still empty is the whole point of this tab.
  const rows = useMemo(() => {
    const byTraining = new Map(summaries?.map((s) => [s.trainingId, s]));
    return (trainings ?? []).map((training) => ({
      training,
      curriculum: byTraining.get(training._id) ?? null,
    }));
  }, [trainings, summaries]);

  if (!user) return null;

  const count = trainings?.length;
  const withContent = rows.filter((r) => r.curriculum).length;
  return (
    <TrainingsShell>
      <div className="flex flex-col gap-8">
        <PageHeading
          title="Course content"
          description={`${count ?? "…"} course${count === 1 ? "" : "s"} · ${withContent} with a curriculum`}
        />

        {error && <FormError state={{ ok: false, message: error }} />}

        <Panel>
          {trainings && trainings.length === 0 ? (
            <AdminEmpty message="No courses yet. Create one under the Courses tab first." />
          ) : (
            <TableWrap>
              <thead>
                <tr>
                  <Th>Course</Th>
                  <Th>Modules</Th>
                  <Th>Items</Th>
                  <Th>Content length</Th>
                  <Th>Grade weight</Th>
                  <Th>Status</Th>
                  <Th className="text-right">Actions</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ training, curriculum }) => {
                  const status = curriculumStatus(curriculum);
                  return (
                    <tr key={training._id} className="hover:bg-[var(--surface-sunken)]">
                      <Td>
                        <Link
                          to={`/admin/trainings/content/${training._id}`}
                          className="font-medium text-[var(--text-primary)] hover:text-[var(--accent)]"
                        >
                          {training.title}
                        </Link>
                        <span className="block text-xs text-[var(--text-muted)]">
                          /{training.slug}
                        </span>
                      </Td>
                      <Td className="text-[var(--text-secondary)]">
                        {curriculum && curriculum.moduleCount > 0 ? (
                          curriculum.moduleCount
                        ) : (
                          <Badge tone="neutral">None</Badge>
                        )}
                      </Td>
                      <Td className="text-[var(--text-secondary)]">
                        {curriculum && curriculum.itemCount > 0 ? (
                          <>
                            {curriculum.itemCount}
                            <span className="block text-xs text-[var(--text-muted)]">
                              {curriculum.publishedItemCount} live
                            </span>
                          </>
                        ) : (
                          "—"
                        )}
                      </Td>
                      {/* Minutes, not hours — the brochure's durationHrs is a
                          different number measuring a different thing. */}
                      <Td className="text-[var(--text-secondary)]">
                        {formatMins(curriculum?.totalMins ?? 0)}
                      </Td>
                      <Td>
                        {curriculum && curriculum.gradeWeightTotal > 0 ? (
                          <Badge tone={curriculum.gradeWeightTotal === 100 ? "success" : "warn"}>
                            {curriculum.gradeWeightTotal}%
                          </Badge>
                        ) : (
                          <span className="text-[var(--text-secondary)]">—</span>
                        )}
                      </Td>
                      <Td>
                        <Badge tone={status.tone}>{status.label}</Badge>
                      </Td>
                      <Td>
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            to={`/admin/trainings/content/${training._id}`}
                            aria-label={`Build ${training.title}`}
                            className="grid h-8 w-8 place-items-center rounded-lg text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-sunken)] hover:text-[var(--accent)]"
                          >
                            <Icon name="layers" size={15} />
                          </Link>
                        </div>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </TableWrap>
          )}
        </Panel>
      </div>
    </TrainingsShell>
  );
}
