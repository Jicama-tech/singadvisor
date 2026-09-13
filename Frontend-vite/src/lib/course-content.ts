/**
 * The curriculum vocabulary, shared by everything that renders an item.
 *
 * No fetching happens here (that is courseContentClient.ts) — this is the one
 * place an item kind is described, so the outline, the item editor, the
 * preview and the "Add item" picker can never disagree about what a quiz is
 * called or which icon it wears. The kinds and their order mirror
 * COURSE_ITEM_KINDS in the Backend's course-item.entity.ts, which is what the
 * DTO's @IsIn validates against.
 */
import type { BadgeTone } from "@/components/ui/Badge";
import type { IconName } from "@/components/ui/Icon";

export const COURSE_ITEM_KINDS = [
  "video",
  "reading",
  "quiz",
  "assignment",
  "discussion",
  "resource",
] as const;

export type CourseItemKind = (typeof COURSE_ITEM_KINDS)[number];

/** Everything the UI knows about a kind, in the order the picker lists them.
 * `blurb` is the one-line description on the picker's choice cards. */
export const ITEM_KINDS: {
  kind: CourseItemKind;
  label: string;
  icon: IconName;
  blurb: string;
  tone: BadgeTone;
}[] = [
  {
    kind: "video",
    label: "Video",
    icon: "play",
    blurb: "A lesson video, with optional slides attached.",
    tone: "accent",
  },
  {
    kind: "reading",
    label: "Reading",
    icon: "type",
    blurb: "Formatted text with images and links.",
    tone: "neutral",
  },
  {
    kind: "quiz",
    label: "Quiz",
    icon: "check",
    blurb: "Multiple-choice questions, graded or practice.",
    tone: "success",
  },
  {
    kind: "assignment",
    label: "Assignment",
    icon: "upload",
    blurb: "A brief learners submit work against.",
    tone: "warn",
  },
  {
    kind: "discussion",
    label: "Discussion",
    icon: "message-circle",
    blurb: "A prompt for the cohort to answer.",
    tone: "info",
  },
  {
    kind: "resource",
    label: "Resource",
    icon: "download",
    blurb: "A downloadable handout or an external link.",
    tone: "neutral",
  },
];

/** Non-null on purpose: `kind` is enum-constrained on the schema, so a row the
 * table does not cover is an item nothing could render anyway. */
export const kindMeta = (k: CourseItemKind) => ITEM_KINDS.find((i) => i.kind === k)!;

/** Keyed to CourseItem.releaseRule. Written in days from a run's first
 * session, never a date — the curriculum belongs to the course and is taught
 * by many intakes. */
export const RELEASE_RULE_LABELS = {
  immediately: "Available immediately",
  "after-previous": "After the previous item",
  "on-day": "On a given day of the run",
} as const;

/** Keyed to CourseItem.submissionType. */
export const SUBMISSION_TYPE_LABELS = {
  file: "File upload",
  text: "Typed response",
  link: "A link",
  offline: "Handed in offline",
} as const;

/** Keyed to QuizQuestion.type. */
export const QUIZ_QUESTION_TYPE_LABELS = {
  single: "Single answer",
  multiple: "Multiple answers",
  "true-false": "True or false",
} as const;

/**
 * Curriculum lengths are authored in MINUTES. formatDuration() in lib/utils.ts
 * takes HOURS — feeding it `mins / 60` renders 100 minutes as
 * "1.6666666666666667 hrs". Use this instead, everywhere in the builder.
 */
export function formatMins(mins: number): string {
  if (mins <= 0) return "—";
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h} hr${h === 1 ? "" : "s"}` : `${h} hr ${m} min`;
}

/** YouTube/Vimeo watch URLs → their embed form, for the preview <iframe>.
 * Returns null for anything else (an /uploads/... path, a direct .mp4), which
 * the caller renders with <video controls> instead. */
export function embedUrl(url: string): string | null {
  const yt = url.match(
    /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/,
  );
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  const vm = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vm) return `https://player.vimeo.com/video/${vm[1]}`;
  return null;
}
