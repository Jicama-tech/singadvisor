import Link from "next/link";
import { deleteJob } from "@/app/admin/actions";
import {
  AdminEmpty,
  PageHeading,
  Panel,
  TableWrap,
  Td,
  Th,
} from "@/components/admin/AdminUI";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { db } from "@/lib/db";
import { formatDate, formatSalaryRange } from "@/lib/utils";

export const metadata = { title: "Careers" };

export default async function AdminCareersPage() {
  const jobs = await db.jobPosting.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { applications: true } } },
  });

  return (
    <>
      <PageHeading
        title="Job postings"
        description={`${jobs.length} posting${jobs.length === 1 ? "" : "s"}`}
        action={
          <ButtonLink href="/admin/careers/new" size="sm">
            <Icon name="plus" size={16} />
            New posting
          </ButtonLink>
        }
      />

      <Panel>
        {jobs.length === 0 ? (
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
              {jobs.map((j) => {
                const closed = !!j.closesAt && j.closesAt < new Date();
                const salary = formatSalaryRange(j.salaryMin, j.salaryMax, j.currency);

                return (
                  <tr key={j.id} className="hover:bg-[var(--surface-sunken)]">
                    <Td>
                      <Link
                        href={`/admin/careers/${j.id}`}
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
                      {j._count.applications > 0 ? (
                        <Link
                          href={`/admin/applications?job=${j.id}`}
                          className="font-medium text-[var(--accent)] hover:underline"
                        >
                          {j._count.applications}
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
                          href={`/careers/${j.slug}`}
                          target="_blank"
                          aria-label={`Preview ${j.title}`}
                          className="grid h-8 w-8 place-items-center rounded-lg text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-sunken)] hover:text-[var(--accent)]"
                        >
                          <Icon name="external" size={15} />
                        </Link>
                        <Link
                          href={`/admin/careers/${j.id}`}
                          aria-label={`Edit ${j.title}`}
                          className="grid h-8 w-8 place-items-center rounded-lg text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-sunken)] hover:text-[var(--accent)]"
                        >
                          <Icon name="pencil" size={15} />
                        </Link>
                        <DeleteButton id={j.id} action={deleteJob} label={j.title} />
                      </div>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </TableWrap>
        )}
      </Panel>
    </>
  );
}
