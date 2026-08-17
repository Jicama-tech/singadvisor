import type { Metadata } from "next";
import { AppImage as Image } from "@/components/ui/AppImage";
import { ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { PageHero, Section, SectionHeader } from "@/components/ui/Section";
import { db } from "@/lib/db";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "About",
  description:
    "SingAdvisor is a Singapore learning and consultancy practice working with students, corporate teams and professionals since 2016.",
};

const PRINCIPLES = [
  {
    title: "Measure the change, not the mood",
    body: "A programme that everyone enjoyed and nobody applied has failed. We build measurement into the design and report it honestly, including when the answer is unflattering.",
  },
  {
    title: "Practical over comprehensive",
    body: "We would rather you leave with three things you will genuinely use than thirty you will not. Every session ends with something concrete you can act on.",
  },
  {
    title: "Say no to bad-fit work",
    body: "If we do not think we can help, we say so and point you elsewhere. It costs us engagements and it is why our recommendations are worth something.",
  },
  {
    title: "Build capability, not dependency",
    body: "Our consultancy engagements end with your team owning the work. If you need us permanently, we designed it wrong.",
  },
];

export default async function AboutPage() {
  const trainers = await db.trainer.findMany({ orderBy: { name: "asc" } });

  return (
    <>
      <PageHero
        eyebrow="About"
        title="A small practice with a narrow definition of success"
        description="Since 2016 we have worked with students, corporate teams and professionals across Singapore. We are deliberately small, which means the person who scopes your work is usually the person who does it."
      />

      {/* ---- Story ------------------------------------------------------- */}
      <Section>
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
          <div className="prose-body">
            <SectionHeader eyebrow="Our story" title="Why we started" />
            <div className="mt-5">
              <p>
                SingAdvisor began with a free weekend workshop for students on
                managing time and money — the two things that derail more early
                careers than any skills gap. It filled up, ran again, and kept
                running.
              </p>
              <p>
                Corporate clients started asking for the same material for their
                teams. That grew into leadership and communication programmes,
                which in turn surfaced a recurring pattern: organisations kept
                buying training for problems that training could not solve. So
                we built a consultancy practice to work on those properly.
              </p>
              <p>
                Today we run four things — trainings, events, consultancy
                engagements and a hiring pipeline of people who care about this
                work. The free student programmes still run, and they always
                will.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 self-start">
            <div className="relative aspect-[3/4] overflow-hidden rounded-[var(--radius-card)] shadow-[var(--shadow-lift)]">
              <Image
                src="/Images/Trainingimgae/who1.webp"
                alt="A SingAdvisor facilitator leading a session"
                fill
                sizes="(max-width: 1024px) 50vw, 25vw"
                className="object-cover"
              />
            </div>
            <div className="relative mt-8 aspect-[3/4] overflow-hidden rounded-[var(--radius-card)] shadow-[var(--shadow-lift)]">
              <Image
                src="/Images/Trainingimgae/traing.jpg"
                alt="Participants working through an exercise in small groups"
                fill
                sizes="(max-width: 1024px) 50vw, 25vw"
                className="object-cover"
              />
            </div>
          </div>
        </div>
      </Section>

      {/* ---- Mission & vision --------------------------------------------- */}
      <Section tone="sunken">
        <div className="grid gap-6 md:grid-cols-2">
          {[
            {
              image: "/Images/Trainingimgae/mission.jpg",
              label: "Mission",
              title: "Make capability building actually work",
              body: "To design and deliver learning that changes what people do, and to be honest about when it has not.",
            },
            {
              image: "/Images/Trainingimgae/vision.jpeg",
              label: "Vision",
              title: "A region that measures learning by its effect",
              body: "A Southeast Asian market where organisations judge learning investment by behaviour change rather than attendance.",
            },
          ].map((item) => (
            <div
              key={item.label}
              className="overflow-hidden rounded-[var(--radius-card)] surface-raised shadow-[var(--shadow-soft)]"
            >
              <div className="relative aspect-[16/9]">
                <Image
                  src={item.image}
                  alt=""
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-cover"
                />
              </div>
              <div className="p-7">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">
                  {item.label}
                </span>
                <h3 className="mt-2 text-2xl">{item.title}</h3>
                <p className="mt-3 leading-relaxed text-[var(--text-secondary)]">
                  {item.body}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* ---- Principles ---------------------------------------------------- */}
      <Section>
        <SectionHeader
          eyebrow="How we work"
          title="Four things we hold to"
          description="These are not aspirations on a wall — they decide which engagements we take and how we run them."
          align="center"
        />
        <div className="mt-12 grid gap-6 md:grid-cols-2">
          {PRINCIPLES.map((p, i) => (
            <div
              key={p.title}
              className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] p-7"
            >
              <span className="font-[family-name:var(--font-display)] text-3xl font-semibold text-[var(--accent)]/30">
                0{i + 1}
              </span>
              <h3 className="mt-3 text-xl">{p.title}</h3>
              <p className="mt-2 leading-relaxed text-[var(--text-secondary)]">
                {p.body}
              </p>
            </div>
          ))}
        </div>
      </Section>

      {/* ---- Team ---------------------------------------------------------- */}
      {trainers.length > 0 && (
        <Section tone="sunken">
          <SectionHeader
            eyebrow="The team"
            title="Who you'll actually work with"
            align="center"
          />
          <div className="mx-auto mt-12 grid max-w-4xl gap-6 sm:grid-cols-2">
            {trainers.map((t) => (
              <div
                key={t.id}
                className="flex flex-col gap-4 rounded-[var(--radius-card)] surface-raised p-7 shadow-[var(--shadow-soft)] sm:flex-row"
              >
                <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full surface-sunken">
                  <Image
                    src={t.photo}
                    alt=""
                    fill
                    sizes="96px"
                    className="object-cover"
                  />
                </div>
                <div>
                  <h3 className="text-lg">{t.name}</h3>
                  <p className="text-sm text-[var(--accent)]">{t.title}</p>
                  <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">
                    {t.bio}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* ---- CTA ----------------------------------------------------------- */}
      <Section>
        <div className="flex flex-col items-center gap-6 rounded-[var(--radius-card)] bg-[var(--color-ink-950)] px-6 py-16 text-center">
          <h2 className="max-w-2xl text-3xl text-white md:text-4xl">
            Want to work with us — or for us?
          </h2>
          <p className="max-w-xl text-white/70">
            Clients, participants and candidates all start the same way: tell us
            what you are trying to change.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <ButtonLink href="/contact" size="lg">
              Get in touch
              <Icon name="arrow-right" size={18} />
            </ButtonLink>
            <ButtonLink
              href="/careers"
              size="lg"
              variant="secondary"
              className="border-white/25 bg-transparent text-white hover:border-white hover:bg-white/10 hover:text-white"
            >
              See open roles
            </ButtonLink>
          </div>
        </div>
      </Section>
    </>
  );
}
