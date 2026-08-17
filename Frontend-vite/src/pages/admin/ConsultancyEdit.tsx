import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { adminFetch } from "@/lib/adminFetch";
import { PageHeading } from "@/components/admin/AdminUI";
import { ServiceForm } from "@/components/admin/ServiceForm";
import { saveService } from "@/adminActions";
import type { FormState } from "@/lib/form-state";
import type { ServiceDoc } from "@/lib/contentClient";

function toFormShape(s: ServiceDoc) {
  return {
    id: s._id,
    slug: s.slug,
    title: s.title,
    summary: s.summary,
    description: s.description,
    image: s.image,
    icon: s.icon,
    engagement: s.engagement,
    deliverables: JSON.stringify(s.deliverables ?? []),
    idealFor: JSON.stringify(s.idealFor ?? []),
    published: s.published,
    sortOrder: s.sortOrder,
  };
}

export default function ConsultancyEdit() {
  const { user } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  const [service, setService] = useState<ReturnType<typeof toFormShape> | undefined>(undefined);
  const [loaded, setLoaded] = useState(!id);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await adminFetch(`${__API_URL__}/consultancy-services/id/${id}`);
        if (res.ok && !cancelled) setService(toFormShape((await res.json()) as ServiceDoc));
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
    const result = await saveService(fd);
    if (result.ok) navigate("/admin/consultancy");
    return result;
  };

  return (
      <div className="flex flex-col gap-8">
        <PageHeading
          title={id ? "Edit service" : "New service"}
          description={id ? "Changes go live as soon as you save." : "Create a new consultancy service."}
        />
        {loaded && <ServiceForm service={service} action={onSubmit} />}
      </div>
  );
}
