import { useEffect, useState, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import MarketingShell from "@/components/site/MarketingShell";
import { PostCard, type PostCardData } from "@/components/cards/PostCard";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { EmptyState, PageHero } from "@/components/ui/Section";
import { BLOG_CATEGORIES } from "@/lib/constants";
import { fetchPosts, type PostDoc } from "@/lib/contentClient";
import { cn } from "@/lib/utils";

type BlogData = {
  posts: PostDoc[];
  total: number;
  countFor: (c: string) => number;
};

function toCardData(p: PostDoc): PostCardData {
  return {
    slug: p.slug,
    title: p.title,
    excerpt: p.excerpt,
    coverImage: p.coverImage,
    category: p.category,
    content: p.content,
    publishedAt: p.publishedAt ? new Date(p.publishedAt) : null,
    author: p.author ? { name: p.author.name, photo: p.author.photo } : null,
    writtenByName: p.writtenByName || undefined,
  };
}

function sortByRecency(a: PostDoc, b: PostDoc): number {
  const da = new Date(a.publishedAt ?? a.createdAt).getTime();
  const db = new Date(b.publishedAt ?? b.createdAt).getTime();
  if (da !== db) return db - da;
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}

export default function BlogIndex() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = (searchParams.get("q") ?? "").trim();

  // Ignore an unrecognised category so a hand-edited URL falls back to "all".
  const rawCategory = searchParams.get("category") ?? "";
  const category = (BLOG_CATEGORIES as readonly string[]).includes(rawCategory)
    ? rawCategory
    : undefined;

  const [data, setData] = useState<BlogData | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const all = await fetchPosts();
      if (cancelled) return;

      const published = all.filter((p) => p.published);
      const countFor = (c: string) => published.filter((p) => p.category === c).length;
      const q = query.toLowerCase();

      setData({
        posts: published
          .filter((p) => !category || p.category === category)
          .filter(
            (p) =>
              !q ||
              p.title.toLowerCase().includes(q) ||
              p.excerpt.toLowerCase().includes(q) ||
              p.tags.some((tag) => tag.toLowerCase().includes(q)),
          )
          .sort(sortByRecency),
        total: published.length,
        countFor,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [category, query]);

  if (!data) {
    return (
      <MarketingShell>
        <div className="container-page py-24">
          <div className="h-6 w-1/3 animate-pulse rounded bg-[var(--surface-sunken)]" />
        </div>
      </MarketingShell>
    );
  }

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
  const [lead, ...rest] = data.posts;
  const grid = unfiltered ? rest : data.posts;

  return (
    <MarketingShell>
      <Helmet>
        <title>Blog — SingAdvisor</title>
        <meta
          name="description"
          content="Notes on learning design, consultancy, events and hiring from the SingAdvisor team in Singapore."
        />
      </Helmet>

      <PageHero
        eyebrow="Blog"
        title="What we've learned doing the work"
        description="Notes from our facilitators and consultants — what worked, what didn't, and the things we changed our minds about."
      />

      <div className="container-page py-12 md:py-16">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <nav aria-label="Filter by topic" className="flex flex-wrap gap-2">
            <Chip to={filterHref()} active={!category}>
              All <span className="opacity-60">{data.total}</span>
            </Chip>
            {BLOG_CATEGORIES.filter((c) => data.countFor(c) > 0).map((c) => (
              <Chip key={c} to={filterHref(c)} active={category === c}>
                {c} <span className="opacity-60">{data.countFor(c)}</span>
              </Chip>
            ))}
          </nav>

          <form
            className="flex gap-2 lg:w-80"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const q = String(fd.get("q") ?? "").trim();
              const next: Record<string, string> = {};
              if (category) next.category = category;
              if (q) next.q = q;
              setSearchParams(next);
            }}
          >
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
          {data.posts.length} article{data.posts.length === 1 ? "" : "s"}
          {category ? ` in ${category}` : ""}
          {query ? ` matching “${query}”` : ""}
        </p>

        {data.posts.length === 0 ? (
          <div className="mt-8">
            <EmptyState
              title="Nothing matches those filters"
              description="Try a broader search term, or clear the filters to see everything we've written."
              action={
                <Link
                  to="/blog"
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
                <PostCard post={toCardData(lead)} featured />
              </div>
            )}

            {grid.length > 0 && (
              <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {grid.map((post) => (
                  <PostCard key={post.slug} post={toCardData(post)} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </MarketingShell>
  );
}

function Chip({
  to,
  active,
  children,
}: {
  to: string;
  active: boolean;
  children: ReactNode;
}) {
  return (
    <Link
      to={to}
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
