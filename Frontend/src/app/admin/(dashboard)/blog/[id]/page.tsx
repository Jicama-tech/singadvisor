import { notFound } from "next/navigation";
import { PageHeading } from "@/components/admin/AdminUI";
import { PostForm } from "@/components/admin/PostForm";
import { db } from "@/lib/db";

export const metadata = { title: "Edit article" };

export default async function EditPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [post, authors] = await Promise.all([
    db.blogPost.findUnique({ where: { id } }),
    db.trainer.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  if (!post) notFound();

  return (
    <>
      <PageHeading title={post.title} description={`/blog/${post.slug}`} />
      <PostForm post={post} authors={authors} />
    </>
  );
}
