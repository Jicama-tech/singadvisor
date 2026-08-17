import { Link } from "react-router-dom";
import { Card, CardBody } from "@/components/ui/Card";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Section, SectionHeader } from "@/components/ui/Section";
import type { LandingVariant, PillarsContent } from "@/lib/landing-client";

// Icon + link target are site navigation, not editable content — kept fixed
// here, positionally matched to the pillars section's 4 content items
// (Trainings / Events / Consultancy / Careers, in that order).
const PILLAR_NAV: { href: string; icon: IconName }[] = [
  { href: "/trainings", icon: "sparkles" },
  { href: "/events", icon: "calendar" },
  { href: "/consultancy", icon: "compass" },
  { href: "/careers", icon: "briefcase" },
];

const HEADER = {
  eyebrow: "What we do",
  title: "Four ways we work with you",
  description:
    "Whether you are a student figuring out the basics, a team that has stopped functioning, or someone looking for their next role — there is a door here for you.",
};

export function PillarsSection({
  content,
  variant,
}: {
  content: PillarsContent;
  variant: LandingVariant;
}) {
  if (variant === "minimal") {
    return (
      <Section>
        <SectionHeader {...HEADER} align="center" />
        <div className="mx-auto mt-12 flex max-w-3xl flex-col divide-y divide-[var(--border-subtle)]">
          {content.items.map((pillar, i) => {
            const nav = PILLAR_NAV[i];
            return (
              <Link
                key={nav.href}
                href={nav.href}
                className="group -mx-4 flex items-start gap-4 rounded-lg px-4 py-6 transition-colors hover:bg-[var(--surface-sunken)]"
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--accent-soft)] text-[var(--accent-on-soft)]">
                  <Icon name={nav.icon} size={18} />
                </span>
                <div className="flex-1">
                  <h3 className="text-lg group-hover:text-[var(--accent)]">{pillar.title}</h3>
                  <p className="mt-1 text-sm text-[var(--text-secondary)]">{pillar.description}</p>
                </div>
                <Icon
                  name="arrow-right"
                  size={16}
                  className="mt-2 shrink-0 text-[var(--text-muted)] transition-transform group-hover:translate-x-1 group-hover:text-[var(--accent)]"
                />
              </Link>
            );
          })}
        </div>
      </Section>
    );
  }

  if (variant === "bold") {
    return (
      <Section tone="sunken">
        <SectionHeader {...HEADER} align="center" />
        <div className="mt-14 grid gap-6 sm:grid-cols-2">
          {content.items.map((pillar, i) => {
            const nav = PILLAR_NAV[i];
            return (
              <Link key={nav.href} href={nav.href} className="group">
                <Card interactive className="h-full">
                  <CardBody className="gap-5 p-8">
                    <div className="flex items-center justify-between">
                      <span className="grid h-16 w-16 place-items-center rounded-2xl bg-[var(--accent)] text-[var(--accent-foreground)] transition-transform duration-300 group-hover:scale-110">
                        <Icon name={nav.icon} size={28} />
                      </span>
                      <span className="font-[family-name:var(--font-display)] text-4xl font-semibold text-[var(--border-strong)]">
                        0{i + 1}
                      </span>
                    </div>
                    <h3 className="text-2xl">{pillar.title}</h3>
                    <p className="text-base leading-relaxed text-[var(--text-secondary)]">
                      {pillar.description}
                    </p>
                    <span className="mt-auto flex items-center gap-1.5 pt-2 text-sm font-medium text-[var(--accent)]">
                      Explore
                      <Icon
                        name="arrow-right"
                        size={15}
                        className="transition-transform duration-300 group-hover:translate-x-1"
                      />
                    </span>
                  </CardBody>
                </Card>
              </Link>
            );
          })}
        </div>
      </Section>
    );
  }

  // ---- modern (default) — unchanged from the original design ----
  return (
    <Section>
      <SectionHeader {...HEADER} align="center" />
      <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {content.items.map((pillar, i) => {
          const nav = PILLAR_NAV[i];
          return (
            <Link key={nav.href} href={nav.href} className="group">
              <Card interactive className="h-full">
                <CardBody className="gap-4">
                  <span className="grid h-12 w-12 place-items-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent-on-soft)] transition-transform duration-300 group-hover:scale-110">
                    <Icon name={nav.icon} size={22} />
                  </span>
                  <h3 className="text-xl">{pillar.title}</h3>
                  <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
                    {pillar.description}
                  </p>
                  <span className="mt-auto flex items-center gap-1.5 pt-2 text-sm font-medium text-[var(--accent)]">
                    Explore
                    <Icon
                      name="arrow-right"
                      size={15}
                      className="transition-transform duration-300 group-hover:translate-x-1"
                    />
                  </span>
                </CardBody>
              </Card>
            </Link>
          );
        })}
      </div>
    </Section>
  );
}
