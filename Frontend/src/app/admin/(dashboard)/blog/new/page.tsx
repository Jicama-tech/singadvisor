import { PageHeading } from "@/components/admin/AdminUI";
import { PostForm } from "@/components/admin/PostForm";
import { db } from "@/lib/db";

export const metadata = { title: "New article" };

export default async function NewPostPage() {
  const authors = await db.trainer.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return (
    <>
      <PageHeading
        title="New article"
        description="Write in Markdown. Save as a draft first if you want to preview before it goes live."
      />
      <PostForm authors={authors} />
    </>
  );
}
