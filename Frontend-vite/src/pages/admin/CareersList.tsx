import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { adminFetch } from "@/lib/adminFetch";
import { AdminEmpty, PageHeading, Panel, TableWrap, Td, Th } from "@/components/admin/AdminUI";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { deleteJob } from "@/adminActions";
import { formatDate, formatSalaryRange } from "@/lib/utils";
import type { JobDoc } from "@/lib/contentClient";

type AdminJob = JobDoc & { applicationCount?: number };

export default function CareersList() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<AdminJob[] | null>(null);

  const load = useCallback(async () => {
    const res = await adminFetch(`${__API_URL__}/careers/jobs/admin`);
    if (res.ok) setJobs((await res.json()) as AdminJob[]);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function remove(id: string) {
    await deleteJob(id);
    await load();
  }

  if (!user) return null;

  return (
      <div className="flex flex-col gap-8">
        <PageHeading
          title="Job postings"
          description={`${jobs?.length ?? "…"} posting${jobs?.length === 1 ? "" : "s"}`}
          action={
            <ButtonLink to="/admin/careers/new" size="sm">
              <Icon name="plus" size={16} />
              New posting
            </ButtonLink>
          }
        />

        <Panel>
          {jobs && jobs.length === 0 ? (
            <AdminEmpty message="No job postings yet. Create your first one." />
          ) : (
            <TableWrap>
              <thead>
                <tr>
                  <Th>Role</Th>
                  <Th>Department</Th>
                  <Th>Type</Th>
                  <Th>Salary</Th>
                  <Th>Applicants</Th>
                  <Th>Closes</Th>
                  <Th>Status</Th>
                  <Th className="text-right">Actions</Th>
                </tr>
              </thead>
              <tbody>
                {(jobs ?? []).map((j) => {
                  const closed = !!j.closesAt && new Date(j.closesAt) < new Date();
                  const salary = formatSalaryRange(j.salaryMin, j.salaryMax, j.currency);
                  return (
                    <tr key={j._id} className="hover:bg-[var(--surface-sunken)]">
                      <Td>
                        <Link
                          to={`/admin/careers/${j._id}`}
                          className="font-medium text-[var(--text-primary)] hover:text-[var(--accent)]"
                        >
                          {j.title}
                        </Link>
                        <span className="block text-xs text-[var(--text-muted)]">
                          {j.location} · {j.workMode}
                        </span>
                      </Td>
                      <Td>
                        <Badge tone="accent">{j.department}</Badge>
                      </Td>
                      <Td className="text-[var(--text-secondary)]">{j.employment}</Td>
                      <Td className="whitespace-nowrap text-[var(--text-secondary)]">
                        {salary ?? "—"}
                      </Td>
                      <Td>
                        {(j.applicationCount ?? 0) > 0 ? (
                          <Link
                            to={`/admin/applications?job=${j._id}`}
                            className="font-medium text-[var(--accent)] hover:underline"
                          >
                            {j.applicationCount}
                          </Link>
                        ) : (
                          <span className="text-[var(--text-muted)]">0</span>
                        )}
                      </Td>
                      <Td className="whitespace-nowrap text-[var(--text-secondary)]">
                        {j.closesAt ? formatDate(j.closesAt) : "Open"}
                      </Td>
                      <Td>
                        <div className="flex flex-wrap gap-1">
                          <Badge tone={j.published ? "success" : "neutral"}>
                            {j.published ? "Live" : "Draft"}
                          </Badge>
                          {closed && <Badge tone="danger">Closed</Badge>}
                        </div>
                      </Td>
                      <Td>
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            to={`/careers/${j.slug}`}
                            target="_blank"
                            aria-label={`Preview ${j.title}`}
                            className="grid h-8 w-8 place-items-center rounded-lg text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-sunken)] hover:text-[var(--accent)]"
                          >
                            <Icon name="external" size={15} />
                          </Link>
                          <Link
                            to={`/admin/careers/${j._id}`}
                            aria-label={`Edit ${j.title}`}
                            className="grid h-8 w-8 place-items-center rounded-lg text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-sunken)] hover:text-[var(--accent)]"
                          >
                            <Icon name="pencil" size={15} />
                          </Link>
                          <DeleteButton id={j._id} action={remove} label={j.title} />
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
  );
}
