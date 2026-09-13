/**
 * Admin-only client for the course-content module — like crmClient.ts (and
 * unlike contentClient.ts + adminActions.ts), every curriculum route is
 * Bearer-guarded and the builder's writes are granular rather than whole-form,
 * so reads and writes both go through apiJson({ admin: true }) rather than a
 * FormData action.
 *
 * apiJson takes a BARE path — it prepends __API_URL__ itself, unlike
 * adminFetch — and throws an Error carrying the Backend's own message, so
 * every function here throws rather than returning a FormState. Callers hold a
 * local `error` string and render it through <FormError>.
 *
 * The public curriculum read (GET /course-content/public/:slug) is deliberately
 * absent: it needs no token and belongs with the other public reads in
 * contentClient.ts.
 */
import { apiJson } from "@/lib/adminFetch";
import type { CourseItemKind } from "@/lib/course-content";

export type QuizOptionDoc = {
  id: string;
  text: string;
  correct: boolean;
};

export type QuizQuestionDoc = {
  id: string;
  /** single | multiple | true-false */
  type: string;
  prompt: string;
  options: QuizOptionDoc[];
  explanation: string;
  points: number;
};

export type CourseAttachmentDoc = {
  id: string;
  label: string;
  url: string;
};

export type CourseModuleDoc = {
  _id: string;
  trainingId: string;
  sortOrder: number;
  title: string;
  summary: string;
  published: boolean;
  createdAt: string;
  updatedAt: string;
};

/**
 * Flat and polymorphic, exactly as the Backend stores it: `kind` decides which
 * of the payload fields below mean anything, and every other field still
 * carries its schema default. A `resource` row really does arrive with
 * passMarkPct: 70 and videoProvider: "youtube" — check `kind` before trusting
 * any of them.
 */
export type CourseItemDoc = {
  _id: string;
  courseModuleId: string;
  trainingId: string;
  sortOrder: number;
  /** Opens a lesson group; inherited by every item after it until the next. */
  lessonHeading: string | null;
  kind: CourseItemKind;
  title: string;
  summary: string;
  /** MINUTES, never hours — see formatMins in lib/course-content.ts. */
  estimatedMins: number;
  /** immediately | after-previous | on-day */
  releaseRule: string;
  releaseOnDay: number | null;
  optional: boolean;
  previewFree: boolean;
  published: boolean;
  graded: boolean;
  gradeWeight: number;
  passMarkPct: number;
  videoUrl: string | null;
  /** youtube | vimeo | file */
  videoProvider: string;
  body: string;
  questions: QuizQuestionDoc[];
  attemptsAllowed: number;
  shuffleQuestions: boolean;
  /** file | text | link | offline */
  submissionType: string;
  dueOnDay: number | null;
  attachments: CourseAttachmentDoc[];
  createdAt: string;
  updatedAt: string;
};

/** The five figures the Content tab shows against a course and the builder
 * shows in its heading — the same numbers either way, so the same shape. */
export type CurriculumTotals = {
  moduleCount: number;
  itemCount: number;
  publishedItemCount: number;
  totalMins: number;
  gradeWeightTotal: number;
};

export type CurriculumSummary = CurriculumTotals & { trainingId: string };

export type CurriculumTree = {
  /** Read-only, and `modules` here is the brochure "Session outline", not this
   * curriculum: the builder's empty state offers to seed from it. Nothing on
   * either side ever writes Training.modules back. */
  training: {
    _id: string;
    title: string;
    slug: string;
    published: boolean;
    durationHrs: number;
    modules: string[];
  };
  modules: (CourseModuleDoc & { items: CourseItemDoc[] })[];
  totals: CurriculumTotals;
};

/** A brand-new option or question arrives with no `id` — the Backend mints one
 * and it comes back in the next read. */
export type QuizOptionInput = {
  id?: string;
  text: string;
  correct?: boolean;
};

export type QuizQuestionInput = {
  id?: string;
  type?: string;
  prompt: string;
  options?: QuizOptionInput[];
  explanation?: string;
  points?: number;
};

export type CourseAttachmentInput = {
  id?: string;
  label: string;
  url: string;
};

export type CourseModuleInput = {
  title: string;
  summary?: string;
  published?: boolean;
  sortOrder?: number;
};

/**
 * Everything CreateCourseItemDto declares as writable, minus `kind` (which the
 * create takes alongside this and the update cannot change at all). A PATCH
 * takes any subset: UpdateCourseItemDto is a PartialType of the same class.
 *
 * Keep this in step with the DTO — the global ValidationPipe runs with
 * `whitelist: true`, so a field the DTO does not declare is silently stripped
 * rather than rejected, and the write just quietly does nothing.
 */
