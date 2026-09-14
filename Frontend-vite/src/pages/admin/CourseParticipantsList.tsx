import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { AdminEmpty, PageHeading, Panel, TableWrap, Td, Th } from "@/components/admin/AdminUI";
import TrainingsShell from "@/components/admin/TrainingsShell";
import { FormError } from "@/components/forms/FormShell";
import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
import { fetchParticipantCourses, type ParticipantCourseRow } from "@/lib/participantsClient";
import { formatDate } from "@/lib/utils";
import { publicUrl } from "@/lib/publicUrl";

/**
 * /admin/trainings/participants — pick a course, then read its people.
 *
 * Every course is listed, including the ones nobody has signed up for: this
 * screen exists to be picked from, and "nobody has enquired yet" has to look
 * different from "that course isn't here". The Courses tab one along already
 * lists all of them, so a list that shrank would also make the two tabs
 * disagree about what exists.
 */

/** 0 is a real answer on this screen and never a missing one — but a grid of
 * zeros is harder to read than a grid of dashes with the live numbers standing
 * out of it. */
function count(n: number): ReactNode {
  return n > 0 ? n : <span className="text-[var(--text-muted)]">—</span>;
}

export default function CourseParticipantsList() {
  const { user } = useAuth();
  const [courses, setCourses] = useState<ParticipantCourseRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setCourses(await fetchParticipantCourses());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load the participants.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (!user) return null;

  const rows = courses ?? [];
  // Summed from the rows rather than asked for separately, so the heading and
  // the table can never disagree. People, not records — each row already counts
  // one person once.
  const people = rows.reduce((total, c) => total + c.participantCount, 0);
  const awaiting = rows.reduce((total, c) => total + c.awaitingPaymentCount, 0);
  const courseCount = `${rows.length} course${rows.length === 1 ? "" : "s"}`;

  return (
    <TrainingsShell>
      <div className="flex flex-col gap-8">
        <PageHeading
          title="Participants"
          description={
            courses === null
              ? "…"
              : people === 0
                ? // The honest reading of an empty database: the courses are
                  // real, the silence is real, and neither is an error.
                  `${courseCount} · nobody has signed up yet`
                : `${courseCount} · ${people} participant${people === 1 ? "" : "s"}` +
                  (awaiting > 0 ? ` · ${awaiting} awaiting payment` : "")
          }
        />

        {error && <FormError state={{ ok: false, message: error }} />}

        <Panel>
          {courses && courses.length === 0 ? (
            <AdminEmpty message="No courses yet. Create one under the Courses tab first." />
          ) : (
            <TableWrap>
              <thead>
                <tr>
                  <Th>Course</Th>
                  <Th>Participants</Th>
                  <Th>Enquired</Th>
                  <Th>Enrolled</Th>
                  <Th>Holding a place</Th>
                  <Th>Awaiting payment</Th>
                  <Th>Last activity</Th>
                  <Th className="text-right">Actions</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => (
                  <tr key={c.trainingId} className="hover:bg-[var(--surface-sunken)]">
                    <Td>
                      <Link
                        to={`/admin/trainings/participants/${c.trainingId}`}
                        className="font-medium text-[var(--text-primary)] hover:text-[var(--accent)]"
                      >
                        {c.title}
                      </Link>
                      {/* A null slug means the training was hard-deleted and its
                          registrations outlived it. The people are still real,
                          so the row stays — there is just no course page left
                          behind the name. */}
                      <span className="block text-xs text-[var(--text-muted)]">
                        {c.slug
                          ? publicUrl("trainings", c.slug)
                          : "Course deleted — these people are still on file"}
                      </span>
                    </Td>
                    <Td className="text-[var(--text-secondary)]">{count(c.participantCount)}</Td>
                    <Td className="text-[var(--text-secondary)]">{count(c.enquiredCount)}</Td>
                    <Td className="text-[var(--text-secondary)]">{count(c.enrolledCount)}</Td>
                    <Td className="text-[var(--text-secondary)]">{count(c.confirmedCount)}</Td>
                    {/* The one number worth a badge: it is a queue of bank
                        statements somebody has to go and read, not a statistic. */}
                    <Td>
                      {c.awaitingPaymentCount > 0 ? (
                        <Badge tone="warn">{c.awaitingPaymentCount}</Badge>
                      ) : (
                        <span className="text-[var(--text-muted)]">—</span>
                      )}
                    </Td>
                    <Td className="whitespace-nowrap text-[var(--text-secondary)]">
                      {c.lastActivityAt ? (
                        formatDate(c.lastActivityAt)
                      ) : (
                        <span className="text-[var(--text-muted)]">—</span>
                      )}
                    </Td>
                    <Td>
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          to={`/admin/trainings/participants/${c.trainingId}`}
                          aria-label={`View the participants on ${c.title}`}
                          className="grid h-8 w-8 place-items-center rounded-lg text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-sunken)] hover:text-[var(--accent)]"
                        >
                          <Icon name="arrow-right" size={15} />
                        </Link>
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </TableWrap>
          )}
        </Panel>
      </div>
    </TrainingsShell>
  );
}
