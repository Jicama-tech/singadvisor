import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { adminFetch } from "@/lib/adminFetch";
import { NewsletterForm } from "@/components/admin/NewsletterForm";
import { saveNewsletter } from "@/adminActions";
import type { FormState } from "@/lib/form-state";
import type { NewsletterDoc } from "@/lib/contentClient";

function toFormShape(n: NewsletterDoc) {
  return {
    id: n._id,
    title: n.title,
    image: n.image,
    imageAlt: n.imageAlt,
    message: n.message,
    referenceLink: n.referenceLink,
    published: n.published,
  };
}

export default function NewsletterEdit() {
  const { user } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState<ReturnType<typeof toFormShape> | undefined>(undefined);
  const [loaded, setLoaded] = useState(!id);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await adminFetch(`${__API_URL__}/newsletter/admin/${id}`);
        if (res.ok) {
          const doc = (await res.json()) as NewsletterDoc;
          if (!cancelled) setItem(toFormShape(doc));
        }
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
    const result = await saveNewsletter(fd);
    if (result.ok) navigate("/admin/newsletter");
    return result;
  };

  return (
    loaded && (
      <NewsletterForm
        newsletter={item}
        title={id ? "Edit newsletter issue" : "New newsletter issue"}
        description={id ? "Changes go live as soon as you save." : "Write a new issue."}
        action={onSubmit}
      />
    )
  );
}
