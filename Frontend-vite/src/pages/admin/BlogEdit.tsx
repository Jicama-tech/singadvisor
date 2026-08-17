import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { adminFetch } from "@/lib/adminFetch";
import { AdminShell } from "@/components/admin/AdminShell";
import { PageHeading } from "@/components/admin/AdminUI";
import { PostForm } from "@/components/admin/PostForm";
import { savePost } from "@/adminActions";
import type { FormState } from "@/lib/form-state";
import type { PostDoc, TrainerDoc } from "@/lib/contentClient";

function toFormShape(p: PostDoc) {
  return {
    id: p._id,
    slug: p.slug,
    title: p.title,
    excerpt: p.excerpt,
    content: p.content,
    coverImage: p.coverImage,
    category: p.category,
    tags: JSON.stringify(p.tags ?? []),
    published: p.published,
    featured: p.featured,
    publishedAt: p.publishedAt ? new Date(p.publishedAt) : null,
    authorId: p.authorId ? String(p.authorId) : null,
  };
}

export default function BlogEdit() {
  const { user } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState<ReturnType<typeof toFormShape> | undefined>(undefined);
  const [authors, setAuthors] = useState<{ id: string; name: string }[]>([]);
  const [loaded, setLoaded] = useState(!id);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const trainerRes = await adminFetch(`${__API_URL__}/trainers`);
        const trainerRows: TrainerDoc[] = trainerRes.ok ? await trainerRes.json() : [];
        let doc: PostDoc | undefined;
        if (id) {
          const res = await adminFetch(`${__API_URL__}/blog/id/${id}`);
          if (res.ok) doc = (await res.json()) as PostDoc;
        }
        if (cancelled) return;
        setAuthors(trainerRows.map((t) => ({ id: t._id, name: t.name })));
        if (doc) setPost(toFormShape(doc));
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
    const result = await savePost(fd);
    if (result.ok) navigate("/admin/blog");
    return result;
  };

  return (
    <AdminShell
      user={{ name: user.name, email: user.email, role: user.role }}
      counts={{ registrations: 0, enquiries: 0, applications: 0, messages: 0 }}
    >
      <div className="flex flex-col gap-8">
        <PageHeading
          title={id ? "Edit post" : "New post"}
          description={id ? "Changes go live as soon as you save." : "Write a new article."}
        />
        {loaded && <PostForm post={post} authors={authors} action={onSubmit} />}
      </div>
    </AdminShell>
  );
}
