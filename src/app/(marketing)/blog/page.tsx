import type { Metadata } from "next";
import Link from "next/link";
import { PostCard } from "@/components/cards/PostCard";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { EmptyState, PageHero } from "@/components/ui/Section";
import { BLOG_CATEGORIES } from "@/lib/constants";
import { db } from "@/lib/db";
import { withBasePath } from "@/lib/base-path";
import { cn } from "@/lib/utils";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Notes on learning design, consultancy, events and hiring from the SingAdvisor team in Singapore.",
};

type SearchParams = Promise<{ category?: string; q?: string }>;

export default async function BlogPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const query = params.q?.trim() ?? "";

  // Ignore an unrecognised category so a hand-edited URL falls back to "all".
  const category = (BLOG_CATEGORIES as readonly string[]).includes(
    params.category ?? "",
  )
    ? params.category
    : undefined;

  const where = {
    published: true,
    ...(category ? { category } : {}),
    ...(query
      ? {
          OR: [
            { title: { contains: query } },
            { excerpt: { contains: query } },
            { tags: { contains: query } },
          ],
        }
      : {}),
  };

  const [posts, counts, total] = await Promise.all([
    db.blogPost.findMany({
      where,
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
      include: { author: { select: { name: true, photo: true } } },
    }),
    db.blogPost.groupBy({
      by: ["category"],
      where: { published: true },
      _count: true,
    }),
    db.blogPost.count({ where: { published: true } }),
  ]);

  const countFor = (c: string) =>
    counts.find((x) => x.category === c)?._count ?? 0;

  const filterHref = (c?: string) => {
    const sp = new URLSearchParams();
    if (c) sp.set("category", c);
    if (query) sp.set("q", query);
    const s = sp.toString();
    return s ? `/blog?${s}` : "/blog";
  };

  // Only lead with a hero article on the unfiltered first view — inside a
  // filter or search the results should all carry equal weight.
  const unfiltered = !category && !query;
  const [lead, ...rest] = posts;
  const grid = unfiltered ? rest : posts;

  return (
    <>
      <PageHero
        eyebrow="Blog"
        title="What we've learned doing the work"
        description="Notes from our facilitators and consultants — what worked, what didn't, and the things we changed our minds about."
      />

      <div className="container-page py-12 md:py-16">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <nav aria-label="Filter by topic" className="flex flex-wrap gap-2">
            <Chip href={filterHref()} active={!category}>
              All <span className="opacity-60">{total}</span>
            </Chip>
            {BLOG_CATEGORIES.filter((c) => countFor(c) > 0).map((c) => (
              <Chip key={c} href={filterHref(c)} active={category === c}>
                {c} <span className="opacity-60">{countFor(c)}</span>
              </Chip>
            ))}
          </nav>

          <form action={withBasePath("/blog")} className="flex gap-2 lg:w-80">
            {category && <input type="hidden" name="category" value={category} />}
            <label htmlFor="blog-search" className="sr-only">
              Search articles
            </label>
            <Input
              id="blog-search"
              name="q"
              type="search"
              defaultValue={query}
              placeholder="Search articles…"
            />
            <Button type="submit" variant="secondary" aria-label="Search">
              <Icon name="search" size={18} />
            </Button>
          </form>
        </div>

        <p className="mt-8 text-sm text-[var(--text-secondary)]" aria-live="polite">
          {posts.length} article{posts.length === 1 ? "" : "s"}
          {category ? ` in ${category}` : ""}
          {query ? ` matching “${query}”` : ""}
        </p>

        {posts.length === 0 ? (
          <div className="mt-8">
            <EmptyState
              title="Nothing matches those filters"
              description="Try a broader search term, or clear the filters to see everything we've written."
              action={
                <Link
                  href="/blog"
                  className="text-sm font-medium text-[var(--accent)] hover:underline"
                >
                  Clear filters
                </Link>
              }
            />
          </div>
        ) : (
          <>
            {unfiltered && lead && (
              <div className="mt-8">
                <PostCard post={lead} featured />
              </div>
            )}

            {grid.length > 0 && (
              <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {grid.map((post) => (
                  <PostCard key={post.slug} post={post} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}

function Chip({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-[var(--accent)] text-[var(--accent-foreground)]"
          : "surface-sunken text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
      )}
    >
      {children}
    </Link>
  );
}
