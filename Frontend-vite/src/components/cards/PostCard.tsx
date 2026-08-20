import { Link } from "react-router-dom";
import { AppImage as Image } from "@/components/ui/AppImage";
import { Badge } from "@/components/ui/Badge";
import { Card, CardBody } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { formatDate, readingMinutes } from "@/lib/utils";

export type PostCardData = {
  slug: string;
  title: string;
  excerpt: string;
  coverImage: string;
  category: string;
  content: string;
  publishedAt: Date | null;
  author: { name: string; photo: string } | null;
};

export function PostCard({
  post,
  featured = false,
}: {
  post: PostCardData;
  featured?: boolean;
}) {
  return (
    <Card interactive className="h-full">
      <div
        className={
          featured
            ? "relative aspect-[16/9] overflow-hidden surface-sunken md:aspect-[21/9]"
            : "relative aspect-[16/10] overflow-hidden surface-sunken"
        }
      >
        <Image
          src={post.coverImage}
          alt=""
          fill
          sizes={featured ? "100vw" : "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"}
          className="object-cover transition-transform duration-500 hover:scale-105"
        />
        <div className="absolute left-3 top-3">
          <Badge tone="accent">{post.category}</Badge>
        </div>
      </div>

      <CardBody className={featured ? "gap-3 p-7" : undefined}>
        <h3 className={featured ? "text-2xl leading-snug" : "text-lg leading-snug"}>
          {/* Stretched link keeps the whole card clickable. */}
          <Link to={`/blog/${post.slug}`} className="after:absolute after:inset-0">
            {post.title}
          </Link>
        </h3>

        <p
          className={
            featured
              ? "line-clamp-3 leading-relaxed text-[var(--text-secondary)]"
              : "line-clamp-3 text-sm leading-relaxed text-[var(--text-secondary)]"
          }
        >
          {post.excerpt}
        </p>

        <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-2 pt-3 text-xs text-[var(--text-muted)]">
          {post.author && (
            <span className="flex items-center gap-2">
              <span className="relative h-6 w-6 overflow-hidden rounded-full surface-sunken">
                <Image
                  src={post.author.photo}
                  alt=""
                  fill
                  sizes="24px"
                  className="object-cover"
                />
              </span>
              {post.author.name}
            </span>
          )}
          {post.publishedAt && (
            <span className="flex items-center gap-1.5">
              <Icon name="calendar" size={13} />
              {formatDate(post.publishedAt)}
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <Icon name="clock" size={13} />
            {readingMinutes(post.content)} min read
          </span>
        </div>
      </CardBody>
    </Card>
  );
}
