import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { adminFetch } from "@/lib/adminFetch";
import { AdminEmpty, PageHeading, Panel, TableWrap, Td, Th } from "@/components/admin/AdminUI";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { deleteTraining } from "@/adminActions";
import { formatDuration, formatPrice } from "@/lib/utils";

type AdminTraining = {
  _id: string;
  slug: string;
  title: string;
  category: string;
  durationHrs: number;
  priceCents: number;
  currency: string;
  published: boolean;
  featured: boolean;
  // After the Backend's populate, `trainerId` carries the trainer object
  // itself (the field keeps its own name) — it is NOT moved to `trainer`.
  trainerId?: { _id: string; name: string } | null;
  registrationCount?: number;
};

export default function TrainingsList() {
  const { user } = useAuth();
  const [trainings, setTrainings] = useState<AdminTraining[] | null>(null);

  const load = useCallback(async () => {
    const res = await adminFetch(`${__API_URL__}/trainings/admin`);
    if (res.ok) setTrainings((await res.json()) as AdminTraining[]);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function remove(id: string) {
    await deleteTraining(id);
    await load();
  }

  if (!user) return null;

  return (
      <div className="flex flex-col gap-8">
        <PageHeading
          title="Trainings"
          description={`${trainings?.length ?? "…"} programme${trainings?.length === 1 ? "" : "s"}`}
          action={
            <ButtonLink to="/admin/trainings/new" size="sm">
              <Icon name="plus" size={16} />
              New training
            </ButtonLink>
          }
        />

        <Panel>
          {trainings && trainings.length === 0 ? (
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
                {(trainings ?? []).map((t) => (
                  <tr key={t._id} className="hover:bg-[var(--surface-sunken)]">
                    <Td>
                      <Link
                        to={`/admin/trainings/${t._id}`}
                        className="font-medium text-[var(--text-primary)] hover:text-[var(--accent)]"
                      >
                        {t.title}
                      </Link>
                      <span className="block text-xs text-[var(--text-muted)]">/{t.slug}</span>
                    </Td>
                    <Td>
                      <Badge tone="accent">{t.category}</Badge>
                    </Td>
                    <Td className="text-[var(--text-secondary)]">{t.trainerId?.name ?? "—"}</Td>
                    <Td className="text-[var(--text-secondary)]">{formatDuration(t.durationHrs)}</Td>
                    <Td className="text-[var(--text-secondary)]">{formatPrice(t.priceCents, t.currency)}</Td>
                    <Td className="text-[var(--text-secondary)]">{t.registrationCount ?? 0}</Td>
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
                          to={`/trainings/${t.slug}`}
                          target="_blank"
                          aria-label={`Preview ${t.title}`}
                          className="grid h-8 w-8 place-items-center rounded-lg text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-sunken)] hover:text-[var(--accent)]"
                        >
                          <Icon name="external" size={15} />
                        </Link>
                        <Link
                          to={`/admin/trainings/${t._id}`}
                          aria-label={`Edit ${t.title}`}
                          className="grid h-8 w-8 place-items-center rounded-lg text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-sunken)] hover:text-[var(--accent)]"
                        >
                          <Icon name="pencil" size={15} />
                        </Link>
                        <DeleteButton id={t._id} action={remove} label={t.title} />
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
