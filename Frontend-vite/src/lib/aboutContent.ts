/**
 * The About page's copy: the wording it shipped with, plus the keys an admin
 * can override in Settings -> About (GET /settings/public -> `about`).
 *
 * Shared by the public page (which merges overrides over these) and the
 * Settings form (which pre-fills from them), so both always agree on what
 * "unedited" means. A blank override falls back to the default here.
 */

export type AboutContent = {
  metaDescription: string;
  heroEyebrow: string;
  heroTitle: string;
  heroDescription: string;
  storyEyebrow: string;
  storyTitle: string;
  /** Paragraphs separated by a blank line. */
  story: string;
  missionLabel: string;
  missionTitle: string;
  missionBody: string;
  visionLabel: string;
  visionTitle: string;
  visionBody: string;
  principlesEyebrow: string;
  principlesTitle: string;
  principlesDescription: string;
  principle1Title: string;
  principle1Body: string;
  principle2Title: string;
  principle2Body: string;
  principle3Title: string;
  principle3Body: string;
  principle4Title: string;
  principle4Body: string;
  teamEyebrow: string;
  teamTitle: string;
  ctaTitle: string;
  ctaBody: string;
};

export type AboutKey = keyof AboutContent;

export const ABOUT_DEFAULTS: AboutContent = {
  metaDescription:
    "SingAdvisor is a Singapore learning and consultancy practice working with students, corporate teams and professionals since 2016.",
  heroEyebrow: "About",
  heroTitle: "A small practice with a narrow definition of success",
  heroDescription:
    "Since 2016 we have worked with students, corporate teams and professionals across Singapore. We are deliberately small, which means the person who scopes your work is usually the person who does it.",
  storyEyebrow: "Our story",
  storyTitle: "Why we started",
  story: [
    "SingAdvisor began with a free weekend workshop for students on managing time and money — the two things that derail more early careers than any skills gap. It filled up, ran again, and kept running.",
    "Corporate clients started asking for the same material for their teams. That grew into leadership and communication programmes, which in turn surfaced a recurring pattern: organisations kept buying training for problems that training could not solve. So we built a consultancy practice to work on those properly.",
    "Today we run four things — trainings, events, consultancy engagements and a hiring pipeline of people who care about this work. The free student programmes still run, and they always will.",
  ].join("\n\n"),
  missionLabel: "Mission",
  missionTitle: "Make capability building actually work",
  missionBody:
    "To design and deliver learning that changes what people do, and to be honest about when it has not.",
  visionLabel: "Vision",
  visionTitle: "A region that measures learning by its effect",
  visionBody:
    "A Southeast Asian market where organisations judge learning investment by behaviour change rather than attendance.",
  principlesEyebrow: "How we work",
  principlesTitle: "Four things we hold to",
  principlesDescription:
    "These are not aspirations on a wall — they decide which engagements we take and how we run them.",
  principle1Title: "Measure the change, not the mood",
  principle1Body:
    "A programme that everyone enjoyed and nobody applied has failed. We build measurement into the design and report it honestly, including when the answer is unflattering.",
  principle2Title: "Practical over comprehensive",
  principle2Body:
    "We would rather you leave with three things you will genuinely use than thirty you will not. Every session ends with something concrete you can act on.",
  principle3Title: "Say no to bad-fit work",
  principle3Body:
    "If we do not think we can help, we say so and point you elsewhere. It costs us engagements and it is why our recommendations are worth something.",
  principle4Title: "Build capability, not dependency",
  principle4Body:
    "Our consultancy engagements end with your team owning the work. If you need us permanently, we designed it wrong.",
  teamEyebrow: "The team",
  teamTitle: "Who you'll actually work with",
  ctaTitle: "Want to work with us — or for us?",
  ctaBody:
    "Clients, participants and candidates all start the same way: tell us what you are trying to change.",
};

/** Overrides over defaults; a blank or missing override keeps the default. */
export function resolveAbout(overrides?: Partial<Record<string, string>> | null): AboutContent {
  const out = { ...ABOUT_DEFAULTS };
  if (!overrides) return out;
  for (const key of Object.keys(ABOUT_DEFAULTS) as AboutKey[]) {
    const v = overrides[key];
    if (typeof v === "string" && v.trim()) out[key] = v;
  }
  return out;
}

/** "Para one\n\nPara two" -> ["Para one", "Para two"]. */
export function splitParagraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}
