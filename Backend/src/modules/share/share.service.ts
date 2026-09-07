import { Injectable } from '@nestjs/common';
import { join, normalize, sep } from 'path';
import { readImageSize } from '../../common/utils/image-size';
import { BlogService } from '../blog/blog.service';
import { NewsletterService } from '../newsletter/newsletter.service';

/**
 * Everything a link-preview card needs, independent of which content type it
 * was built from.
 */
type ShareCard = {
  title: string;
  description: string;
  /** Absolute URL of the page the reader should land on. */
  url: string;
  /** Absolute URL of the cover image. */
  image: string;
  imageAlt: string;
  type: 'article' | 'website';
  publishedTime?: string;
  modifiedTime?: string;
  author?: string;
  section?: string;
  tags?: string[];
};

const SITE_NAME = 'SingAdvisor';
/** Shown when a post or issue has no cover of its own. */
const FALLBACK_IMAGE_PATH = '/Images/logo/Log.png';

@Injectable()
export class ShareService {
  constructor(
    private readonly blog: BlogService,
    private readonly newsletter: NewsletterService,
  ) {}

  /** Public origin of the SPA — where a human reader is sent. */
  private get siteUrl(): string {
    return (process.env.SITE_URL || 'http://localhost:3200').replace(/\/+$/, '');
  }

  /** Public origin of THIS service — where `/uploads/*` images are served. */
  private get backendUrl(): string {
    return (
      process.env.PUBLIC_URL || `http://localhost:${process.env.PORT ?? 4000}`
    ).replace(/\/+$/, '');
  }

  async renderBlog(slug: string): Promise<string> {
    try {
      // Published-only, exactly like the public API — an unpublished post
      // must not leak its title through a share card either. Newsletter-only
      // posts (listedOnBlog: false) are published, so they preview fine.
      const post = await this.blog.findBySlugPublic(slug);
      const author =
        post.writtenByName ||
        (post.authorId as unknown as { name?: string } | null)?.name ||
        undefined;

      return this.render({
        title: post.title,
        description: this.summarize(post.excerpt || post.content),
        url: `${this.siteUrl}/blog/${encodeURIComponent(post.slug)}`,
        image: this.absoluteImage(post.coverImage),
        imageAlt: post.title,
        type: 'article',
        publishedTime: post.publishedAt?.toISOString(),
        modifiedTime: post.updatedAt?.toISOString(),
        author,
        section: post.category,
        tags: post.tags,
      });
    } catch {
      // A dead or unpublished link still gets a valid (generic) card rather
      // than a broken one — crawlers show nothing at all on an error page.
      return this.renderFallback(`${this.siteUrl}/blog`);
    }
  }

  async renderNewsletter(slug: string): Promise<string> {
    try {
      const issue = await this.newsletter.findBySlugPublic(slug);
      // An issue has no cover field of its own: the lead story's image is
      // what the page shows at the top, so it is the cover here too.
      const lead = issue.items[0];

      return this.render({
        title: `${issue.title} — ${SITE_NAME} Newsletter`,
        description: this.summarize(lead?.message || lead?.heading || ''),
        url: `${this.siteUrl}/newsletter/${encodeURIComponent(issue.slug)}`,
        image: this.absoluteImage(lead?.image),
        imageAlt: issue.title,
        type: 'article',
        publishedTime: issue.createdAt?.toISOString(),
        modifiedTime: issue.updatedAt?.toISOString(),
      });
    } catch {
      return this.renderFallback(`${this.siteUrl}/newsletter`);
    }
  }

  // ---- internals ---------------------------------------------------------

  private renderFallback(url: string): string {
    return this.render({
      title: SITE_NAME,
      description: 'Training, events, consultancy and careers — built around people.',
      url,
      image: `${this.siteUrl}${FALLBACK_IMAGE_PATH}`,
      imageAlt: SITE_NAME,
      type: 'website',
    });
  }

