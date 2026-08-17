import type {
  LandingSectionKey,
  HeroContent,
  StatsContent,
  PillarsContent,
  ConsultancyContent,
  CtaContent,
  ListContent,
} from "@/lib/landing-client";

/**
 * Mirrors Backend/scripts/seed-landing.ts's defaults exactly — both are
 * copied verbatim from what used to be hardcoded directly in page.tsx. This
 * copy is the safety net: if the Backend is unreachable, or a section row is
 * missing, the homepage renders this instead of going blank. Keep in sync
 * with the seed script if the "default" copy is ever intentionally changed
 * (as opposed to edited through the admin, which only touches the DB).
 */
export const LANDING_DEFAULTS: Record<LandingSectionKey, unknown> = {
  hero: {
    eyebrow: "Singapore · Since 2016",
    title: "Skills that hold up",
    titleAccent: "under a real week.",
    description:
      "We run trainings, events and consultancy engagements built around one test: does the change still hold six months later? And we are hiring the people who help us meet it.",
    primaryCtaLabel: "Browse {count} programmes",
    primaryCtaHref: "/trainings",
    secondaryCtaLabel: "Talk to a consultant",
    secondaryCtaHref: "/consultancy",
    videoSrc: "/Vedios/trainingvedio.mp4",
    posterSrc: "/Images/Trainingimgae/traing.jpg",
  } satisfies HeroContent,

  stats: {
    items: [
      { value: "12,000+", label: "People trained" },
      { value: "180+", label: "Corporate programmes" },
      { value: "40+", label: "Events hosted" },
      { value: "4.8/5", label: "Average rating" },
    ],
  } satisfies StatsContent,

  pillars: {
    items: [
      {
        title: "Trainings",
        description:
          "Practical programmes for students, corporate teams and professionals — time, money, health, emotions, leadership and communication.",
      },
      {
        title: "Events",
        description:
          "Masterclasses, bootcamps and community evenings. Come for the sessions, stay for the people you meet.",
      },
      {
        title: "Consultancy",
        description:
          "Learning strategy, leadership pipelines and team diagnostics — engagements that end with your team able to run it themselves.",
      },
      {
        title: "Careers",
        description:
          "We are hiring facilitators, designers and operators who care about whether the learning actually sticks.",
      },
    ],
  } satisfies PillarsContent,

  trainings: {
    eyebrow: "Trainings",
    title: "Programmes people finish and keep using",
    description:
      "Every programme ends with something concrete you can run on Monday — not a certificate and a folder of slides.",
    ctaLabel: "All trainings",
    ctaHref: "/trainings",
    take: 3,
  } satisfies ListContent,

  events: {
    eyebrow: "Events",
    title: "What's coming up",
    description: "Masterclasses, bootcamps and community evenings across Singapore.",
    ctaLabel: "All events",
    ctaHref: "/events",
    take: 3,
  } satisfies ListContent,

  consultancy: {
    eyebrow: "Consultancy",
    title: "When training alone is not the answer",
    description:
      "Sometimes the problem is not a skills gap. We diagnose what is actually happening, then build the fix with you — and hand it over so it does not depend on us.",
    image: "/Images/Trainingimgae/consultancy.jpg",
    ctaLabel: "Explore consultancy",
    ctaHref: "/consultancy",
  } satisfies ConsultancyContent,

  careers: {
    eyebrow: "Careers",
    title: "Come build this with us",
    description:
      "We are a small team in Singapore with more demand than capacity. If the work above sounds like something you would be good at, we would like to hear from you.",
    ctaLabel: "All openings",
    ctaHref: "/careers",
    take: 3,
  } satisfies ListContent,

  blog: {
    eyebrow: "Blog",
    title: "What we've learned doing the work",
    description: "Notes from our facilitators and consultants — including the things we got wrong.",
    ctaLabel: "All articles",
    ctaHref: "/blog",
    take: 3,
  } satisfies ListContent,

  cta: {
    title: "Not sure which of the four you need?",
    description:
      "Tell us what is happening and we will point you to the right one — including telling you when the answer is none of them.",
    primaryCtaLabel: "Start a conversation",
    primaryCtaHref: "/contact",
    secondaryCtaLabel: "About SingAdvisor",
    secondaryCtaHref: "/about",
  } satisfies CtaContent,
};

export const LANDING_DEFAULT_ORDER: LandingSectionKey[] = [
  "hero",
  "stats",
  "pillars",
  "trainings",
  "events",
  "consultancy",
  "careers",
  "blog",
  "cta",
];
