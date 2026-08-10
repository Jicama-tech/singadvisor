import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AppImage as Image } from "@/components/ui/AppImage";
import { ArticleBody } from "@/components/blog/ArticleBody";
import { PostCard } from "@/components/cards/PostCard";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { db } from "@/lib/db";
import { SITE } from "@/lib/constants";
import { formatDate, parseList, readingMinutes } from "@/lib/utils";

export const revalidate = 60;

type Params = Promise<{ slug: string }>;

export async function generateStaticParams() {
  const posts = await db.blogPost.findMany({
    where: { published: true },
    select: { slug: true },
  });
  return posts.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await db.blogPost.findUnique({
    where: { slug },
    select: {
      title: true,
      excerpt: true,
      coverImage: true,
      publishedAt: true,
      author: { select: { name: true } },
    },
  });
  if (!post) return { title: "Article not found" };

  return {
    title: post.title,
    description: post.excerpt,
    openGraph: {
      type: "article",
      title: post.title,
      description: post.excerpt,
      images: [post.coverImage],
      publishedTime: post.publishedAt?.toISOString(),
      authors: post.author ? [post.author.name] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.excerpt,
      images: [post.coverImage],
    },
  };
}

export default async function ArticlePage({ params }: { params: Params }) {
  const { slug } = await params;

  const post = await db.blogPost.findUnique({
    where: { slug },
    include: { author: true },
  });
  if (!post || !post.published) notFound();

  const tags = parseList(post.tags);
  const minutes = readingMinutes(post.content);

  // Prefer posts in the same category, then top up with the most recent.
  const related = await db.blogPost.findMany({
    where: { published: true, id: { not: post.id }, category: post.category },
    orderBy: { publishedAt: "desc" },
    take: 3,
    include: { author: { select: { name: true, photo: true } } },
  });
  const fallback =
    related.length < 3
      ? await db.blogPost.findMany({
          where: {
            published: true,
            id: { not: post.id },
            slug: { notIn: related.map((r) => r.slug) },
          },
          orderBy: { publishedAt: "desc" },
          take: 3 - related.length,
          include: { author: { select: { name: true, photo: true } } },
        })
      : [];
  const suggestions = [...related, ...fallback];

  const url = `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/blog/${post.slug}`;

  const articleLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt,
    image: post.coverImage,
    datePublished: post.publishedAt?.toISOString(),
    dateModified: post.updatedAt.toISOString(),
    author: post.author
      ? { "@type": "Person", name: post.author.name }
      : { "@type": "Organization", name: SITE.name },
    publisher: { "@type": "Organization", name: SITE.name },
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
  };

  return (
    <>
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
                  <Link href="/" className="hover:text-[var(--accent)]">
                    Home
                  </Link>
                </li>
                <li aria-hidden="true">/</li>
                <li>
                  <Link href="/blog" className="hover:text-[var(--accent)]">
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
                {post.author && (
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
                )}
                {post.publishedAt && (
                  <time
                    dateTime={post.publishedAt.toISOString()}
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
              src={post.coverImage}
              alt=""
              fill
              priority
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
                    href={`/blog?q=${encodeURIComponent(tag)}`}
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
          </div>
        </div>
      </article>

      {/* ---- Related ------------------------------------------------- */}
      {suggestions.length > 0 && (
        <div className="border-t border-[var(--border-subtle)] surface-sunken py-16">
          <div className="container-page">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <h2 className="text-2xl">Keep reading</h2>
              <ButtonLink href="/blog" variant="secondary" size="sm">
                All articles
                <Icon name="arrow-right" size={15} />
              </ButtonLink>
            </div>
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {suggestions.map((p) => (
                <PostCard key={p.slug} post={p} />
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
