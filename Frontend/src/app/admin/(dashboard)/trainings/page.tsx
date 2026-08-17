import Link from "next/link";
import { deleteTraining } from "@/app/admin/actions";
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
import { formatDuration, formatPrice } from "@/lib/utils";

export const metadata = { title: "Trainings" };

export default async function AdminTrainingsPage() {
  const trainings = await db.training.findMany({
    orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
    include: {
      trainer: { select: { name: true } },
      _count: { select: { registrations: true } },
    },
  });

  return (
    <>
      <PageHeading
        title="Trainings"
        description={`${trainings.length} programme${trainings.length === 1 ? "" : "s"}`}
        action={
          <ButtonLink href="/admin/trainings/new" size="sm">
            <Icon name="plus" size={16} />
            New training
          </ButtonLink>
        }
      />

      <Panel>
        {trainings.length === 0 ? (
          <AdminEmpty message="No trainings yet. Create your first one." />
        ) : (
          <TableWrap>
            <thead>
              <tr>
                <Th>Title</Th>
                <Th>Category</Th>
                <Th>Facilitator</Th>
                <Th>Duration</Th>
                <Th>Price</Th>
                <Th>Signups</Th>
                <Th>Status</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {trainings.map((t) => (
                <tr key={t.id} className="hover:bg-[var(--surface-sunken)]">
                  <Td>
                    <Link
                      href={`/admin/trainings/${t.id}`}
                      className="font-medium text-[var(--text-primary)] hover:text-[var(--accent)]"
                    >
                      {t.title}
                    </Link>
                    <span className="block text-xs text-[var(--text-muted)]">
                      /{t.slug}
                    </span>
                  </Td>
                  <Td>
                    <Badge tone="accent">{t.category}</Badge>
                  </Td>
                  <Td className="text-[var(--text-secondary)]">
                    {t.trainer?.name ?? "—"}
                  </Td>
                  <Td className="text-[var(--text-secondary)]">
                    {formatDuration(t.durationHrs)}
                  </Td>
                  <Td className="text-[var(--text-secondary)]">
                    {formatPrice(t.priceCents, t.currency)}
                  </Td>
                  <Td className="text-[var(--text-secondary)]">
                    {t._count.registrations}
                  </Td>
                  <Td>
                    <div className="flex flex-wrap gap-1">
                      <Badge tone={t.published ? "success" : "neutral"}>
                        {t.published ? "Live" : "Draft"}
                      </Badge>
                      {t.featured && <Badge tone="warn">Featured</Badge>}
                    </div>
                  </Td>
                  <Td>
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        href={`/trainings/${t.slug}`}
                        target="_blank"
                        aria-label={`Preview ${t.title}`}
                        className="grid h-8 w-8 place-items-center rounded-lg text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-sunken)] hover:text-[var(--accent)]"
                      >
                        <Icon name="external" size={15} />
                      </Link>
                      <Link
                        href={`/admin/trainings/${t.id}`}
                        aria-label={`Edit ${t.title}`}
                        className="grid h-8 w-8 place-items-center rounded-lg text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-sunken)] hover:text-[var(--accent)]"
                      >
                        <Icon name="pencil" size={15} />
                      </Link>
                      <DeleteButton
                        id={t.id}
                        action={deleteTraining}
                        label={t.title}
                      />
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        )}
      </Panel>
    </>
  );
}
