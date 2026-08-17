import { Link } from "react-router-dom";
import { PostCard, type PostCardData } from "@/components/cards/PostCard";
import { ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Section, SectionHeader } from "@/components/ui/Section";
import type { LandingVariant, ListContent } from "@/lib/landing-client";
import { formatDate, readingMinutes } from "@/lib/utils";

export function BlogSection({
  content,
  variant,
  items,
}: {
  content: ListContent;
  variant: LandingVariant;
  items: PostCardData[];
}) {
  const header = (
    <div className="flex flex-wrap items-end justify-between gap-6">
      <SectionHeader eyebrow={content.eyebrow} title={content.title} description={content.description} />
      <ButtonLink to={content.ctaHref} variant="secondary">
        {content.ctaLabel}
        <Icon name="arrow-right" size={16} />
      </ButtonLink>
    </div>
  );

  if (variant === "minimal") {
    return (
      <Section tone="sunken">
        {header}
        <ul className="mt-10 flex flex-col divide-y divide-[var(--border-subtle)]">
          {items.map((post) => (
            <li key={post.slug}>
              <Link
                to={`/blog/${post.slug}`}
                className="group flex flex-wrap items-center justify-between gap-3 py-4 transition-colors hover:text-[var(--accent)]"
              >
                <span className="font-medium text-[var(--text-primary)] group-hover:text-[var(--accent)]">
                  {post.title}
                </span>
                <span className="flex items-center gap-3 text-sm text-[var(--text-muted)]">
                  {post.publishedAt && <span>{formatDate(post.publishedAt)}</span>}
                  <span>{readingMinutes(post.content)} min read</span>
                  <Icon
                    name="arrow-right"
                    size={15}
                    className="transition-transform group-hover:translate-x-1 group-hover:text-[var(--accent)]"
                  />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Section>
    );
  }

  if (variant === "bold") {
    const [first, ...rest] = items;
    return (
      <Section tone="sunken">
        {header}
        <div className="mt-12 flex flex-col gap-8">
          {first && <PostCard post={first} featured />}
          {rest.length > 0 && (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {rest.map((post) => (
                <PostCard key={post.slug} post={post} />
              ))}
            </div>
          )}
        </div>
      </Section>
    );
  }

  // ---- modern (default) — unchanged from the original design ----
  return (
    <Section tone="sunken">
      {header}
      <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((post) => (
          <PostCard key={post.slug} post={post} />
        ))}
      </div>
    </Section>
  );
}
