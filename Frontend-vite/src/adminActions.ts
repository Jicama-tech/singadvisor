/**
 * Client-side port of the Next app's `src/app/admin/actions.ts` — the admin
 * mutations. Same exported names, same FormData-in contract, but each now
 * performs its fetch against the Backend's REST endpoints (content domains:
 * Phase 10a modules; landing: the pre-existing landing controller) with the
 * session Bearer token. On success these return { ok: true } (or void for
 * deletes) and the PAGE navigates — the old server actions' redirect() has
 * no SPA equivalent, navigation is the caller's job.
 *
 * The events family (saveEvent etc.) lives with the Events phase — EventForm
 * needs its own full FormData-port alongside it.
 */
import {
  LandingServiceError,
  patchLandingSectionContent,
  patchLandingSectionMove,
  patchLandingSectionVariant,
  patchLandingSectionVisibility,
  uploadLandingMedia,
} from "@/lib/landing-admin-client";
import type { LandingSectionKey, LandingVariant } from "@/lib/landing-client";
import { LANDING_VARIANTS } from "@/lib/landing-client";
import { collectValues, type FormState } from "@/lib/form-state";
import { slugify } from "@/lib/utils";
import {
  EventsServiceError,
  createEvent,
  deleteEvent as deleteEventBackend,
  fetchEventAdmin,
  updateEvent as updateEventBackend,
  uploadEventImage,
} from "@/lib/events-admin-client";
import type {
  PositionedRoundTable,
  PositionedScheduledSpace,
  PositionedSpeakerZone,
  PositionedTable,
  VenueAnnotation,
} from "@/lib/events-client";

const str = (fd: FormData, key: string) => {
  const v = fd.get(key);
  return typeof v === "string" ? v : "";
};
const num = (fd: FormData, key: string, fallback = 0) => {
  const n = Number(str(fd, key));
  return Number.isFinite(n) ? n : fallback;
};
const bool = (fd: FormData, key: string) => str(fd, key) === "true";
const nullable = (fd: FormData, key: string) => {
  const v = str(fd, key);
  return v === "" ? null : v;
};

/** The Backend now stores these as real arrays (Prisma used JSON strings) —
 * the textarea one-per-line convention stays, only the encoding changes. */