  /**
   * Turns a stored image path into an absolute URL.
   *
   * Uploaded covers ("/uploads/content/<uuid>.jpg") are served by this
   * service; the pre-upload convention of a plain "/Images/..." path lives in
   * the SPA's own public/ directory. Mirrors the SPA's withBackendUrl(), which
   * makes the same split in the browser.
   */
  private absoluteImage(path?: string | null): string {
    if (!path) return `${this.siteUrl}${FALLBACK_IMAGE_PATH}`;
    if (/^https?:\/\//i.test(path)) return path;
    if (path.startsWith('/uploads/')) return `${this.backendUrl}${path}`;
    if (path.startsWith('/')) return `${this.siteUrl}${path}`;
    return `${this.siteUrl}/${path}`;
  }

  /**
   * Pixel dimensions of an uploaded cover, read straight off disk. Only our
   * own `/uploads/*` files are on this filesystem; anything else (the SPA's
   * public/ images, a remote URL) returns null and the tags are omitted.
   */
  private imageSize(imageUrl: string): { width: number; height: number } | null {
    const prefix = `${this.backendUrl}/uploads/`;
    if (!imageUrl.startsWith(prefix)) return null;

    let relative: string;
    try {
      relative = decodeURIComponent(imageUrl.slice(prefix.length).split('?')[0]);
    } catch {
      return null;
    }

    const root = join(process.cwd(), 'uploads');
    const resolved = normalize(join(root, relative));
    // Never read outside the uploads root, whatever the stored path claims.
    if (!resolved.startsWith(root + sep)) return null;

    return readImageSize(resolved);
  }

  /** Strips HTML, collapses whitespace and trims to preview length. */
  private summarize(source: string): string {
    const text = (source || '')
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim();
    if (text.length <= 200) return text;
    return `${text.slice(0, 197).trimEnd()}…`;
  }

  /**
   * The document a crawler receives.
   *
   * It is not the app: it exists only to carry Open Graph / Twitter tags,
   * which the SPA cannot serve because its per-page tags are written by
   * react-helmet-async at runtime and no social crawler executes JavaScript.
   * A human who somehow lands here (a preview service that follows through,
   * a pasted debug URL) is redirected to the real page immediately.
   */
  private render(card: ShareCard): string {
    const size = this.imageSize(card.image);
    const secure = card.image.startsWith('https://');
    const e = escapeHtml;

    const tags = [
      `<title>${e(card.title)}</title>`,
      `<link rel="canonical" href="${e(card.url)}">`,
      `<meta name="description" content="${e(card.description)}">`,

      `<meta property="og:type" content="${card.type}">`,
      `<meta property="og:site_name" content="${SITE_NAME}">`,
      `<meta property="og:locale" content="en_SG">`,
      `<meta property="og:title" content="${e(card.title)}">`,
      `<meta property="og:description" content="${e(card.description)}">`,
      `<meta property="og:url" content="${e(card.url)}">`,
      `<meta property="og:image" content="${e(card.image)}">`,
      secure ? `<meta property="og:image:secure_url" content="${e(card.image)}">` : '',
      `<meta property="og:image:alt" content="${e(card.imageAlt)}">`,
      size ? `<meta property="og:image:width" content="${size.width}">` : '',
      size ? `<meta property="og:image:height" content="${size.height}">` : '',

      card.publishedTime
        ? `<meta property="article:published_time" content="${e(card.publishedTime)}">`
        : '',
      card.modifiedTime
        ? `<meta property="article:modified_time" content="${e(card.modifiedTime)}">`
        : '',
      card.author ? `<meta property="article:author" content="${e(card.author)}">` : '',
      card.section ? `<meta property="article:section" content="${e(card.section)}">` : '',
      ...(card.tags ?? []).map(
        (tag) => `<meta property="article:tag" content="${e(tag)}">`,
      ),

      // Twitter/X reads its own namespace and ignores og:* for the card type;
      // "summary_large_image" is what makes the cover full-width there.
      `<meta name="twitter:card" content="summary_large_image">`,
      `<meta name="twitter:title" content="${e(card.title)}">`,
      `<meta name="twitter:description" content="${e(card.description)}">`,
      `<meta name="twitter:image" content="${e(card.image)}">`,
      `<meta name="twitter:image:alt" content="${e(card.imageAlt)}">`,
    ]
      .filter(Boolean)
      .join('\n    ');

    return `<!doctype html>
<html lang="en" prefix="og: https://ogp.me/ns#">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    ${tags}
  </head>
  <body>
    <!-- Deliberately NOT <meta http-equiv="refresh">. LinkedIn's and
         Facebook's crawlers follow a meta refresh and then read the tags of
         wherever it lands — which is the SPA shell, whose card is the site
         logo. That silently undoes everything above. Only crawlers are
         routed here (nginx matches on user-agent), so the redirect below is
         a courtesy for a human who pasted a /share/* URL by hand; they run
         JavaScript, and no crawler does. -->
    <p>Redirecting to <a href="${e(card.url)}">${e(card.title)}</a>…</p>
    <script>window.location.replace(${JSON.stringify(card.url)});</script>
  </body>
</html>
`;
  }
}

/** Escapes a value for use inside an HTML attribute or text node. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
