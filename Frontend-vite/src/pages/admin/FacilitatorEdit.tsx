import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { adminFetch } from "@/lib/adminFetch";
import { PageHeading } from "@/components/admin/AdminUI";
import { FacilitatorForm } from "@/components/admin/FacilitatorForm";
import TrainingsShell from "@/components/admin/TrainingsShell";
import { saveTrainer } from "@/adminActions";
import type { FormState } from "@/lib/form-state";
import type { TrainerDoc } from "@/lib/contentClient";

function toFormShape(t: TrainerDoc) {
  return {
    id: t._id,
    name: t.name,
    title: t.title,
    bio: t.bio,
    photo: t.photo,
    linkedin: t.linkedin,
  };
}

export default function FacilitatorEdit() {
  const { user } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  const [facilitator, setFacilitator] = useState<ReturnType<typeof toFormShape> | undefined>(undefined);
  const [loaded, setLoaded] = useState(!id);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await adminFetch(`${__API_URL__}/trainers/${id}`);
        if (res.ok && !cancelled) setFacilitator(toFormShape((await res.json()) as TrainerDoc));
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (!user) return null;

  const onSubmit = async (fd: FormData): Promise<FormState> => {
    const result = await saveTrainer(fd);
    if (result.ok) navigate("/admin/trainings/facilitators");
    return result;
  };

  return (
    <TrainingsShell>
      <div className="flex flex-col gap-8">
        <PageHeading
          title={id ? "Edit facilitator" : "New facilitator"}
          description={
            id
              ? "Changes show on their trainings as soon as you save."
              : "Once saved, they can be chosen as a training's facilitator."
          }
        />
        {loaded && <FacilitatorForm facilitator={facilitator} action={onSubmit} />}
      </div>
    </TrainingsShell>
  );
}
