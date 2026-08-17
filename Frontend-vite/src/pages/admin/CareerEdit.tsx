import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { adminFetch } from "@/lib/adminFetch";
import { AdminShell } from "@/components/admin/AdminShell";
import { PageHeading } from "@/components/admin/AdminUI";
import { JobForm } from "@/components/admin/JobForm";
import { saveJob } from "@/adminActions";
import type { FormState } from "@/lib/form-state";
import type { JobDoc } from "@/lib/contentClient";

function toFormShape(j: JobDoc) {
  return {
    id: j._id,
    slug: j.slug,
    title: j.title,
    department: j.department,
    location: j.location,
    employment: j.employment,
    workMode: j.workMode,
    experience: j.experience,
    salaryMin: j.salaryMin,
    salaryMax: j.salaryMax,
    summary: j.summary,
    description: j.description,
    requirements: JSON.stringify(j.requirements ?? []),
    benefits: JSON.stringify(j.benefits ?? []),
    published: j.published,
    closesAt: j.closesAt ? new Date(j.closesAt) : null,
  };
}

export default function CareerEdit() {
  const { user } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState<ReturnType<typeof toFormShape> | undefined>(undefined);
  const [loaded, setLoaded] = useState(!id);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await adminFetch(`${__API_URL__}/careers/jobs/id/${id}`);
        if (res.ok && !cancelled) setJob(toFormShape((await res.json()) as JobDoc));
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
    const result = await saveJob(fd);
    if (result.ok) navigate("/admin/careers");
    return result;
  };

  return (
    <AdminShell
      user={{ name: user.name, email: user.email, role: user.role }}
      counts={{ registrations: 0, enquiries: 0, applications: 0, messages: 0 }}
    >
      <div className="flex flex-col gap-8">
        <PageHeading
          title={id ? "Edit posting" : "New posting"}
          description={id ? "Changes go live as soon as you save." : "Create a new job posting."}
        />
        {loaded && <JobForm job={job} action={onSubmit} />}
      </div>
    </AdminShell>
  );
}
