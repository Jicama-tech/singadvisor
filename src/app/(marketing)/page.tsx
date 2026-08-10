import { AppImage as Image } from "@/components/ui/AppImage";
import Link from "next/link";
import { EventCard } from "@/components/cards/EventCard";
import { PostCard } from "@/components/cards/PostCard";
import { TrainingCard } from "@/components/cards/TrainingCard";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Section, SectionHeader } from "@/components/ui/Section";
import { db } from "@/lib/db";
import { withBasePath } from "@/lib/base-path";
import { formatSalaryRange } from "@/lib/utils";

// Content is editable through the admin CMS, so the home page revalidates
// rather than being fully static.
export const revalidate = 60;

const PILLARS: {
  href: string;
  icon: IconName;
  title: string;
  description: string;
}[] = [
  {
    href: "/trainings",
    icon: "sparkles",
    title: "Trainings",
    description:
      "Practical programmes for students, corporate teams and professionals — time, money, health, emotions, leadership and communication.",
  },
  {
    href: "/events",
    icon: "calendar",
    title: "Events",
    description:
      "Masterclasses, bootcamps and community evenings. Come for the sessions, stay for the people you meet.",
  },
  {
    href: "/consultancy",
    icon: "compass",
    title: "Consultancy",
    description:
      "Learning strategy, leadership pipelines and team diagnostics — engagements that end with your team able to run it themselves.",
  },
  {
    href: "/careers",
    icon: "briefcase",
    title: "Careers",
    description:
      "We are hiring facilitators, designers and operators who care about whether the learning actually sticks.",
  },
];

const STATS = [
  { value: "12,000+", label: "People trained" },
  { value: "180+", label: "Corporate programmes" },
  { value: "40+", label: "Events hosted" },
  { value: "4.8/5", label: "Average rating" },
];