function linesToArray(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

async function sendJson(
  method: string,
  path: string,
  body?: unknown,
): Promise<{ ok: boolean; data: unknown }> {
  let response: Response;
  try {
    response = await fetch(`${__API_URL__}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(sessionStorage.getItem("token")
          ? { Authorization: `Bearer ${sessionStorage.getItem("token")}` }
          : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
  } catch {
    throw new Error("The server is unreachable right now.");
  }
  let data: unknown = {};
  try {
    data = await response.json();
  } catch {
    /* non-JSON body */
  }
  return { ok: response.ok, data };
}

function backendMessage(data: unknown, fallback: string): string {
  if (data && typeof data === "object" && "message" in data) {
    const m = (data as { message: unknown }).message;
    if (Array.isArray(m)) return m.map(String).join(" ");
    if (typeof m === "string") return m;
  }
  return fallback;
}

async function errorState(err: unknown, fd: FormData, fallback: string): Promise<FormState> {
  if (err instanceof Error) {
    return { ok: false, message: err.message || fallback, values: collectValues(fd) };
  }
  return { ok: false, message: fallback, values: collectValues(fd) };
}

// ---------------------------------------------------------------------------
// Trainings
// ---------------------------------------------------------------------------

export async function saveTraining(formData: FormData): Promise<FormState> {
  const id = str(formData, "id") || null;
  const title = str(formData, "title");
  if (!title)
    return { ok: false, errors: { title: "Title is required." }, values: collectValues(formData) };

  const body = {
    title,
    slug: str(formData, "slug") || slugify(title),
    summary: str(formData, "summary"),
    description: str(formData, "description"),
    image: str(formData, "image") || "/Images/Trainingimgae/traing.jpg",
    category: str(formData, "category") || "Student",
    level: str(formData, "level") || "All levels",
    durationHrs: num(formData, "durationHrs", 2),
    format: str(formData, "format") || "In-person",
    priceCents: Math.round(num(formData, "price") * 100),
    outcomes: linesToArray(str(formData, "outcomes")),
    modules: linesToArray(str(formData, "modules")),
    published: bool(formData, "published"),
    featured: bool(formData, "featured"),
    sortOrder: num(formData, "sortOrder"),
    trainerId: nullable(formData, "trainerId"),
  };

  try {
    const result = id
      ? await sendJson("PATCH", `/trainings/${id}`, body)
      : await sendJson("POST", "/trainings", body);
    if (!result.ok)
      return { ok: false, message: backendMessage(result.data, "Could not save the training."), values: collectValues(formData) };
    return { ok: true };
  } catch (err) {
    return errorState(err, formData, "Could not save the training.");
  }
}

export async function deleteTraining(id: string): Promise<void> {
  await sendJson("DELETE", `/trainings/${id}`);
}

// ---------------------------------------------------------------------------
// Consultancy services
// ---------------------------------------------------------------------------

export async function saveService(formData: FormData): Promise<FormState> {
  const id = str(formData, "id") || null;
  const title = str(formData, "title");
  if (!title)
    return { ok: false, errors: { title: "Title is required." }, values: collectValues(formData) };

  const body = {
    title,
    slug: str(formData, "slug") || slugify(title),
    summary: str(formData, "summary"),
    description: str(formData, "description"),
    image: str(formData, "image") || "/Images/Trainingimgae/consultancy.jpg",
    icon: str(formData, "icon") || "compass",
    engagement: str(formData, "engagement") || "Project-based",
    deliverables: linesToArray(str(formData, "deliverables")),
    idealFor: linesToArray(str(formData, "idealFor")),
    published: bool(formData, "published"),
    sortOrder: num(formData, "sortOrder"),
  };

  try {
    const result = id
      ? await sendJson("PATCH", `/consultancy-services/${id}`, body)
      : await sendJson("POST", "/consultancy-services", body);
    if (!result.ok)
      return { ok: false, message: backendMessage(result.data, "Could not save the service."), values: collectValues(formData) };
    return { ok: true };
  } catch (err) {
    return errorState(err, formData, "Could not save the service.");
  }
}

export async function deleteService(id: string): Promise<void> {
  await sendJson("DELETE", `/consultancy-services/${id}`);
}

// ---------------------------------------------------------------------------
// Job postings
// ---------------------------------------------------------------------------

export async function saveJob(formData: FormData): Promise<FormState> {
  const id = str(formData, "id") || null;
  const title = str(formData, "title");
  if (!title)
    return { ok: false, errors: { title: "Title is required." }, values: collectValues(formData) };

  const closesRaw = str(formData, "closesAt");
  const closesAt = closesRaw ? new Date(closesRaw) : null;
  if (closesAt && Number.isNaN(closesAt.getTime()))
    return { ok: false, errors: { closesAt: "Enter a valid closing date." }, values: collectValues(formData) };

  const salaryMin = str(formData, "salaryMin") ? num(formData, "salaryMin") : null;
  const salaryMax = str(formData, "salaryMax") ? num(formData, "salaryMax") : null;
  if (salaryMin != null && salaryMax != null && salaryMax < salaryMin)
    return { ok: false, errors: { salaryMax: "The maximum must be at least the minimum." }, values: collectValues(formData) };

  const body = {
    title,
    slug: str(formData, "slug") || slugify(title),
    department: str(formData, "department") || "General",
    location: str(formData, "location") || "Singapore",
    employment: str(formData, "employment") || "Full-time",
    workMode: str(formData, "workMode") || "On-site",
    experience: str(formData, "experience") || "2-4 years",
    salaryMin,
    salaryMax,
    summary: str(formData, "summary"),
    description: str(formData, "description"),
    requirements: linesToArray(str(formData, "requirements")),
    benefits: linesToArray(str(formData, "benefits")),
    published: bool(formData, "published"),
    closesAt: closesAt ? closesAt.toISOString() : null,
  };

  try {
    const result = id
      ? await sendJson("PATCH", `/careers/jobs/${id}`, body)
      : await sendJson("POST", "/careers/jobs", body);
    if (!result.ok)
      return { ok: false, message: backendMessage(result.data, "Could not save the role."), values: collectValues(formData) };
    return { ok: true };
  } catch (err) {
    return errorState(err, formData, "Could not save the role.");
  }
}

export async function deleteJob(id: string): Promise<void> {
  await sendJson("DELETE", `/careers/jobs/${id}`);
}

// ---------------------------------------------------------------------------
// Blog posts
// ---------------------------------------------------------------------------

export async function savePost(formData: FormData): Promise<FormState> {
  const id = str(formData, "id") || null;
  const title = str(formData, "title");
  if (!title)
    return { ok: false, errors: { title: "Title is required." }, values: collectValues(formData) };

  const content = str(formData, "content");
  if (!content && !id)
    return { ok: false, errors: { content: "An article needs a body." }, values: collectValues(formData) };

  const publishedAtRaw = str(formData, "publishedAt");
  let publishedAt: string | null = null;
  if (publishedAtRaw) {
    const parsed = new Date(publishedAtRaw);
    if (Number.isNaN(parsed.getTime()))
      return { ok: false, errors: { publishedAt: "Enter a valid date." }, values: collectValues(formData) };
    publishedAt = parsed.toISOString();
  }

  const body = {
    title,
    slug: str(formData, "slug") || slugify(title),
    excerpt: str(formData, "excerpt"),
    content,
    coverImage: str(formData, "coverImage") || "/Images/Trainingimgae/traing.jpg",
    category: str(formData, "category") || "Insights",
    tags: linesToArray(str(formData, "tags")),
    published: bool(formData, "published"),
    featured: bool(formData, "featured"),
    publishedAt,
    authorId: nullable(formData, "authorId"),
  };

  try {
    const result = id
      ? await sendJson("PATCH", `/blog/${id}`, body)
      : await sendJson("POST", "/blog", body);
    if (!result.ok)
      return { ok: false, message: backendMessage(result.data, "Could not save the post."), values: collectValues(formData) };
    return { ok: true };
  } catch (err) {
    return errorState(err, formData, "Could not save the post.");
  }
}

export async function deletePost(id: string): Promise<void> {
  await sendJson("DELETE", `/blog/${id}`);
}

// ---------------------------------------------------------------------------
// Trainers (Training "Facilitator" / Blog "Author")
// ---------------------------------------------------------------------------

export type TrainerInput = {
  name: string;
  title?: string;
  bio?: string;
  photo?: string;
  linkedin?: string | null;
};

/** Plain call, not a FormData action — used by the Blog editor's inline
 * "+ New author" flow, which needs the created record back (id + name) to
 * add it to the picker and select it, not a page navigation. Throws with the
 * Backend's message on failure. */
export async function createTrainer(input: TrainerInput): Promise<{ _id: string; name: string; title: string }> {
  const result = await sendJson("POST", "/trainers", input);
  if (!result.ok) throw new Error(backendMessage(result.data, "Could not create the author."));
  return result.data as { _id: string; name: string; title: string };
}

// ---------------------------------------------------------------------------
// Submission status updates
// ---------------------------------------------------------------------------

export async function updateRegistrationStatus(id: string, status: string): Promise<void> {
  await sendJson("PATCH", `/registrations/${id}/status`, { status });
}

export async function updateEnquiryStatus(id: string, status: string): Promise<void> {
  await sendJson("PATCH", `/consultancy-enquiries/${id}/status`, { status });
}

export async function updateApplicationStatus(id: string, status: string): Promise<void> {
  await sendJson("PATCH", `/careers/applications/${id}/status`, { status });
}

export async function toggleMessageHandled(id: string): Promise<void> {
  await sendJson("PATCH", `/contact-messages/${id}/toggle-handled`);
}

// ---------------------------------------------------------------------------
// Landing sections
// ---------------------------------------------------------------------------

/** An untouched `<input type="file">` still submits an entry — an empty File
 * with no name and zero size — so "was anything actually chosen" has to be
 * checked explicitly, not just truthiness of the FormData entry. */
async function uploadIfPresent(formData: FormData, fieldName: string): Promise<string | null> {
  const file = formData.get(fieldName);
  if (!(file instanceof File) || file.size === 0) return null;
  const { url } = await uploadLandingMedia(file);
  return url;
}

function readVariant(formData: FormData): LandingVariant {
  const value = str(formData, "variant");
  return (LANDING_VARIANTS as readonly string[]).includes(value)
    ? (value as LandingVariant)
    : "modern";
}

function landingErrorState(err: unknown, formData: FormData): FormState {
  if (err instanceof LandingServiceError) {
    return {
      ok: false,
      message: err.fieldErrors?.length ? err.fieldErrors.join(" ") : err.message,
      values: collectValues(formData),
    };
  }
  if (err instanceof Error) {
    return { ok: false, message: err.message, values: collectValues(formData) };
  }
  return { ok: false, message: "Something went wrong.", values: collectValues(formData) };
}

export async function saveHeroSection(formData: FormData): Promise<FormState> {
  const content = {
    eyebrow: str(formData, "eyebrow"),
    title: str(formData, "title"),
    titleAccent: str(formData, "titleAccent"),
    description: str(formData, "description"),
    primaryCtaLabel: str(formData, "primaryCtaLabel"),
    primaryCtaHref: str(formData, "primaryCtaHref"),
    secondaryCtaLabel: str(formData, "secondaryCtaLabel"),
    secondaryCtaHref: str(formData, "secondaryCtaHref"),
    videoSrc: str(formData, "videoSrc"),
    posterSrc: str(formData, "posterSrc"),
  };
  try {
    const [uploadedVideo, uploadedPoster] = await Promise.all([
      uploadIfPresent(formData, "videoFile"),
      uploadIfPresent(formData, "posterFile"),
    ]);
    if (uploadedVideo) content.videoSrc = uploadedVideo;
    if (uploadedPoster) content.posterSrc = uploadedPoster;

    await patchLandingSectionContent("hero", content);
    await patchLandingSectionVariant("hero", readVariant(formData));
    return { ok: true };
  } catch (err) {
    return landingErrorState(err, formData);
  }
}

function parsePairLines(text: string): { value: string; label: string }[] {
  return text
    .split("\n")
    .map((line) => {
      const [value, label] = line.split("|");
      return { value: (value ?? "").trim(), label: (label ?? "").trim() };
    })
    .filter((item) => item.value && item.label);
}

export async function saveStatsSection(formData: FormData): Promise<FormState> {
  const items = parsePairLines(str(formData, "items"));
  if (items.length === 0) {
    return {
      ok: false,
      errors: { items: "Add at least one stat, one per line as “value | label”." },
      values: collectValues(formData),
    };
  }
  try {
    await patchLandingSectionContent("stats", { items });
    await patchLandingSectionVariant("stats", readVariant(formData));
    return { ok: true };
  } catch (err) {
    return landingErrorState(err, formData);
  }
}

export async function savePillarsSection(formData: FormData): Promise<FormState> {
  // Fixed 4 — positionally matched to Trainings/Events/Consultancy/Careers
  // (their icon and link stay hardcoded in the renderer; only copy is here).
  const items = [0, 1, 2, 3].map((i) => ({
    title: str(formData, `pillar${i}Title`),
    description: str(formData, `pillar${i}Description`),
  }));
  try {
    await patchLandingSectionContent("pillars", { items });
    await patchLandingSectionVariant("pillars", readVariant(formData));
    return { ok: true };
  } catch (err) {
    return landingErrorState(err, formData);
  }
}

export async function saveConsultancySection(formData: FormData): Promise<FormState> {
  const content = {
    eyebrow: str(formData, "eyebrow"),
    title: str(formData, "title"),
    description: str(formData, "description"),
    image: str(formData, "image"),
    ctaLabel: str(formData, "ctaLabel"),
    ctaHref: str(formData, "ctaHref"),
  };
  try {
    const uploadedImage = await uploadIfPresent(formData, "imageFile");
    if (uploadedImage) content.image = uploadedImage;

    await patchLandingSectionContent("consultancy", content);
    await patchLandingSectionVariant("consultancy", readVariant(formData));
    return { ok: true };
  } catch (err) {
    return landingErrorState(err, formData);
  }
}

export async function saveCtaSection(formData: FormData): Promise<FormState> {
  const content = {
    title: str(formData, "title"),
    description: str(formData, "description"),
    primaryCtaLabel: str(formData, "primaryCtaLabel"),
    primaryCtaHref: str(formData, "primaryCtaHref"),
    secondaryCtaLabel: str(formData, "secondaryCtaLabel"),
    secondaryCtaHref: str(formData, "secondaryCtaHref"),
  };
  try {
    await patchLandingSectionContent("cta", content);
    await patchLandingSectionVariant("cta", readVariant(formData));
    return { ok: true };
  } catch (err) {
    return landingErrorState(err, formData);
  }
}

/** Shared by the four DB-driven sections — only the surrounding copy and
 * item count live here, never the items themselves. */
async function saveListSection(key: LandingSectionKey, formData: FormData): Promise<FormState> {
  const content = {
    eyebrow: str(formData, "eyebrow"),
    title: str(formData, "title"),
    description: str(formData, "description"),
    ctaLabel: str(formData, "ctaLabel"),
    ctaHref: str(formData, "ctaHref"),
    take: num(formData, "take", 3),
  };
  try {
    await patchLandingSectionContent(key, content);
    await patchLandingSectionVariant(key, readVariant(formData));
    return { ok: true };
  } catch (err) {
    return landingErrorState(err, formData);
  }
}

export async function saveTrainingsListSection(formData: FormData) {
  return saveListSection("trainings", formData);
}

export async function saveEventsListSection(formData: FormData) {
  return saveListSection("events", formData);
}

export async function saveCareersListSection(formData: FormData) {
  return saveListSection("careers", formData);
}

export async function saveBlogListSection(formData: FormData) {
  return saveListSection("blog", formData);
}

/** The list page submits the value it wants, not the current one — no
 * fetch-then-flip round trip needed. */
export async function setLandingSectionVisibility(formData: FormData): Promise<void> {
  const key = str(formData, "key") as LandingSectionKey;
  const visible = str(formData, "visible") === "true";
  await patchLandingSectionVisibility(key, visible);
}

export async function moveLandingSection(formData: FormData): Promise<void> {
  const key = str(formData, "key") as LandingSectionKey;
  const direction = str(formData, "direction") === "up" ? "up" : "down";
  await patchLandingSectionMove(key, direction);
}
export * from "@/eventsActions";
