import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import MarketingShell from "@/components/site/MarketingShell";
import { AppImage as Image } from "@/components/ui/AppImage";
import { Icon } from "@/components/ui/Icon";
import { fetchNewsletterById, type NewsletterDoc } from "@/lib/contentClient";
import { withBackendUrl } from "@/lib/media-url";
import { SITE } from "@/lib/constants";
import { formatDate } from "@/lib/utils";

export default function NewsletterDetail() {
  const { id } = useParams();
  const [item, setItem] = useState<NewsletterDoc | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!id) {
        setItem(null);
        return;
      }
      const doc = await fetchNewsletterById(id);
      if (!cancelled) setItem(doc && doc.published ? doc : null);
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (!item) {
    if (item === undefined) {
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
          <title>Issue not found — SingAdvisor</title>
        </Helmet>
        <div className="container-page py-24 text-center">
          <h1 className="text-3xl">Page not found</h1>
          <p className="mt-3 text-[var(--text-secondary)]">
            This newsletter issue doesn&apos;t exist or is no longer published.
          </p>
          <Link
            to="/newsletter"
            className="mt-6 inline-block rounded-full bg-[var(--accent)] px-6 py-3 text-sm font-medium text-[var(--accent-foreground)] transition-colors hover:bg-[var(--accent-hover)]"
          >
            Back to the newsletter
          </Link>
        </div>
      </MarketingShell>
    );
  }

  const articleLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: item.title,
    image: withBackendUrl(item.image),
    dateCreated: item.createdAt,
    dateModified: item.updatedAt,
    publisher: { "@type": "Organization", name: SITE.name },
  };

  return (
    <MarketingShell>
      <Helmet>
        <title>{item.title} — SingAdvisor Newsletter</title>
        <meta name="description" content={item.message.slice(0, 160)} />
      </Helmet>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleLd) }}
      />

      <article>
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
                  <Link to="/newsletter" className="hover:text-[var(--accent)]">
                    Newsletter
                  </Link>
                </li>
                <li aria-hidden="true">/</li>
                <li aria-current="page" className="text-[var(--text-primary)]">
                  {item.title}
                </li>
              </ol>
            </nav>

            <div className="max-w-3xl">
              <h1 className="text-4xl leading-[1.15] md:text-5xl">{item.title}</h1>
              <div className="mt-7 flex items-center gap-2 text-sm text-[var(--text-muted)]">
                <Icon name="calendar" size={15} />
                <time dateTime={item.createdAt}>{formatDate(item.createdAt)}</time>
              </div>
            </div>
          </div>
        </header>

        <div className="container-page py-10 md:py-14">
          <div className="mx-auto max-w-3xl">
            <div className="relative aspect-[16/9] overflow-hidden rounded-2xl surface-sunken">
              <Image
                src={withBackendUrl(item.image)}
                alt={item.imageAlt || ""}
                fill
                sizes="(max-width: 768px) 100vw, 48rem"
                className="object-cover"
              />
            </div>

            <p className="mt-8 whitespace-pre-line text-lg leading-relaxed text-[var(--text-secondary)]">
              {item.message}
            </p>

            <div className="mt-10">
              {/* Plain <a>, not ButtonLink: referenceLink is an arbitrary
                  external URL, not an in-app route — react-router's Link
                  would try to client-side-navigate it. */}
              <a
                href={item.referenceLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-full bg-[var(--accent)] px-6 text-[0.9375rem] font-medium text-[var(--accent-foreground)] shadow-[var(--shadow-soft)] transition-all duration-200 hover:bg-[var(--accent-hover)] hover:shadow-[var(--shadow-lift)] active:scale-[0.98]"
              >
                Read full article
                <Icon name="arrow-right" size={16} />
              </a>
            </div>
          </div>
        </div>
      </article>
    </MarketingShell>
  );
}
