import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { adminFetch } from "@/lib/adminFetch";
import { AdminEmpty, PageHeading, Panel, TableWrap, Td, Th } from "@/components/admin/AdminUI";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { deleteService } from "@/adminActions";
import type { ServiceDoc } from "@/lib/contentClient";

export default function ConsultancyList() {
  const { user } = useAuth();
  const [services, setServices] = useState<ServiceDoc[] | null>(null);

  const load = useCallback(async () => {
    const res = await adminFetch(`${__API_URL__}/consultancy-services/admin`);
    if (res.ok) setServices((await res.json()) as ServiceDoc[]);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function remove(id: string) {
    await deleteService(id);
    await load();
  }

  if (!user) return null;

  return (
      <div className="flex flex-col gap-8">
        <PageHeading
          title="Consultancy"
          description={`${services?.length ?? "…"} service${services?.length === 1 ? "" : "s"}`}
          action={
            <ButtonLink to="/admin/consultancy/new" size="sm">
              <Icon name="plus" size={16} />
              New service
            </ButtonLink>
          }
        />

        <Panel>
          {services && services.length === 0 ? (
            <AdminEmpty message="No consultancy services yet. Create your first one." />
          ) : (
            <TableWrap>
              <thead>
                <tr>
                  <Th>Service</Th>
                  <Th>Engagement</Th>
                  <Th>Status</Th>
                  <Th className="text-right">Actions</Th>
                </tr>
              </thead>
              <tbody>
                {(services ?? []).map((s) => (
                  <tr key={s._id} className="hover:bg-[var(--surface-sunken)]">
                    <Td>
                      <Link
                        to={`/admin/consultancy/${s._id}`}
                        className="font-medium text-[var(--text-primary)] hover:text-[var(--accent)]"
                      >
                        {s.title}
                      </Link>
                      <span className="block text-xs text-[var(--text-muted)]">/{s.slug}</span>
                    </Td>
                    <Td className="text-[var(--text-secondary)]">{s.engagement}</Td>
                    <Td>
                      <Badge tone={s.published ? "success" : "neutral"}>
                        {s.published ? "Live" : "Draft"}
                      </Badge>
                    </Td>
                    <Td>
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          to={`/consultancy/${s.slug}`}
                          target="_blank"
                          aria-label={`Preview ${s.title}`}
                          className="grid h-8 w-8 place-items-center rounded-lg text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-sunken)] hover:text-[var(--accent)]"
                        >
                          <Icon name="external" size={15} />
                        </Link>
                        <Link
                          to={`/admin/consultancy/${s._id}`}
                          aria-label={`Edit ${s.title}`}
                          className="grid h-8 w-8 place-items-center rounded-lg text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-sunken)] hover:text-[var(--accent)]"
                        >
                          <Icon name="pencil" size={15} />
                        </Link>
                        <DeleteButton id={s._id} action={remove} label={s.title} />
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </TableWrap>
          )}
        </Panel>
      </div>
  );
}
