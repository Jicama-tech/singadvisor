import Link from "next/link";
import { deletePost } from "@/app/admin/actions";
import {
  AdminEmpty,
  PageHeading,
  Panel,
  TableWrap,
  Td,
  Th,
} from "@/components/admin/AdminUI";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { db } from "@/lib/db";
import { formatDate, readingMinutes } from "@/lib/utils";

export const metadata = { title: "Blog" };

export default async function AdminBlogPage() {
  const posts = await db.blogPost.findMany({
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    include: { author: { select: { name: true } } },
  });

  const drafts = posts.filter((p) => !p.published).length;

  return (
    <>
      <PageHeading
        title="Blog"
        description={`${posts.length} article${posts.length === 1 ? "" : "s"}${
          drafts ? ` · ${drafts} draft${drafts === 1 ? "" : "s"}` : ""
        }`}
        action={
          <ButtonLink href="/admin/blog/new" size="sm">
            <Icon name="plus" size={16} />
            New article
          </ButtonLink>
        }
      />

      <Panel>
        {posts.length === 0 ? (
          <AdminEmpty message="No articles yet. Write your first one." />
        ) : (
          <TableWrap>
            <thead>
              <tr>
                <Th>Title</Th>
                <Th>Category</Th>
                <Th>Author</Th>
                <Th>Length</Th>
                <Th>Published</Th>
                <Th>Status</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {posts.map((p) => (
                <tr key={p.id} className="hover:bg-[var(--surface-sunken)]">
                  <Td>
                    <Link
                      href={`/admin/blog/${p.id}`}
                      className="font-medium text-[var(--text-primary)] hover:text-[var(--accent)]"
                    >
                      {p.title}
                    </Link>
                    <span className="block text-xs text-[var(--text-muted)]">
                      /blog/{p.slug}
                    </span>
                  </Td>
                  <Td>
                    <Badge tone="accent">{p.category}</Badge>
                  </Td>
                  <Td className="text-[var(--text-secondary)]">
                    {p.author?.name ?? "—"}
                  </Td>
                  <Td className="whitespace-nowrap text-[var(--text-secondary)]">
                    {readingMinutes(p.content)} min
                  </Td>
                  <Td className="whitespace-nowrap text-[var(--text-secondary)]">
                    {p.publishedAt ? formatDate(p.publishedAt) : "—"}
                  </Td>
                  <Td>
                    <div className="flex flex-wrap gap-1">
                      <Badge tone={p.published ? "success" : "neutral"}>
                        {p.published ? "Live" : "Draft"}
                      </Badge>
                      {p.featured && <Badge tone="warn">Featured</Badge>}
                    </div>
                  </Td>
                  <Td>
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        href={`/blog/${p.slug}`}
                        target="_blank"
                        aria-label={`Preview ${p.title}`}
                        className="grid h-8 w-8 place-items-center rounded-lg text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-sunken)] hover:text-[var(--accent)]"
                      >
                        <Icon name="external" size={15} />
                      </Link>
                      <Link
                        href={`/admin/blog/${p.id}`}
                        aria-label={`Edit ${p.title}`}
                        className="grid h-8 w-8 place-items-center rounded-lg text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-sunken)] hover:text-[var(--accent)]"
                      >
                        <Icon name="pencil" size={15} />
                      </Link>
                      <DeleteButton id={p.id} action={deletePost} label={p.title} />
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        )}
      </Panel>
    </>
  );
}
