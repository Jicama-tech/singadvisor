import type { EventRow } from "@/lib/events-client";
import { ArticleBody } from "@/components/blog/ArticleBody";
import { Badge } from "@/components/ui/Badge";
import { Icon, type IconName } from "@/components/ui/Icon";
import { formatPrice } from "@/lib/utils";

/**
 * The plain-information blocks an organizer fills in and this app's public
 * event page never showed: the ticket types themselves (with their perks),
 * tags, age restrictions, dress code, special instructions, the organizer's
 * own custom sections, the policies, and the social links.
 */

/** Feature-access keys are an open set (VisitorFeatureAccess is a
 * Record<string, boolean> — organizers can add their own), so unknown keys fall
 * back to a generic icon and a title-cased label rather than being dropped. */
const FEATURE_ICONS: Record<string, IconName> = {
  food: "heart",
  parking: "compass",
  wifi: "activity",
  photography: "image",
  security: "check",
  accessibility: "users",
};

function featureLabel(key: string): string {
  return key.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/^./, (c) => c.toUpperCase());
}

/** The ticket tiers, laid out so a visitor can compare them — the sidebar's
 * purchase form only shows a name and a price, which loses the per-tier
 * description and the included-perks list the admin collects. */
export function EventTicketTypes({ event }: { event: EventRow }) {
  const tiers = event.visitorTypes.filter((t) => t.isActive);
  if (tiers.length === 0) return null;

  return (
    <section>
      <h2 className="text-2xl">Ticket types</h2>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        {tiers.map((tier) => {
          const perks = Object.entries(tier.featureAccess).filter(([, on]) => on);
          const left = Math.max(0, tier.maxCount - tier.soldCount);
          return (
            <div
              key={tier.id}
              className="flex flex-col gap-2 rounded-[var(--radius-card)] surface-sunken p-5"
            >
              <div className="flex items-baseline justify-between gap-3">
                <p className="font-medium text-[var(--text-primary)]">{tier.name}</p>
                <p className="shrink-0 text-sm font-semibold text-[var(--accent)]">
                  {formatPrice(Math.round(tier.price * 100), event.currency)}
                </p>
              </div>
              {tier.description && (
                <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
                  {tier.description}
                </p>
              )}
              {perks.length > 0 && (
                <ul className="flex flex-wrap gap-2 pt-1">
                  {perks.map(([key]) => (
                    <li
                      key={key}
                      className="inline-flex items-center gap-1.5 rounded-full bg-[var(--surface-raised)] px-2.5 py-1 text-xs text-[var(--text-secondary)]"
                    >
                      <Icon
                        name={FEATURE_ICONS[key] ?? "check"}
                        size={12}
                        className="text-[var(--accent)]"
                      />
                      {featureLabel(key)}
                    </li>
                  ))}
                </ul>
              )}
              {tier.maxCount > 0 && (
                <p className="mt-auto pt-1 text-xs text-[var(--text-muted)]">
                  {left === 0 ? "Sold out" : `${left} of ${tier.maxCount} left`}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

/** Tags, age restrictions, dress code and special instructions — small facts
 * that only render when the organizer actually filled them in. */
export function EventGoodToKnow({ event }: { event: EventRow }) {
  const dressCode = [event.dresscode, event.dressCodeTheme].filter(Boolean).join(" · ");
  // The <dl> is skipped entirely when only tags were filled in — an empty one
  // still contributes its top margin and leaves a visible gap.
  const hasFacts =
    Boolean(event.ageRestriction) ||
    event.ageRestrictions.length > 0 ||
    Boolean(dressCode) ||
    Boolean(event.specialInstructions);
  if (!hasFacts && event.tags.length === 0) return null;

  return (
    <section>
      <h2 className="text-2xl">Good to know</h2>

      {event.tags.length > 0 && (
        <div className="mt-5 flex flex-wrap gap-2">
          {event.tags.map((tag) => (
            <Badge key={tag} tone="accent">
              {tag}
            </Badge>
          ))}
        </div>
      )}

      {hasFacts && (
        <dl className="mt-5 flex flex-col gap-4">
          {event.ageRestriction && (
            <div>
              <dt className="text-xs uppercase tracking-wide text-[var(--text-muted)]">Age</dt>
              <dd className="text-[var(--text-primary)]">{event.ageRestriction}</dd>
            </div>
          )}
          {event.ageRestrictions.map((entry) => (
            <div key={`${entry.heading}-${entry.age}`}>
              <dt className="text-xs uppercase tracking-wide text-[var(--text-muted)]">
                {entry.heading}
              </dt>
              <dd className="text-[var(--text-primary)]">{entry.age}</dd>
            </div>
          ))}
          {dressCode && (
            <div>
              <dt className="text-xs uppercase tracking-wide text-[var(--text-muted)]">
                Dress code
              </dt>
              <dd className="text-[var(--text-primary)]">{dressCode}</dd>
            </div>
          )}
          {event.specialInstructions && (
            <div>
              <dt className="text-xs uppercase tracking-wide text-[var(--text-muted)]">
                Special instructions
              </dt>
              <dd className="whitespace-pre-line text-[var(--text-primary)]">
                {event.specialInstructions}
              </dd>
            </div>
          )}
        </dl>
      )}
    </section>
  );
}

/** The organizer's own free-form blocks — FAQs, sponsor info, anything else.
 * Authored in the admin's rich-text editor, so the HTML goes through the same
 * DOMPurify-backed renderer the blog uses rather than a second one. */
export function EventCustomSections({ sections }: { sections: EventRow["customSections"] }) {
  const filled = sections.filter((s) => s.heading || s.content);
  if (filled.length === 0) return null;

  return (
    <>
      {filled.map((section) => (
        <section key={section.id || section.heading}>
          {section.heading && <h2 className="text-2xl">{section.heading}</h2>}
          {section.content && (
            <div className="mt-4">
              <ArticleBody content={section.content} />
            </div>
          )}
        </section>
      ))}
    </>
  );
}

export function EventPolicies({ event }: { event: EventRow }) {
  const entries = [
    { label: "Refund policy", body: event.refundPolicy },
    { label: "Terms and conditions", body: event.termsAndConditions },
  ].filter((e) => e.body);
  if (entries.length === 0) return null;

  return (
    <section>
      <h2 className="text-2xl">The fine print</h2>
      <div className="mt-5 flex flex-col gap-5">
        {entries.map((entry) => (
          <div key={entry.label}>
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">{entry.label}</h3>
            <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-[var(--text-secondary)]">
              {entry.body}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

const SOCIAL_ICONS: Record<string, IconName> = {
  linkedin: "linkedin",
  whatsapp: "whatsapp",
  email: "mail",
  website: "external",
};

export function EventSocialLinks({ socialMedia }: { socialMedia: Record<string, string> }) {
  const links = Object.entries(socialMedia).filter(([, url]) => url);
  if (links.length === 0) return null;

  return (
    // Own top margin rather than a wrapper at the call site: an empty wrapper
    // around a null render still leaves the gap behind.
    <div className="mt-5 flex flex-wrap gap-3">
      {links.map(([platform, url]) => (
        <a
          key={platform}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-full surface-sunken px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:text-[var(--accent)]"
        >
          <Icon name={SOCIAL_ICONS[platform] ?? "link"} size={13} />
          <span className="capitalize">{platform}</span>
        </a>
      ))}
    </div>
  );
}
