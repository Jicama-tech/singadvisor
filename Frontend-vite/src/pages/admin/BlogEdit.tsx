import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { adminFetch } from "@/lib/adminFetch";
import { PostForm } from "@/components/admin/PostForm";
import { savePost } from "@/adminActions";
import type { FormState } from "@/lib/form-state";
import type { PostDoc } from "@/lib/contentClient";

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
    listedOnBlog: p.listedOnBlog,
    publishedAt: p.publishedAt ? new Date(p.publishedAt) : null,
    writtenByName: p.writtenByName ?? "",
    writtenByPosition: p.writtenByPosition ?? "",
  };
}

export default function BlogEdit() {
  const { user } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState<ReturnType<typeof toFormShape> | undefined>(undefined);
  const [loaded, setLoaded] = useState(!id);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await adminFetch(`${__API_URL__}/blog/id/${id}`);
        if (res.ok) {
          const doc = (await res.json()) as PostDoc;
          if (!cancelled) setPost(toFormShape(doc));
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
    const result = await savePost(fd);
    if (result.ok) navigate("/admin/blog");
    return result;
  };

  return (
    loaded && (
      <PostForm
        post={post}
        title={id ? "Edit post" : "New post"}
        description={id ? "Changes go live as soon as you save." : "Write a new article."}
        action={onSubmit}
      />
    )
  );
}