export type CourseItemInput = {
  title: string;
  summary?: string;
  lessonHeading?: string | null;
  estimatedMins?: number;
  sortOrder?: number;
  releaseRule?: string;
  releaseOnDay?: number | null;
  optional?: boolean;
  previewFree?: boolean;
  published?: boolean;
  graded?: boolean;
  gradeWeight?: number;
  passMarkPct?: number;
  videoUrl?: string | null;
  videoProvider?: string;
  body?: string;
  questions?: QuizQuestionInput[];
  attemptsAllowed?: number;
  shuffleQuestions?: boolean;
  submissionType?: string;
  dueOnDay?: number | null;
  attachments?: CourseAttachmentInput[];
};

/** What publish-all reports back: partial with a list of refusals, never
 * all-or-nothing. `published` counts the items actually written, whichever way
 * they went; `skipped` names the rest and gives the coherence rule that
 * stopped each one. */
export type PublishAllResult = {
  tree: CurriculumTree;
  published: number;
  skipped: { title: string; reason: string }[];
};

const json = { "Content-Type": "application/json" } as const;

/** One row per course that has any curriculum at all — the Content tab merges
 * these into the training list by id. Courses with nothing built yet are
 * simply absent. */
export function fetchCurriculumSummaries(): Promise<CurriculumSummary[]> {
  return apiJson(`/course-content/summary`, { admin: true });
}

export function fetchCurriculum(trainingId: string): Promise<CurriculumTree> {
  return apiJson(`/course-content/trainings/${trainingId}`, { admin: true });
}

export function createModule(
  trainingId: string,
  body: CourseModuleInput,
): Promise<CourseModuleDoc> {
  return apiJson(`/course-content/trainings/${trainingId}/modules`, {
    admin: true,
    method: "POST",
    headers: json,
    body: JSON.stringify(body),
  });
}

/** Bootstraps one empty module per line of the brochure "Session outline".
 * Refused once the course has any content — it only ever seeds an empty
 * curriculum, and it never writes Training.modules back. */
export function seedFromOutline(trainingId: string): Promise<CurriculumTree> {
  return apiJson(`/course-content/trainings/${trainingId}/seed-from-outline`, {
    admin: true,
    method: "POST",
  });
}

/** The whole outline as the builder now has it — every module, and every item
 * under the module it now sits in. A partial payload is refused: the Backend
 * checks this names exactly the rows the course holds today, so a stale tab
 * cannot strand a row someone else just added. */
export function reorderOutline(
  trainingId: string,
  body: { modules: { id: string; itemIds: string[] }[] },
): Promise<CurriculumTree> {
  return apiJson(`/course-content/trainings/${trainingId}/order`, {
    admin: true,
    method: "PATCH",
    headers: json,
    body: JSON.stringify(body),
  });
}

export function updateModule(
  moduleId: string,
  body: Partial<CourseModuleInput>,
): Promise<CourseModuleDoc> {
  return apiJson(`/course-content/modules/${moduleId}`, {
    admin: true,
    method: "PATCH",
    headers: json,
    body: JSON.stringify(body),
  });
}

/** Takes the module's items with it. DeleteButton's `action` prop returns
 * Promise<void>, so wrap at the call site rather than passing this directly. */
export function deleteModule(moduleId: string): Promise<CourseModuleDoc> {
  return apiJson(`/course-content/modules/${moduleId}`, { admin: true, method: "DELETE" });
}

export function duplicateModule(moduleId: string): Promise<CurriculumTree> {
  return apiJson(`/course-content/modules/${moduleId}/duplicate`, {
    admin: true,
    method: "POST",
  });
}

export function publishAllInModule(
  moduleId: string,
  published: boolean,
): Promise<PublishAllResult> {
  return apiJson(`/course-content/modules/${moduleId}/publish-all`, {
    admin: true,
    method: "PATCH",
    headers: json,
    body: JSON.stringify({ published }),
  });
}

export function createItem(
  moduleId: string,
  body: CourseItemInput & { kind: CourseItemKind },
): Promise<CourseItemDoc> {
  return apiJson(`/course-content/modules/${moduleId}/items`, {
    admin: true,
    method: "POST",
    headers: json,
    body: JSON.stringify(body),
  });
}

export function updateItem(
  itemId: string,
  body: Partial<CourseItemInput>,
): Promise<CourseItemDoc> {
  return apiJson(`/course-content/items/${itemId}`, {
    admin: true,
    method: "PATCH",
    headers: json,
    body: JSON.stringify(body),
  });
}

export function deleteItem(itemId: string): Promise<CourseItemDoc> {
  return apiJson(`/course-content/items/${itemId}`, { admin: true, method: "DELETE" });
}

export function duplicateItem(itemId: string): Promise<CurriculumTree> {
  return apiJson(`/course-content/items/${itemId}/duplicate`, {
    admin: true,
    method: "POST",
  });
}
