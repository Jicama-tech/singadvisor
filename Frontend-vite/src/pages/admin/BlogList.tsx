import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { adminFetch } from "@/lib/adminFetch";
import { AdminEmpty, PageHeading, Panel, TableWrap, Td, Th } from "@/components/admin/AdminUI";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { deletePost } from "@/adminActions";
import { formatDate } from "@/lib/utils";
import type { PostDoc } from "@/lib/contentClient";

export default function BlogList() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<PostDoc[] | null>(null);

  const load = useCallback(async () => {
    const res = await adminFetch(`${__API_URL__}/blog/admin`);
    if (res.ok) setPosts((await res.json()) as PostDoc[]);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function remove(id: string) {
    await deletePost(id);
    await load();
  }

  if (!user) return null;

  return (
      <div className="flex flex-col gap-8">
        <PageHeading
          title="Blog"
          description={`${posts?.length ?? "…"} post${posts?.length === 1 ? "" : "s"}`}
          action={
            <ButtonLink to="/admin/blog/new" size="sm">
              <Icon name="plus" size={16} />
              New post
            </ButtonLink>
          }
        />

        <Panel>
          {posts && posts.length === 0 ? (
            <AdminEmpty message="No posts yet. Write your first one." />
          ) : (
            <TableWrap>
              <thead>
                <tr>
                  <Th>Title</Th>
                  <Th>Category</Th>
                  <Th>Published</Th>
                  <Th>Status</Th>
                  <Th className="text-right">Actions</Th>
                </tr>
              </thead>
              <tbody>
                {(posts ?? []).map((p) => (
                  <tr key={p._id} className="hover:bg-[var(--surface-sunken)]">
                    <Td>
                      <Link
                        to={`/admin/blog/${p._id}`}
                        className="font-medium text-[var(--text-primary)] hover:text-[var(--accent)]"
                      >
                        {p.title}
                      </Link>
                      <span className="block text-xs text-[var(--text-muted)]">/{p.slug}</span>
                    </Td>
                    <Td>
                      <Badge tone="accent">{p.category}</Badge>
                    </Td>
                    <Td className="text-[var(--text-secondary)]">
                      {p.publishedAt ? formatDate(p.publishedAt) : "—"}
                    </Td>
                    <Td>
                      <div className="flex flex-wrap gap-1">
                        <Badge tone={p.published ? "success" : "neutral"}>
                          {p.published ? "Live" : "Draft"}
                        </Badge>
                        {p.featured && <Badge tone="warn">Featured</Badge>}
                        {p.listedOnBlog === false && (
                          <Badge tone="neutral">Newsletter only</Badge>
                        )}
                      </div>
                    </Td>
                    <Td>
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          to={`/blog/${p.slug}`}
                          target="_blank"
                          aria-label={`Preview ${p.title}`}
                          className="grid h-8 w-8 place-items-center rounded-lg text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-sunken)] hover:text-[var(--accent)]"
                        >
                          <Icon name="external" size={15} />
                        </Link>
                        <Link
                          to={`/admin/blog/${p._id}`}
                          aria-label={`Edit ${p.title}`}
                          className="grid h-8 w-8 place-items-center rounded-lg text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-sunken)] hover:text-[var(--accent)]"
                        >
                          <Icon name="pencil" size={15} />
                        </Link>
                        <DeleteButton id={p._id} action={remove} label={p.title} />
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </TableWrap>
          )}
        </Panel>
      </div>
  );
}
