import Link from "next/link";
import { deleteService } from "@/app/admin/actions";
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

export const metadata = { title: "Consultancy" };

export default async function AdminConsultancyPage() {
  const services = await db.consultancyService.findMany({
    orderBy: { sortOrder: "asc" },
    include: { _count: { select: { enquiries: true } } },
  });

  return (
    <>
      <PageHeading
        title="Consultancy services"
        description={`${services.length} service${services.length === 1 ? "" : "s"}`}
        action={
          <ButtonLink href="/admin/consultancy/new" size="sm">
            <Icon name="plus" size={16} />
            New service
          </ButtonLink>
        }
      />

      <Panel>
        {services.length === 0 ? (
          <AdminEmpty message="No services yet. Create your first one." />
        ) : (
          <TableWrap>
            <thead>
              <tr>
                <Th>Service</Th>
                <Th>Engagement</Th>
                <Th>Enquiries</Th>
                <Th>Order</Th>
                <Th>Status</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {services.map((s) => (
                <tr key={s.id} className="hover:bg-[var(--surface-sunken)]">
                  <Td>
                    <Link
                      href={`/admin/consultancy/${s.id}`}
                      className="font-medium text-[var(--text-primary)] hover:text-[var(--accent)]"
                    >
                      {s.title}
                    </Link>
                    <span className="block max-w-md truncate text-xs text-[var(--text-muted)]">
                      {s.summary}
                    </span>
                  </Td>
                  <Td>
                    <Badge tone="accent">{s.engagement}</Badge>
                  </Td>
                  <Td className="text-[var(--text-secondary)]">{s._count.enquiries}</Td>
                  <Td className="text-[var(--text-secondary)]">{s.sortOrder}</Td>
                  <Td>
                    <Badge tone={s.published ? "success" : "neutral"}>
                      {s.published ? "Live" : "Draft"}
                    </Badge>
                  </Td>
                  <Td>
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        href={`/consultancy/${s.slug}`}
                        target="_blank"
                        aria-label={`Preview ${s.title}`}
                        className="grid h-8 w-8 place-items-center rounded-lg text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-sunken)] hover:text-[var(--accent)]"
                      >
                        <Icon name="external" size={15} />
                      </Link>
                      <Link
                        href={`/admin/consultancy/${s.id}`}
                        aria-label={`Edit ${s.title}`}
                        className="grid h-8 w-8 place-items-center rounded-lg text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-sunken)] hover:text-[var(--accent)]"
                      >
                        <Icon name="pencil" size={15} />
                      </Link>
                      <DeleteButton id={s.id} action={deleteService} label={s.title} />
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
