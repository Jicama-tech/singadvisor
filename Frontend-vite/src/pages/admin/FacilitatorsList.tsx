import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { adminFetch } from "@/lib/adminFetch";
import { AdminEmpty, PageHeading, Panel, TableWrap, Td, Th } from "@/components/admin/AdminUI";
import { DeleteButton } from "@/components/admin/DeleteButton";
import TrainingsShell from "@/components/admin/TrainingsShell";
import { FormError } from "@/components/forms/FormShell";
import { AppImage as Image } from "@/components/ui/AppImage";
import { ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { deleteTrainer } from "@/adminActions";
import { withBackendUrl } from "@/lib/media-url";
import type { TrainerDoc } from "@/lib/contentClient";

const initials = (name: string) =>
  name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

export default function FacilitatorsList() {
  const { user } = useAuth();
  const [facilitators, setFacilitators] = useState<TrainerDoc[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await adminFetch(`${__API_URL__}/trainers`);
    if (res.ok) setFacilitators((await res.json()) as TrainerDoc[]);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function remove(id: string) {
    setError(null);
    try {
      await deleteTrainer(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete the facilitator.");
    }
    await load();
  }

  if (!user) return null;

  const count = facilitators?.length;
  return (
    <TrainingsShell>
      <div className="flex flex-col gap-8">
        <PageHeading
          title="Facilitators"
          description={`${count ?? "…"} facilitator${count === 1 ? "" : "s"} · chosen on each training's Facilitator field`}
          action={
            <ButtonLink to="/admin/trainings/facilitators/new" size="sm">
              <Icon name="plus" size={16} />
              New facilitator
            </ButtonLink>
          }
        />

        {error && <FormError state={{ ok: false, message: error }} />}

        <Panel>
          {facilitators && facilitators.length === 0 ? (
            <AdminEmpty message="No facilitators yet. Add the first one." />
          ) : (
            <TableWrap>
              <thead>
                <tr>
                  <Th>Facilitator</Th>
                  <Th>Trainings</Th>
                  <Th>Blog posts</Th>
                  <Th className="text-right">Actions</Th>
                </tr>
              </thead>
              <tbody>
                {(facilitators ?? []).map((f) => (
                  <tr key={f._id} className="hover:bg-[var(--surface-sunken)]">
                    <Td>
                      <div className="flex items-center gap-3">
                        <span className="relative grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-[var(--accent-soft)] text-xs font-semibold text-[var(--accent-on-soft)]">
                          {f.photo ? (
                            <Image src={withBackendUrl(f.photo)} alt="" fill className="object-cover" />
                          ) : (
                            initials(f.name)
                          )}
                        </span>
                        <span className="min-w-0">
                          <Link
                            to={`/admin/trainings/facilitators/${f._id}`}
                            className="font-medium text-[var(--text-primary)] hover:text-[var(--accent)]"
                          >
                            {f.name}
                          </Link>
                          {f.title && (
                            <span className="block text-xs text-[var(--text-muted)]">{f.title}</span>
                          )}
                        </span>
                      </div>
                    </Td>
                    <Td className="text-[var(--text-secondary)]">{f.trainingCount ?? 0}</Td>
                    <Td className="text-[var(--text-secondary)]">{f.postCount ?? 0}</Td>
                    <Td>
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          to={`/admin/trainings/facilitators/${f._id}`}
                          aria-label={`Edit ${f.name}`}
                          className="grid h-8 w-8 place-items-center rounded-lg text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-sunken)] hover:text-[var(--accent)]"
                        >
                          <Icon name="pencil" size={15} />
                        </Link>
                        <DeleteButton
                          id={f._id}
                          action={remove}
                          label={f.name}
                          consequence="Only possible once no training, course run or blog post names them. This cannot be undone."
                        />
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
