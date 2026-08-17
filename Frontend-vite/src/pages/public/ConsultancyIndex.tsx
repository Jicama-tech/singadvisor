import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import MarketingShell from "@/components/site/MarketingShell";
import { AppImage as Image } from "@/components/ui/AppImage";
import { EnquiryForm } from "@/components/forms/EnquiryForm";
import { Badge } from "@/components/ui/Badge";
import { Card, CardBody } from "@/components/ui/Card";
import { Icon, type IconName } from "@/components/ui/Icon";
import { PageHero, Section, SectionHeader } from "@/components/ui/Section";
import { fetchServices, type ServiceDoc } from "@/lib/contentClient";

const PROCESS = [
  {
    step: "01",
    title: "Diagnose",
    body: "Interviews, observation and whatever data you already have. We aim to find the actual constraint, which is usually not the one you were told about.",
  },
  {
    step: "02",
    title: "Design",
    body: "A plan built with your team rather than presented to them — because the version they helped write is the version that gets implemented.",
  },
  {
    step: "03",
    title: "Deliver",
    body: "We do the parts that need outside facilitation and coach your people through the parts that do not.",
  },
  {
    step: "04",
    title: "Hand over",
    body: "Documentation, templates and trained internal owners. The engagement ends; the capability stays.",
  },
];

export default function ConsultancyIndex() {
  const location = useLocation();
  const [services, setServices] = useState<ServiceDoc[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const all = await fetchServices();
      if (cancelled) return;
      setServices(
        all
          .filter((s) => s.published)
          .sort((a, b) => a.sortOrder - b.sortOrder),
      );
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // BrowserRouter doesn't scroll to a hash on navigation — `/consultancy#enquire`
  // links (e.g. from the contact page) need this to land on the enquiry form.
  useEffect(() => {
    if (location.hash === "#enquire") {
      document.getElementById("enquire")?.scrollIntoView();
    }
  }, [location.hash]);

  if (!services) {
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
        <title>Consultancy — SingAdvisor</title>
        <meta
          name="description"
          content="Learning strategy, leadership pipeline design, team effectiveness diagnostics and workplace wellbeing consultancy for organisations in Singapore."
        />
      </Helmet>

      <PageHero
        eyebrow="Consultancy"
        title="When training alone won't fix it"
        description="Sometimes the gap is not skills — it is structure, incentives or trust. We diagnose what is actually happening, build the fix with your team, and hand it over so it does not depend on us."
      />

      {/* ---- Services ---------------------------------------------------- */}
      <Section id="services">
        <SectionHeader
          eyebrow="Services"
          title="Four ways we engage"
          description="Each starts with a diagnostic and ends with your team owning the outcome."
        />

        <div className="mt-12 grid gap-6 md:grid-cols-2">
          {services.map((service) => {
            // The Backend returns deliverables as a real array — no JSON parsing.
            const deliverables = service.deliverables;
            return (
              <Card key={service._id} interactive className="h-full">
                <CardBody className="gap-4 p-7">
                  <div className="flex items-start justify-between gap-4">
                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent-on-soft)]">
                      <Icon name={service.icon as IconName} size={22} />
                    </span>
                    <Badge tone="neutral">{service.engagement}</Badge>
                  </div>

                  <h3 className="text-xl">
                    <Link
                      to={`/consultancy/${service.slug}`}
                      className="after:absolute after:inset-0"
                    >
                      {service.title}
                    </Link>
                  </h3>

                  <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
                    {service.summary}
                  </p>

                  <ul className="flex flex-col gap-2 pt-1">
                    {deliverables.slice(0, 3).map((d) => (
                      <li
                        key={d}
                        className="flex items-start gap-2 text-sm text-[var(--text-secondary)]"
                      >
                        <Icon
                          name="check"
                          size={15}
                          className="mt-0.5 shrink-0 text-[var(--accent)]"
                        />
                        {d}
                      </li>
                    ))}
                    {deliverables.length > 3 && (
                      <li className="pl-6 text-sm text-[var(--text-muted)]">
                        +{deliverables.length - 3} more
                      </li>
                    )}
                  </ul>

                  <span className="mt-auto flex items-center gap-1.5 pt-3 text-sm font-medium text-[var(--accent)]">
                    See the full scope
                    <Icon name="arrow-right" size={15} />
                  </span>
                </CardBody>
              </Card>
            );
          })}
        </div>
      </Section>

      {/* ---- Process ----------------------------------------------------- */}
      <Section tone="sunken">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.2fr] lg:gap-16">
          <div>
            <SectionHeader
              eyebrow="How we work"
              title="Four phases, no surprises"
              description="You will know at the outset what each phase produces and what it costs. If we conclude partway through that you do not need us, we will say so."
            />
            <div className="relative mt-8 aspect-[4/3] overflow-hidden rounded-[var(--radius-card)] shadow-[var(--shadow-lift)]">
              <Image
                src="/Images/Trainingimgae/Tech-Budget-1.png"
                alt="A consultant and client team reviewing a capability roadmap"
                fill
                sizes="(max-width: 1024px) 100vw, 40vw"
                className="object-cover"
              />
            </div>
          </div>

          <ol className="flex flex-col gap-6">
            {PROCESS.map((phase) => (
              <li
                key={phase.step}
                className="flex gap-5 rounded-[var(--radius-card)] surface-raised p-6 shadow-[var(--shadow-soft)]"
              >
                <span className="font-[family-name:var(--font-display)] text-3xl font-semibold text-[var(--accent)]/40">
                  {phase.step}
                </span>
                <div>
                  <h3 className="text-lg">{phase.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-[var(--text-secondary)]">
                    {phase.body}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </Section>

      {/* ---- Enquiry ----------------------------------------------------- */}
      <Section id="enquire">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.3fr] lg:gap-16">
          <div>
            <SectionHeader
              eyebrow="Start a conversation"
              title="Tell us what's happening"
              description="The first call is free and diagnostic — we are trying to work out whether we can help, not to sell you a package."
            />
            <ul className="mt-8 flex flex-col gap-4">
              {[
                "A 45-minute call with the consultant who would run the work",
                "An honest read on whether this is a problem we can solve",
                "A written scope and price before you commit to anything",
              ].map((point) => (
                <li key={point} className="flex items-start gap-3">
                  <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[var(--accent)] text-[var(--accent-foreground)]">
                    <Icon name="check" size={14} />
                  </span>
                  <span className="text-sm text-[var(--text-secondary)]">{point}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] surface-raised p-6 shadow-[var(--shadow-soft)] md:p-8">
            <EnquiryForm services={services.map((s) => ({ id: s._id, title: s.title }))} />
          </div>
        </div>
      </Section>
    </MarketingShell>
  );
}
