import { Fragment, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import MarketingShell from "@/components/site/MarketingShell";
import { AppImage as Image } from "@/components/ui/AppImage";
import { Icon } from "@/components/ui/Icon";
import {
  fetchNewsletterAsMember,
  fetchNewsletterBySlug,
  type NewsletterDoc,
} from "@/lib/contentClient";
import { withBackendUrl } from "@/lib/media-url";
import { SITE } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import { MembershipPromo } from "@/components/site/MembershipPromo";
import { MemberContentGate } from "@/components/site/MemberContentGate";

export default function NewsletterDetail() {
  const { slug } = useParams();
  const [item, setItem] = useState<NewsletterDoc | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!slug) {
        setItem(null);
        return;
      }
      // The Backend's :slug route already 404s unpublished issues.
      const doc = await fetchNewsletterBySlug(slug);
      if (!cancelled) setItem(doc);
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  /**
   * Re-ask for this issue as a member. Returns whether the stories actually
   * came back, so the gate knows whether to keep offering a sign-in or to
   * start offering the plans.
   */
  async function unlockWithCredential(credential: string): Promise<boolean> {
    if (!slug) return false;
    const asMember = await fetchNewsletterAsMember(slug, credential);
    if (!asMember || (asMember.items ?? []).every((story) => !story.message)) return false;
    setItem(asMember);
    return true;
  }

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

  const stories = item.items;

  /**
   * Withheld, rather than simply empty. A members-only issue whose stories all
   * arrive without text is one the Backend refused; an OPEN issue is never in
   * that state, because an issue must have at least one story with a message
   * to be saved at all.
   */
  const gated =
    item.membersOnly === true && stories.length > 0 && stories.every((s) => !s.message);

  /**
   * Which story the membership advert follows. An issue is already a list of
   * discrete pieces, so it slots between two of them and needs no splitting.
   *
   * -1 on an issue of one or two stories: there is no middle to speak of, and
   * an advert after the first of two reads as half the issue being an advert.
   */
  const promoAfter = stories.length >= 3 ? Math.ceil(stories.length / 2) - 1 : -1;
  const lead = stories[0];

  const articleLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: item.title,
    ...(lead?.image && { image: withBackendUrl(lead.image) }),
    dateCreated: item.createdAt,
    dateModified: item.updatedAt,
    publisher: { "@type": "Organization", name: SITE.name },
  };

  return (
    <MarketingShell>
      <Helmet>
        <title>{item.title} — SingAdvisor Newsletter</title>
        <meta name="description" content={(lead?.message ?? "").slice(0, 160)} />
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
              <div className="mt-7 flex flex-wrap items-center gap-2 text-sm text-[var(--text-muted)]">
                <Icon name="calendar" size={15} />
                <time dateTime={item.createdAt}>{formatDate(item.createdAt)}</time>
                {stories.length > 1 && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>{stories.length} stories in this issue</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </header>

        <div className="container-page py-10 md:py-14">
          {/* One block per story, separated by a rule so a long issue reads as
              a list of pieces rather than one run-on article. */}
          {/*
            A gated issue arrives with every story's `message` blank — the
            Backend withholds them, so there is nothing in the page for the
            gate to be clicked around. The headings and images still come, which
            is what the locked panel has to show.
          */}
          {gated ? (
            <div className="mx-auto max-w-3xl">
              <MemberContentGate
                kind="issue"
                title={item.title}
                teaser={stories[0]?.heading}
                onCredential={unlockWithCredential}
              />
            </div>
          ) : (
          <div className="mx-auto flex max-w-3xl flex-col gap-14">
            {stories.map((story, i) => (
              <Fragment key={`${story.image}-${i}`}>
              <section
                className={
                  i > 0 ? "border-t border-[var(--border-subtle)] pt-14" : undefined
                }
              >
                {story.heading && (
                  <h2 className="mb-6 text-2xl leading-snug md:text-3xl">{story.heading}</h2>
                )}

                <div className="relative aspect-[16/9] overflow-hidden rounded-2xl surface-sunken">
                  <Image
                    src={withBackendUrl(story.image)}
                    alt=""
                    fill
                    sizes="(max-width: 768px) 100vw, 48rem"
                    className="object-cover"
                  />
                </div>

                <p className="mt-8 whitespace-pre-line text-lg leading-relaxed text-[var(--text-secondary)]">
                  {story.message}
                </p>

                {/* The link is optional — a story with nothing to point at
                    ends after its message rather than showing a dead button. */}
                {story.referenceLink && (
                <div className="mt-8">
                  {/* Plain <a>, not ButtonLink: referenceLink is an arbitrary
                      external URL, not an in-app route — react-router's Link
                      would try to client-side-navigate it. */}
                  <a
                    href={story.referenceLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-full bg-[var(--accent)] px-6 text-[0.9375rem] font-medium text-[var(--accent-foreground)] shadow-[var(--shadow-soft)] transition-all duration-200 hover:bg-[var(--accent-hover)] hover:shadow-[var(--shadow-lift)] active:scale-[0.98]"
                  >
                    Read full article
                    <Icon name="arrow-right" size={16} />
                  </a>
                </div>
                )}
              </section>

              {/* Between two pieces, never after the last one — an advert at the
                  foot of an issue is only seen by people who already read it all. */}
              {i === promoAfter && <MembershipPromo />}
              </Fragment>
            ))}
          </div>
          )}
        </div>
      </article>
    </MarketingShell>
  );
}
