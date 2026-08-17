import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { adminFetch } from "@/lib/adminFetch";
import { AdminShell } from "@/components/admin/AdminShell";
import { PageHeading } from "@/components/admin/AdminUI";
import { TrainingForm } from "@/components/admin/TrainingForm";
import { saveTraining } from "@/adminActions";
import type { FormState } from "@/lib/form-state";
import type { TrainingDoc, TrainerDoc } from "@/lib/contentClient";

/** Maps the Mongo document into the shape TrainingForm expects (its `id`
 * field and JSON-encoded list strings mirror the old Prisma rows the form
 * was written against). */
function toFormShape(t: TrainingDoc) {
  return {
    id: t._id,
    slug: t.slug,
    title: t.title,
    summary: t.summary,
    description: t.description,
    image: t.image,
    category: t.category,
    level: t.level,
    durationHrs: t.durationHrs,
    format: t.format,
    priceCents: t.priceCents,
    outcomes: JSON.stringify(t.outcomes ?? []),
    modules: JSON.stringify(t.modules ?? []),
    published: t.published,
    featured: t.featured,
    sortOrder: t.sortOrder,
    trainerId: t.trainerId ? String(t.trainerId) : null,
  };
}

export default function TrainingEdit() {
  const { user } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  const [training, setTraining] = useState<ReturnType<typeof toFormShape> | undefined>(undefined);
  const [trainers, setTrainers] = useState<{ id: string; name: string }[]>([]);
  const [loaded, setLoaded] = useState(!id);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const trainerRes = await adminFetch(`${__API_URL__}/trainers`);
        const trainerRows: TrainerDoc[] = trainerRes.ok ? await trainerRes.json() : [];
        const trainerList = trainerRows.map((t) => ({ id: t._id, name: t.name }));
        let doc: TrainingDoc | undefined;
        if (id) {
          const res = await adminFetch(`${__API_URL__}/trainings/id/${id}`);
          if (res.ok) doc = (await res.json()) as TrainingDoc;
        }
        if (cancelled) return;
        setTrainers(trainerList);
        if (doc) setTraining(toFormShape(doc));
        setLoaded(true);
      } catch {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (!user) return null;

  const onSubmit = async (fd: FormData): Promise<FormState> => {
    const result = await saveTraining(fd);
    if (result.ok) navigate("/admin/trainings");
    return result;
  };

  return (
    <AdminShell
      user={{ name: user.name, email: user.email, role: user.role }}
      counts={{ registrations: 0, enquiries: 0, applications: 0, messages: 0 }}
    >
      <div className="flex flex-col gap-8">
        <PageHeading
          title={id ? "Edit training" : "New training"}
          description={id ? "Changes go live as soon as you save." : "Create a new programme."}
        />
        {loaded && <TrainingForm training={training} trainers={trainers} action={onSubmit} />}
      </div>
    </AdminShell>
  );
}