export default async function HomePage() {
  const [featuredTrainings, upcomingEvents, services, jobs, posts, trainingCount] =
    await Promise.all([
      db.training.findMany({
        where: { published: true, featured: true },
        orderBy: { sortOrder: "asc" },
        take: 3,
      }),
      db.event.findMany({
        where: { published: true, startsAt: { gte: new Date() } },
        orderBy: { startsAt: "asc" },
        take: 3,
      }),
      db.consultancyService.findMany({
        where: { published: true },
        orderBy: { sortOrder: "asc" },
        take: 4,
      }),
      db.jobPosting.findMany({
        where: { published: true },
        orderBy: { createdAt: "desc" },
        take: 3,
      }),
      db.blogPost.findMany({
        where: { published: true },
        orderBy: [{ featured: "desc" }, { publishedAt: "desc" }],
        take: 3,
        include: { author: { select: { name: true, photo: true } } },
      }),
      db.training.count({ where: { published: true } }),
    ]);

  return (
    <>
      {/* ---- Hero ---------------------------------------------------- */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <video
            autoPlay
            muted
            loop
            playsInline
            poster={withBasePath("/Images/Trainingimgae/traing.jpg")}
            className="h-full w-full object-cover"
          >
            {/* Raw <source> is not touched by basePath — prefix it ourselves. */}
            <source
              src={withBasePath("/Vedios/trainingvedio.mp4")}
              type="video/mp4"
            />
          </video>
          {/* Two-stop scrim keeps text at AA contrast over any video frame. */}
          <div className="absolute inset-0 bg-gradient-to-r from-[var(--color-ink-950)] via-[var(--color-ink-950)]/85 to-[var(--color-ink-950)]/40" />
        </div>

        <div className="container-page relative py-24 md:py-36">
          <div className="max-w-2xl animate-[var(--animate-fade-up)]">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-xs font-medium text-white ring-1 ring-inset ring-white/20 backdrop-blur">
              <Icon name="map-pin" size={14} />
              Singapore · Since 2016
            </span>

            <h1 className="mt-6 text-4xl leading-[1.08] text-white md:text-6xl lg:text-7xl">
              Skills that hold up
              <span className="block text-[var(--color-teal-300)]">
                under a real week.
              </span>
            </h1>

            <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/80">
              We run trainings, events and consultancy engagements built around
              one test: does the change still hold six months later? And we are
              hiring the people who help us meet it.
            </p>

            <div className="mt-9 flex flex-wrap gap-3">
              <ButtonLink href="/trainings" size="lg">
                Browse {trainingCount} programmes
                <Icon name="arrow-right" size={18} />
              </ButtonLink>
              <ButtonLink
                href="/consultancy"
                size="lg"
                variant="secondary"
                className="border-white/25 bg-white/10 text-white backdrop-blur hover:border-white hover:bg-white/20 hover:text-white"
              >
                Talk to a consultant
              </ButtonLink>
            </div>
          </div>
        </div>
      </section>

      {/* ---- Stats --------------------------------------------------- */}
      <div className="border-b border-[var(--border-subtle)] surface-raised">
        <dl className="container-page grid grid-cols-2 gap-8 py-10 md:grid-cols-4">
          {STATS.map((stat) => (
            <div key={stat.label} className="flex flex-col gap-1">
              <dt className="order-2 text-sm text-[var(--text-secondary)]">
                {stat.label}
              </dt>
              <dd className="order-1 font-[family-name:var(--font-display)] text-3xl font-semibold text-[var(--text-primary)] md:text-4xl">
                {stat.value}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      {/* ---- Four pillars -------------------------------------------- */}
      <Section>
        <SectionHeader
          eyebrow="What we do"
          title="Four ways we work with you"
          description="Whether you are a student figuring out the basics, a team that has stopped functioning, or someone looking for their next role — there is a door here for you."
          align="center"
        />

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {PILLARS.map((pillar) => (
            <Link key={pillar.href} href={pillar.href} className="group">
              <Card interactive className="h-full">
                <CardBody className="gap-4">
                  <span className="grid h-12 w-12 place-items-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent-on-soft)] transition-transform duration-300 group-hover:scale-110">
                    <Icon name={pillar.icon} size={22} />
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
          ))}
        </div>
      </Section>

      {/* ---- Featured trainings -------------------------------------- */}
      {featuredTrainings.length > 0 && (
        <Section tone="sunken">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <SectionHeader
              eyebrow="Trainings"
              title="Programmes people finish and keep using"
              description="Every programme ends with something concrete you can run on Monday — not a certificate and a folder of slides."
            />
            <ButtonLink href="/trainings" variant="secondary">
              All trainings
              <Icon name="arrow-right" size={16} />
            </ButtonLink>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featuredTrainings.map((t) => (
              <TrainingCard key={t.id} training={t} />
            ))}
          </div>
        </Section>
      )}

      {/* ---- Upcoming events ----------------------------------------- */}
      {upcomingEvents.length > 0 && (
        <Section>
          <div className="flex flex-wrap items-end justify-between gap-6">
            <SectionHeader
              eyebrow="Events"
              title="What's coming up"
              description="Masterclasses, bootcamps and community evenings across Singapore."
            />
            <ButtonLink href="/events" variant="secondary">
              All events
              <Icon name="arrow-right" size={16} />
            </ButtonLink>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {upcomingEvents.map((e) => (
              <EventCard key={e.id} event={e} />
            ))}
          </div>
        </Section>
      )}

      {/* ---- Consultancy --------------------------------------------- */}
      <Section tone="sunken">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div className="relative aspect-[4/3] overflow-hidden rounded-[var(--radius-card)] shadow-[var(--shadow-lift)]">
            <Image
              src="/Images/Trainingimgae/consultancy.jpg"
              alt="Consultants working through a capability plan with a client team"
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
            />
          </div>

          <div>
            <SectionHeader
              eyebrow="Consultancy"
              title="When training alone is not the answer"
              description="Sometimes the problem is not a skills gap. We diagnose what is actually happening, then build the fix with you — and hand it over so it does not depend on us."
            />

            <ul className="mt-8 flex flex-col gap-3">
              {services.map((s) => (
                <li key={s.id}>
                  <Link
                    href={`/consultancy/${s.slug}`}
                    className="group flex items-start gap-3 rounded-xl p-3 transition-colors hover:bg-[var(--surface)]"
                  >
                    <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent-on-soft)]">
                      <Icon name="check" size={16} />
                    </span>
                    <span>
                      <span className="block font-medium text-[var(--text-primary)] group-hover:text-[var(--accent)]">
                        {s.title}
                      </span>
                      <span className="block text-sm text-[var(--text-secondary)]">
                        {s.summary}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>

            <ButtonLink href="/consultancy" className="mt-8">
              Explore consultancy
              <Icon name="arrow-right" size={16} />
            </ButtonLink>
          </div>
        </div>
      </Section>

      {/* ---- Careers -------------------------------------------------- */}
      {jobs.length > 0 && (
        <Section>
          <div className="flex flex-wrap items-end justify-between gap-6">
            <SectionHeader
              eyebrow="Careers"
              title="Come build this with us"
              description="We are a small team in Singapore with more demand than capacity. If the work above sounds like something you would be good at, we would like to hear from you."
            />
            <ButtonLink href="/careers" variant="secondary">
              All openings
              <Icon name="arrow-right" size={16} />
            </ButtonLink>
          </div>

          <ul className="mt-12 flex flex-col gap-3">
            {jobs.map((job) => {
              const salary = formatSalaryRange(
                job.salaryMin,
                job.salaryMax,
                job.currency,
              );
              return (
                <li key={job.id}>
                  <Link
                    href={`/careers/${job.slug}`}
                    className="group flex flex-wrap items-center gap-4 rounded-[var(--radius-card)] border border-[var(--border-subtle)] surface-raised p-5 transition-all hover:-translate-y-0.5 hover:border-[var(--accent)]/40 hover:shadow-[var(--shadow-lift)]"
                  >
                    <div className="min-w-0 flex-1">
                      <h3 className="text-lg group-hover:text-[var(--accent)]">
                        {job.title}
                      </h3>
                      <p className="mt-1 line-clamp-1 text-sm text-[var(--text-secondary)]">
                        {job.summary}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge>{job.department}</Badge>
                      <Badge tone="info">{job.workMode}</Badge>
                      {salary && <Badge tone="accent">{salary}</Badge>}
                    </div>
                    <Icon
                      name="arrow-right"
                      className="shrink-0 text-[var(--text-muted)] transition-transform group-hover:translate-x-1 group-hover:text-[var(--accent)]"
                    />
                  </Link>
                </li>
              );
            })}
          </ul>
        </Section>
      )}

      {/* ---- From the blog -------------------------------------------- */}
      {posts.length > 0 && (
        <Section tone="sunken">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <SectionHeader
              eyebrow="Blog"
              title="What we've learned doing the work"
              description="Notes from our facilitators and consultants — including the things we got wrong."
            />
            <ButtonLink href="/blog" variant="secondary">
              All articles
              <Icon name="arrow-right" size={16} />
            </ButtonLink>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <PostCard key={post.slug} post={post} />
            ))}
          </div>
        </Section>
      )}

      {/* ---- Closing CTA ---------------------------------------------- */}
      <section className="border-t border-[var(--border-subtle)] bg-[var(--color-ink-950)] py-20">
        <div className="container-page flex flex-col items-center gap-6 text-center">
          <h2 className="max-w-2xl text-3xl text-white md:text-4xl">
            Not sure which of the four you need?
          </h2>
          <p className="max-w-xl text-white/70">
            Tell us what is happening and we will point you to the right one —
            including telling you when the answer is none of them.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <ButtonLink href="/contact" size="lg">
              Start a conversation
            </ButtonLink>
            <ButtonLink
              href="/about"
              size="lg"
              variant="secondary"
              className="border-white/25 bg-transparent text-white hover:border-white hover:bg-white/10 hover:text-white"
            >
              About SingAdvisor
            </ButtonLink>
          </div>
        </div>
      </section>
    </>
  );
}

export const metadata = {
  description:
    "SingAdvisor runs trainings, events and consultancy engagements in Singapore for students, corporate teams and professionals — and is hiring.",
};
