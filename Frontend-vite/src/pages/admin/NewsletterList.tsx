import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { adminFetch } from "@/lib/adminFetch";
import { AdminEmpty, PageHeading, Panel, TableWrap, Td, Th } from "@/components/admin/AdminUI";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { deleteNewsletter } from "@/adminActions";
import { formatDate } from "@/lib/utils";
import type { NewsletterDoc } from "@/lib/contentClient";

export default function NewsletterList() {
  const { user } = useAuth();
  const [items, setItems] = useState<NewsletterDoc[] | null>(null);

  const load = useCallback(async () => {
    const res = await adminFetch(`${__API_URL__}/newsletter/admin`);
    if (res.ok) setItems((await res.json()) as NewsletterDoc[]);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function remove(id: string) {
    await deleteNewsletter(id);
    await load();
  }

  if (!user) return null;

  return (
    <div className="flex flex-col gap-8">
      <PageHeading
        title="Newsletter"
        description={`${items?.length ?? "…"} issue${items?.length === 1 ? "" : "s"}`}
        action={
          <ButtonLink to="/admin/newsletter/new" size="sm">
            <Icon name="plus" size={16} />
            New issue
          </ButtonLink>
        }
      />

      <Panel>
        {items && items.length === 0 ? (
          <AdminEmpty message="No newsletter issues yet. Write your first one." />
        ) : (
          <TableWrap>
            <thead>
              <tr>
                <Th>Title</Th>
                <Th>Created</Th>
                <Th>Status</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {(items ?? []).map((n) => (
                <tr key={n._id} className="hover:bg-[var(--surface-sunken)]">
                  <Td>
                    <Link
                      to={`/admin/newsletter/${n._id}`}
                      className="font-medium text-[var(--text-primary)] hover:text-[var(--accent)]"
                    >
                      {n.title}
                    </Link>
                  </Td>
                  <Td className="text-[var(--text-secondary)]">{formatDate(n.createdAt)}</Td>
                  <Td>
                    <Badge tone={n.published ? "success" : "neutral"}>
                      {n.published ? "Live" : "Draft"}
                    </Badge>
                  </Td>
                  <Td>
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        to={`/newsletter/${n._id}`}
                        target="_blank"
                        aria-label={`Preview ${n.title}`}
                        className="grid h-8 w-8 place-items-center rounded-lg text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-sunken)] hover:text-[var(--accent)]"
                      >
                        <Icon name="external" size={15} />
                      </Link>
                      <Link
                        to={`/admin/newsletter/${n._id}`}
                        aria-label={`Edit ${n.title}`}
                        className="grid h-8 w-8 place-items-center rounded-lg text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-sunken)] hover:text-[var(--accent)]"
                      >
                        <Icon name="pencil" size={15} />
                      </Link>
                      <DeleteButton id={n._id} action={remove} label={n.title} />
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
