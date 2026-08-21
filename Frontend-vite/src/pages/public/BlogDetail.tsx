import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import MarketingShell from "@/components/site/MarketingShell";
import { AppImage as Image } from "@/components/ui/AppImage";
import { ArticleBody } from "@/components/blog/ArticleBody";
import { BlogFeedback } from "@/components/blog/BlogFeedback";
import { PostCard, type PostCardData } from "@/components/cards/PostCard";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { fetchPostBySlug, fetchPosts, type PostDoc } from "@/lib/contentClient";
import { withBackendUrl } from "@/lib/media-url";
import { SITE } from "@/lib/constants";
import { formatDate, readingMinutes } from "@/lib/utils";

type BlogDetailData = {
  post: PostDoc;
  suggestions: PostDoc[];
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

export default function BlogDetail() {
  const { slug } = useParams();
  const [data, setData] = useState<BlogDetailData | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!slug) {
        setData(null);
        return;
      }
      const post = await fetchPostBySlug(slug);
      if (cancelled) return;
      if (!post || !post.published) {
        setData(null);
        return;
      }

      const all = await fetchPosts();
      if (cancelled) return;

      const published = all.filter((p) => p.published);
      // Prefer posts in the same category, then top up with the most recent.
      const related = published
        .filter((p) => p._id !== post._id && p.category === post.category)
        .sort(sortByRecency)
        .slice(0, 3);
      const fallback =
        related.length < 3
          ? published
              .filter((p) => p._id !== post._id && !related.some((r) => r.slug === p.slug))
              .sort(sortByRecency)
              .slice(0, 3 - related.length)
          : [];
      const suggestions = [...related, ...fallback];

      setData({ post, suggestions });
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (!data) {
    if (data === undefined) {
      return (
        <MarketingShell>
          <div className="container-page py-24">
            <div className="h-6 w-1/3 animate-pulse rounded bg-[var(--surface-sunken)]" />
          </div>
        </MarketingShell>
      );
    }
    return (
      <MarketingShell>
        <Helmet>
          <title>Article not found — SingAdvisor</title>
        </Helmet>
        <div className="container-page py-24 text-center">
          <h1 className="text-3xl">Page not found</h1>
          <p className="mt-3 text-[var(--text-secondary)]">
            This article doesn&apos;t exist or is no longer published.
          </p>
          <Link
            to="/blog"
            className="mt-6 inline-block rounded-full bg-[var(--accent)] px-6 py-3 text-sm font-medium text-[var(--accent-foreground)] transition-colors hover:bg-[var(--accent-hover)]"
          >
            Back to the blog
          </Link>
        </div>
      </MarketingShell>
    );
  }

  const { post, suggestions } = data;
  // The Backend returns tags as a real array — no JSON parsing needed.
  const tags = post.tags;
  const minutes = readingMinutes(post.content);

  const url = `${window.location.origin}/blog/${post.slug}`;

  const articleLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt,
    image: withBackendUrl(post.coverImage),
    datePublished: post.publishedAt ?? undefined,
    dateModified: post.updatedAt,
    author: post.writtenByName
      ? { "@type": "Person", name: post.writtenByName }
      : post.author
        ? { "@type": "Person", name: post.author.name }
        : { "@type": "Organization", name: SITE.name },
    publisher: { "@type": "Organization", name: SITE.name },
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
  };

  return (
    <MarketingShell>
      <Helmet>
        <title>{post.title} — SingAdvisor</title>
        <meta name="description" content={post.excerpt} />
      </Helmet>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleLd) }}
      />

      <article>
        {/* ---- Header ------------------------------------------------- */}
        <header className="border-b border-[var(--border-subtle)] surface-sunken">
          <div className="container-page py-10 md:py-14">
            <nav aria-label="Breadcrumb" className="mb-6 text-sm">
              <ol className="flex flex-wrap items-center gap-2 text-[var(--text-muted)]">
                <li>
                  <Link to="/" className="hover:text-[var(--accent)]">
                    Home
                  </Link>
                </li>
                <li aria-hidden="true">/</li>
                <li>
                  <Link to="/blog" className="hover:text-[var(--accent)]">
                    Blog
                  </Link>
                </li>
                <li aria-hidden="true">/</li>
                <li aria-current="page" className="text-[var(--text-primary)]">
                  {post.title}
                </li>
              </ol>
            </nav>

            <div className="max-w-3xl">
              <Badge tone="accent">{post.category}</Badge>

              <h1 className="mt-5 text-4xl leading-[1.15] md:text-5xl">
                {post.title}
              </h1>

              <p className="mt-5 text-lg leading-relaxed text-[var(--text-secondary)]">
                {post.excerpt}
              </p>

              <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-3 text-sm text-[var(--text-muted)]">
                {post.writtenByName ? (
                  <span>
                    <span className="text-[var(--text-muted)]">Written by </span>
                    <span className="font-medium text-[var(--text-primary)]">
                      {post.writtenByName}
                    </span>
                    {post.writtenByPosition && (
                      <span className="text-[var(--text-muted)]">, {post.writtenByPosition}</span>
                    )}
                  </span>
                ) : (
                  post.author && (
                    <span className="flex items-center gap-2.5">
                      <span className="relative h-9 w-9 overflow-hidden rounded-full surface-sunken">
                        <Image
                          src={post.author.photo}
                          alt=""
                          fill
                          sizes="36px"
                          className="object-cover"
                        />
                      </span>
                      <span className="font-medium text-[var(--text-primary)]">
                        {post.author.name}
                      </span>
                    </span>
                  )
                )}
                {post.publishedAt && (
                  <time
                    dateTime={post.publishedAt}
                    className="flex items-center gap-1.5"
                  >
                    <Icon name="calendar" size={15} />
                    {formatDate(post.publishedAt)}
                  </time>
                )}
                <span className="flex items-center gap-1.5">
                  <Icon name="clock" size={15} />
                  {minutes} min read
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* ---- Cover -------------------------------------------------- */}
        <div className="container-page -mt-0 pt-8 md:pt-10">
          <div className="relative mx-auto aspect-[16/9] max-w-4xl overflow-hidden rounded-[var(--radius-card)] shadow-[var(--shadow-lift)]">
            <Image
              src={withBackendUrl(post.coverImage)}
              alt=""
              fill
              sizes="(max-width: 1024px) 100vw, 56rem"
              className="object-cover"
            />
          </div>
        </div>

        {/* ---- Body --------------------------------------------------- */}
        <div className="container-page pb-16 pt-10">
          <div className="mx-auto max-w-[44rem]">
            <ArticleBody content={post.content} />

            {tags.length > 0 && (
              <div className="mt-12 flex flex-wrap items-center gap-2 border-t border-[var(--border-subtle)] pt-8">
                <span className="text-sm text-[var(--text-muted)]">Tagged</span>
                {tags.map((tag) => (
                  <Link
                    key={tag}
                    to={`/blog?q=${encodeURIComponent(tag)}`}
                    className="rounded-full surface-sunken px-3 py-1 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:text-[var(--accent)]"
                  >
                    {tag}
                  </Link>
                ))}
              </div>
            )}

            {/* ---- Share --------------------------------------------- */}
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <span className="text-sm text-[var(--text-muted)]">Share</span>
              <a
                href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Share on LinkedIn"
                className="grid h-9 w-9 place-items-center rounded-full surface-sunken text-[var(--text-secondary)] transition-colors hover:text-[var(--accent)]"
              >
                <Icon name="linkedin" size={16} />
              </a>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(`${post.title} ${url}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Share on WhatsApp"
                className="grid h-9 w-9 place-items-center rounded-full surface-sunken text-[var(--text-secondary)] transition-colors hover:text-[var(--accent)]"
              >
                <Icon name="whatsapp" size={16} />
              </a>
              <a
                href={`mailto:?subject=${encodeURIComponent(post.title)}&body=${encodeURIComponent(url)}`}
                aria-label="Share by email"
                className="grid h-9 w-9 place-items-center rounded-full surface-sunken text-[var(--text-secondary)] transition-colors hover:text-[var(--accent)]"
              >
                <Icon name="mail" size={16} />
              </a>
            </div>

            {/* ---- Author ---------------------------------------------- */}
            {post.author && (
              <div className="mt-12 flex flex-col gap-5 rounded-[var(--radius-card)] border border-[var(--border-subtle)] p-6 sm:flex-row">
                <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full surface-sunken">
                  <Image
                    src={post.author.photo}
                    alt=""
                    fill
                    sizes="80px"
                    className="object-cover"
                  />
                </div>
                <div>
                  <h2 className="text-lg">{post.author.name}</h2>
                  <p className="text-sm text-[var(--accent)]">
                    {post.author.title}
                  </p>
                  <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">
                    {post.author.bio}
                  </p>
                </div>
              </div>
            )}

            <BlogFeedback slug={post.slug} />
          </div>
        </div>
      </article>

      {/* ---- Related ------------------------------------------------- */}
      {suggestions.length > 0 && (
        <div className="border-t border-[var(--border-subtle)] surface-sunken py-16">
          <div className="container-page">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <h2 className="text-2xl">Keep reading</h2>
              <ButtonLink to="/blog" variant="secondary" size="sm">
                All articles
                <Icon name="arrow-right" size={15} />
              </ButtonLink>
            </div>
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {suggestions.map((p) => (
                <PostCard key={p.slug} post={toCardData(p)} />
              ))}
            </div>
          </div>
        </div>
      )}
    </MarketingShell>
  );
}
