/**
 * Client-side data layer for the content domains now served by the Backend's
 * Phase-10a REST modules (trainings/consultancy/careers/blog/registrations/
 * enquiries/applications/messages/subscribers). Public reads only — admin
 * mutations live in adminActions.ts / the events clients. Every fetch is a
 * plain GET against __API_URL__; shapes are the Mongo documents verbatim.
 */

export type TrainingDoc = {
  _id: string;
  slug: string;
  title: string;
  summary: string;
  description: string;
  image: string;
  category: string;
  level: string;
  durationHrs: number;
  format: string;
  priceCents: number;
  currency: string;
  outcomes: string[];
  modules: string[];
  published: boolean;
  featured: boolean;
  sortOrder: number;
  trainerId: string | null;
  trainer?: { _id: string; name: string; title: string; bio: string; photo: string; linkedin: string | null };
  createdAt: string;
  updatedAt: string;
};

export type ServiceDoc = {
  _id: string;
  slug: string;
  title: string;
  summary: string;
  description: string;
  image: string;
  icon: string;
  engagement: string;
  deliverables: string[];
  idealFor: string[];
  published: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type JobDoc = {
  _id: string;
  slug: string;
  title: string;
  department: string;
  location: string;
  employment: string;
  workMode: string;
  experience: string;
  salaryMin: number | null;
  salaryMax: number | null;
  currency: string;
  summary: string;
  description: string;
  requirements: string[];
  benefits: string[];
  published: boolean;
  closesAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PostDoc = {
  _id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  coverImage: string;
  category: string;
  tags: string[];
  published: boolean;
  featured: boolean;
  /** Absent on posts predating the flag — treat undefined as listed. */
  listedOnBlog?: boolean;
  publishedAt: string | null;
  authorId: string | null;
  author?: { _id: string; name: string; title: string; bio: string; photo: string; linkedin: string | null };
  /** Freeform byline ("Written by <name>, <position>") — independent of the
   * authorId/Trainer reference above, and what the Blog editor's own
   * "Written by" fields write to now. Either or both may be set. */
  writtenByName: string;
  writtenByPosition: string;
  createdAt: string;
  updatedAt: string;
};

export type TrainerDoc = { _id: string; name: string; title: string };

/** One image, a <=500-word message, and a reference link the reader follows
 * to the full article — the public detail page routes by slug. */
/** One story inside an issue. `heading` is optional — a story that reads fine
 * without its own headline leaves it blank. */
export type NewsletterItem = {
  heading: string;
  image: string;
  message: string;
  referenceLink: string;
};

/** An issue of the newsletter: a heading, a slug, and one or more stories.
 *
 * `items` is always present and, for any issue with content, non-empty — the
 * Backend folds pre-`items` issues (which stored a single story at the top
 * level) into a one-entry array before it answers, so nothing here needs to
 * know about that older shape. */
export type NewsletterDoc = {
  _id: string;
  slug: string;
  title: string;
  items: NewsletterItem[];
  published: boolean;
  createdAt: string;
  updatedAt: string;
};

/** A public, admin-approved feedback entry — no email/Google id ever ships
 * to the browser (see BlogFeedbackService.findPublicFeaturedBySlug). */
export type PublicFeedbackDoc = {
  _id: string;
  rating: number;
  message: string;
  name: string;
  createdAt: string;
};

export type RegistrationDoc = {
  _id: string;
  name: string;
  email: string;
  phone: string;
  company: string | null;
  seats: number;
  message: string | null;
  status: "pending" | "confirmed" | "cancelled";
  trainingId: string;
  trainingTitle: string;
  createdAt: string;
};

export type EnquiryDoc = {
  _id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  companySize: string | null;
  budget: string | null;
  timeline: string | null;
  message: string;
  status: "new" | "contacted" | "won" | "lost";
  serviceId: string | null;
  serviceTitle: string | null;
  createdAt: string;
};

export type ApplicationDoc = {
  _id: string;
  name: string;
  email: string;
  phone: string;
  linkedin: string | null;
  portfolio: string | null;
  coverLetter: string;
  resumePath: string | null;
  resumeName: string | null;
  status: "received" | "screening" | "interview" | "offer" | "rejected";
  jobId: string;
  jobTitle: string;
  createdAt: string;
};

export type ContactMessageDoc = {
  _id: string;
  name: string;
  email: string;
  phone: string | null;
  subject: string;
  message: string;
  handled: boolean;
  createdAt: string;
};

/** All of the below return [] on failure — public pages degrade, they never
 * crash (same convention as fetchLandingSections/fetchPublishedEvents). */

export async function fetchTrainings(): Promise<TrainingDoc[]> {
  try {
    const res = await fetch(`${__API_URL__}/trainings`);
    if (!res.ok) return [];
    return (await res.json()) as TrainingDoc[];
  } catch {
    return [];
  }
}

/** The Backend populates the trainer INTO the `trainerId` field (populate
 * keeps the field's own name) — normalize it into the `trainer` key the
 * page components expect. */
function normalizeTraining(raw: TrainingDoc): TrainingDoc {
  const trainerId = raw.trainerId as unknown;
  if (trainerId && typeof trainerId === "object" && "name" in (trainerId as object)) {
    return { ...raw, trainer: trainerId as TrainingDoc["trainer"] };
  }
  return raw;
}

export async function fetchTrainingBySlug(slug: string): Promise<TrainingDoc | null> {
  try {
    const res = await fetch(`${__API_URL__}/trainings/${encodeURIComponent(slug)}`);
    if (!res.ok) return null;
    return normalizeTraining((await res.json()) as TrainingDoc);
  } catch {
    return null;
  }
}

export async function fetchServices(): Promise<ServiceDoc[]> {
  try {
    const res = await fetch(`${__API_URL__}/consultancy-services`);
    if (!res.ok) return [];
    return (await res.json()) as ServiceDoc[];
  } catch {
    return [];
  }
}

export async function fetchServiceBySlug(slug: string): Promise<ServiceDoc | null> {
  try {
    const res = await fetch(`${__API_URL__}/consultancy-services/${encodeURIComponent(slug)}`);
    if (!res.ok) return null;
    return (await res.json()) as ServiceDoc;
  } catch {
    return null;
  }
}

export async function fetchJobs(): Promise<JobDoc[]> {
  try {
    const res = await fetch(`${__API_URL__}/careers/jobs`);
    if (!res.ok) return [];
    return (await res.json()) as JobDoc[];
  } catch {
    return [];
  }
}

export async function fetchJobBySlug(slug: string): Promise<JobDoc | null> {
  try {
    const res = await fetch(`${__API_URL__}/careers/jobs/${encodeURIComponent(slug)}`);
    if (!res.ok) return null;
    return (await res.json()) as JobDoc;
  } catch {
    return null;
  }
}

export async function fetchPosts(): Promise<PostDoc[]> {
  try {
    const res = await fetch(`${__API_URL__}/blog`);
    if (!res.ok) return [];
    return (await res.json()) as PostDoc[];
  } catch {
    return [];
  }
}

/** Same normalize as normalizeTraining, for the blog post's `authorId`. */
function normalizePost(raw: PostDoc): PostDoc {
  const authorId = raw.authorId as unknown;
  if (authorId && typeof authorId === "object" && "name" in (authorId as object)) {
    return { ...raw, author: authorId as PostDoc["author"] };
  }
  return raw;
}

export async function fetchPostBySlug(slug: string): Promise<PostDoc | null> {
  try {
    const res = await fetch(`${__API_URL__}/blog/${encodeURIComponent(slug)}`);
    if (!res.ok) return null;
    return normalizePost((await res.json()) as PostDoc);
  } catch {
    return null;
  }
}

/** Published newsletters only — same degrade-to-[] convention as fetchPosts. */
export async function fetchNewsletters(): Promise<NewsletterDoc[]> {
  try {
    const res = await fetch(`${__API_URL__}/newsletter`);
    if (!res.ok) return [];
    return (await res.json()) as NewsletterDoc[];
  } catch {
    return [];
  }
}

export async function fetchNewsletterBySlug(slug: string): Promise<NewsletterDoc | null> {
  try {
    const res = await fetch(`${__API_URL__}/newsletter/${encodeURIComponent(slug)}`);
    if (!res.ok) return null;
    return (await res.json()) as NewsletterDoc;
  } catch {
    return null;
  }
}

/** Only admin-approved entries — public, no auth needed. */
export async function fetchPublicFeedback(slug: string): Promise<PublicFeedbackDoc[]> {
  try {
    const res = await fetch(`${__API_URL__}/blog/${encodeURIComponent(slug)}/feedback`);
    if (!res.ok) return [];
    return (await res.json()) as PublicFeedbackDoc[];
  } catch {
    return [];
  }
}

/** Submit (or update) this reader's own feedback — requires a verified
 * Google sign-in credential, not an admin session. Throws with the
 * Backend's message on failure (invalid/expired sign-in, feedback
 * misconfigured, etc.) so the caller can show it. */
export async function submitFeedback(
  slug: string,
  input: { credential: string; rating: number; message?: string },
): Promise<PublicFeedbackDoc> {
  const res = await fetch(`${__API_URL__}/blog/${encodeURIComponent(slug)}/feedback`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message =
      data && typeof data === "object" && "message" in data
        ? Array.isArray((data as { message: unknown }).message)
          ? (data as { message: string[] }).message.join(" ")
          : String((data as { message: unknown }).message)
        : "Could not submit feedback.";
    throw new Error(message);
  }
  return data as PublicFeedbackDoc;
}
