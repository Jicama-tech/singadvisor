import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import MarketingShell from "@/components/site/MarketingShell";
import { AppImage as Image } from "@/components/ui/AppImage";
import { Card, CardBody } from "@/components/ui/Card";
import { EmptyState, PageHero } from "@/components/ui/Section";
import { fetchNewsletters, type NewsletterDoc } from "@/lib/contentClient";
import { withBackendUrl } from "@/lib/media-url";
import { formatDate } from "@/lib/utils";

function sortByRecency(a: NewsletterDoc, b: NewsletterDoc): number {
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}

export default function NewsletterIndex() {
  const [items, setItems] = useState<NewsletterDoc[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const all = await fetchNewsletters();
      if (cancelled) return;
      setItems(all.filter((n) => n.published).sort(sortByRecency));
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!items) {
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
        <title>Newsletter — SingAdvisor</title>
        <meta
          name="description"
          content="Short, regular notes from the SingAdvisor team — what we're seeing, building and learning."
        />
      </Helmet>

      <PageHero
        eyebrow="Newsletter"
        title="Notes worth a few minutes"
        description="Short issues we send out as we learn things worth sharing — no fluff, just what's useful."
      />

      <div className="container-page py-12 md:py-16">
        {items.length === 0 ? (
          <EmptyState
            title="No issues yet"
            description="We haven't published a newsletter issue yet — check back soon."
          />
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((n) => {
              // An issue holds several stories now; the first one stands in
              // for the whole issue on the card.
              const lead = n.items[0];
              const storyCount = n.items.length;
              return (
                <Card key={n._id} interactive className="h-full">
                  <div className="relative aspect-[16/10] overflow-hidden surface-sunken">
                    {lead?.image && (
                      <Image
                        src={withBackendUrl(lead.image)}
                        alt=""
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        className="object-cover transition-transform duration-500 hover:scale-105"
                      />
                    )}
                  </div>
                  <CardBody>
                    <h3 className="text-lg leading-snug">
                      <Link to={`/newsletter/${n.slug}`} className="after:absolute after:inset-0">
                        {n.title}
                      </Link>
                    </h3>
                    <p className="line-clamp-3 text-sm leading-relaxed text-[var(--text-secondary)]">
                      {lead?.message ?? ""}
                    </p>
                    <div className="mt-auto flex items-center gap-2 pt-3 text-xs text-[var(--text-muted)]">
                      <span>{formatDate(n.createdAt)}</span>
                      {storyCount > 1 && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>{storyCount} stories</span>
                        </>
                      )}
                    </div>
                  </CardBody>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </MarketingShell>
  );
}
