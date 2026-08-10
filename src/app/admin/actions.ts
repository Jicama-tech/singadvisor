"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { collectValues, type FormState } from "@/lib/form-state";
import {
  authenticate,
  clearSessionCookie,
  createSession,
  getSession,
  setSessionCookie,
} from "@/lib/auth";
import { db } from "@/lib/db";
import { fieldErrors, loginSchema } from "@/lib/validation";
import { linesToJson, slugify } from "@/lib/utils";

/**
 * Every mutation below calls this first. The middleware already redirects
 * unauthenticated navigation, but server actions are directly invocable
 * endpoints — they must not rely on the middleware having run.
 */
async function requireSession() {
  const session = await getSession();
  if (!session) throw new Error("Not authorised.");
  return session;
}

const str = (fd: FormData, key: string) => {
  const v = fd.get(key);
  return typeof v === "string" ? v.trim() : "";
};
const num = (fd: FormData, key: string, fallback = 0) => {
  const n = Number(str(fd, key));
  return Number.isFinite(n) ? n : fallback;
};
const bool = (fd: FormData, key: string) => fd.get(key) === "on";
const nullable = (fd: FormData, key: string) => str(fd, key) || null;

// ---------------------------------------------------------------------------
// Authentication
// ---------------------------------------------------------------------------

export async function login(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = loginSchema.safeParse({
    email: str(formData, "email"),
    password: str(formData, "password"),
  });
  if (!parsed.success) return {
      ok: false,
      errors: fieldErrors(parsed.error),
      values: collectValues(formData),
    };

  const user = await authenticate(parsed.data.email, parsed.data.password);
  // Deliberately generic — do not reveal whether the email exists.
  if (!user) return { ok: false, message: "Incorrect email or password.", values: collectValues(formData) };

  await setSessionCookie(await createSession(user));

  const next = str(formData, "next");
  // Only allow same-site relative redirects; `//evil.com` is a valid URL path
  // that would otherwise send the user off-site.
  const target =
    next.startsWith("/") && !next.startsWith("//") ? next : "/admin";
  redirect(target);
}

export async function logout() {
  await clearSessionCookie();
  redirect("/admin/login");
}

// ---------------------------------------------------------------------------
// Trainings
// ---------------------------------------------------------------------------

export async function saveTraining(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireSession();

  const id = str(formData, "id");
  const title = str(formData, "title");
  if (!title) return {
      ok: false,
      errors: { title: "Title is required." },
      values: collectValues(formData),
    };

  const slug = slugify(str(formData, "slug") || title);

  // Slugs are the public URL; a collision would silently break an existing page.
  const clash = await db.training.findFirst({
    where: { slug, ...(id ? { id: { not: id } } : {}) },
    select: { id: true },
  });
  if (clash)
    return {
      ok: false,
      errors: { slug: "That slug is already in use." },
      values: collectValues(formData),
    };

  const data = {
    slug,
    title,
    summary: str(formData, "summary"),
    description: str(formData, "description"),
    image: str(formData, "image") || "/Images/Trainingimgae/traing.jpg",
    category: str(formData, "category") || "Student",
    level: str(formData, "level") || "All levels",
    durationHrs: num(formData, "durationHrs", 2),
    format: str(formData, "format") || "In-person",
    priceCents: Math.round(num(formData, "price") * 100),
    outcomes: linesToJson(str(formData, "outcomes")),
    modules: linesToJson(str(formData, "modules")),
    published: bool(formData, "published"),
    featured: bool(formData, "featured"),
    sortOrder: num(formData, "sortOrder"),
    trainerId: nullable(formData, "trainerId"),
  };

  if (id) await db.training.update({ where: { id }, data });
  else await db.training.create({ data });

  revalidatePath("/admin/trainings");
  revalidatePath("/trainings");
  revalidatePath(`/trainings/${slug}`);
  revalidatePath("/");
  redirect("/admin/trainings");
}

export async function deleteTraining(formData: FormData) {
  await requireSession();
  const id = str(formData, "id");
  if (id) await db.training.delete({ where: { id } });
  revalidatePath("/admin/trainings");
  revalidatePath("/trainings");
  revalidatePath("/");
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

export async function saveEvent(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireSession();

  const id = str(formData, "id");
  const title = str(formData, "title");
  if (!title) return {
      ok: false,
      errors: { title: "Title is required." },
      values: collectValues(formData),
    };

  const startsAt = new Date(str(formData, "startsAt"));
  const endsAt = new Date(str(formData, "endsAt"));
  if (Number.isNaN(startsAt.getTime()))
    return {
      ok: false,
      errors: { startsAt: "Enter a valid start date." },
      values: collectValues(formData),
    };
  if (Number.isNaN(endsAt.getTime()))
    return {
      ok: false,
      errors: { endsAt: "Enter a valid end date." },
      values: collectValues(formData),
    };
  if (endsAt <= startsAt)
    return {
      ok: false,
      errors: { endsAt: "The end must be after the start." },
      values: collectValues(formData),
    };

  const slug = slugify(str(formData, "slug") || title);
  const clash = await db.event.findFirst({
    where: { slug, ...(id ? { id: { not: id } } : {}) },
    select: { id: true },
  });
  if (clash)
    return {
      ok: false,
      errors: { slug: "That slug is already in use." },
      values: collectValues(formData),
    };

  // Agenda rows arrive as "9:00 am | Registration" one per line.
  const agenda = JSON.stringify(
    str(formData, "agenda")
      .split("\n")
      .map((line) => {
        const [time, ...rest] = line.split("|");
        return { time: time?.trim() ?? "", title: rest.join("|").trim() };
      })
      .filter((row) => row.time && row.title),
  );

  const data = {
    slug,
    title,
    summary: str(formData, "summary"),
    description: str(formData, "description"),
    image: str(formData, "image") || "/Images/Events/Sep-29 (1).jpeg",
    venue: str(formData, "venue"),
    address: str(formData, "address"),
    startsAt,
    endsAt,
    capacity: num(formData, "capacity", 100),
    speakers: linesToJson(str(formData, "speakers")),
    agenda,
    priceCents: Math.round(num(formData, "price") * 100),
    published: bool(formData, "published"),
    featured: bool(formData, "featured"),
  };

  if (id) await db.event.update({ where: { id }, data });
  else await db.event.create({ data });

  revalidatePath("/admin/events");
  revalidatePath("/events");
  revalidatePath(`/events/${slug}`);
  revalidatePath("/");
  redirect("/admin/events");
}

export async function deleteEvent(formData: FormData) {
  await requireSession();
  const id = str(formData, "id");
  if (id) await db.event.delete({ where: { id } });
  revalidatePath("/admin/events");
  revalidatePath("/events");
  revalidatePath("/");
}

// ---------------------------------------------------------------------------
// Consultancy services
// ---------------------------------------------------------------------------

export async function saveService(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireSession();

  const id = str(formData, "id");
  const title = str(formData, "title");
  if (!title) return {
      ok: false,
      errors: { title: "Title is required." },
      values: collectValues(formData),
    };

  const slug = slugify(str(formData, "slug") || title);
  const clash = await db.consultancyService.findFirst({
    where: { slug, ...(id ? { id: { not: id } } : {}) },
    select: { id: true },
  });
  if (clash)
    return {
      ok: false,
      errors: { slug: "That slug is already in use." },
      values: collectValues(formData),
    };

  const data = {
    slug,
    title,
    summary: str(formData, "summary"),
    description: str(formData, "description"),
    image: str(formData, "image") || "/Images/Trainingimgae/consultancy.jpg",
    icon: str(formData, "icon") || "compass",
    engagement: str(formData, "engagement") || "Project-based",
    deliverables: linesToJson(str(formData, "deliverables")),
    idealFor: linesToJson(str(formData, "idealFor")),
    published: bool(formData, "published"),
    sortOrder: num(formData, "sortOrder"),
  };

  if (id) await db.consultancyService.update({ where: { id }, data });
  else await db.consultancyService.create({ data });

  revalidatePath("/admin/consultancy");
  revalidatePath("/consultancy");
  revalidatePath(`/consultancy/${slug}`);
  revalidatePath("/");
  redirect("/admin/consultancy");
}

export async function deleteService(formData: FormData) {
  await requireSession();
  const id = str(formData, "id");
  if (id) await db.consultancyService.delete({ where: { id } });
  revalidatePath("/admin/consultancy");
  revalidatePath("/consultancy");
  revalidatePath("/");
}

// ---------------------------------------------------------------------------
// Job postings
// ---------------------------------------------------------------------------

export async function saveJob(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireSession();

  const id = str(formData, "id");
  const title = str(formData, "title");
  if (!title) return {
      ok: false,
      errors: { title: "Title is required." },
      values: collectValues(formData),
    };

  const slug = slugify(str(formData, "slug") || title);
  const clash = await db.jobPosting.findFirst({
    where: { slug, ...(id ? { id: { not: id } } : {}) },
    select: { id: true },
  });
  if (clash)
    return {
      ok: false,
      errors: { slug: "That slug is already in use." },
      values: collectValues(formData),
    };

  const closesRaw = str(formData, "closesAt");
  const closesAt = closesRaw ? new Date(closesRaw) : null;
  if (closesAt && Number.isNaN(closesAt.getTime()))
    return {
      ok: false,
      errors: { closesAt: "Enter a valid closing date." },
      values: collectValues(formData),
    };

  const salaryMin = str(formData, "salaryMin") ? num(formData, "salaryMin") : null;
  const salaryMax = str(formData, "salaryMax") ? num(formData, "salaryMax") : null;
  if (salaryMin != null && salaryMax != null && salaryMax < salaryMin)
    return {
      ok: false,
      errors: { salaryMax: "The maximum must be at least the minimum." },
      values: collectValues(formData),
    };

  const data = {
    slug,
    title,
    department: str(formData, "department") || "General",
    location: str(formData, "location") || "Singapore",
    employment: str(formData, "employment") || "Full-time",
    workMode: str(formData, "workMode") || "On-site",
    experience: str(formData, "experience") || "2-4 years",
    salaryMin,
    salaryMax,
    summary: str(formData, "summary"),
    description: str(formData, "description"),
    requirements: linesToJson(str(formData, "requirements")),
    benefits: linesToJson(str(formData, "benefits")),
    published: bool(formData, "published"),
    closesAt,
  };

  if (id) await db.jobPosting.update({ where: { id }, data });
  else await db.jobPosting.create({ data });

  revalidatePath("/admin/careers");
  revalidatePath("/careers");
  revalidatePath(`/careers/${slug}`);
  revalidatePath("/");
  redirect("/admin/careers");
}

export async function deleteJob(formData: FormData) {
  await requireSession();
  const id = str(formData, "id");
  if (id) await db.jobPosting.delete({ where: { id } });
  revalidatePath("/admin/careers");
  revalidatePath("/careers");
  revalidatePath("/");
}

// ---------------------------------------------------------------------------
// Blog posts
// ---------------------------------------------------------------------------

export async function savePost(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireSession();

  const id = str(formData, "id");
  const title = str(formData, "title");
  if (!title)
    return {
      ok: false,
      errors: { title: "Title is required." },
      values: collectValues(formData),
    };

  const content = str(formData, "content");
  if (!content)
    return {
      ok: false,
      errors: { content: "An article needs a body." },
      values: collectValues(formData),
    };

  const slug = slugify(str(formData, "slug") || title);
  const clash = await db.blogPost.findFirst({
    where: { slug, ...(id ? { id: { not: id } } : {}) },
    select: { id: true },
  });
  if (clash)
    return {
      ok: false,
      errors: { slug: "That slug is already in use." },
      values: collectValues(formData),
    };

  const published = bool(formData, "published");
  const existing = id
    ? await db.blogPost.findUnique({
        where: { id },
        select: { publishedAt: true },
      })
    : null;

  // Stamp publishedAt the first time a post goes live and keep it stable
  // afterwards, so editing an old article does not move it to the top.
  const publishedAtRaw = str(formData, "publishedAt");
  let publishedAt: Date | null = existing?.publishedAt ?? null;
  if (publishedAtRaw) {
    const parsed = new Date(publishedAtRaw);
    if (Number.isNaN(parsed.getTime()))
      return {
        ok: false,
        errors: { publishedAt: "Enter a valid date." },
        values: collectValues(formData),
      };
    publishedAt = parsed;
  } else if (published && !publishedAt) {
    publishedAt = new Date();
  }

  const data = {
    slug,
    title,
    excerpt: str(formData, "excerpt"),
    content,
    coverImage: str(formData, "coverImage") || "/Images/Trainingimgae/traing.jpg",
    category: str(formData, "category") || "Insights",
    tags: linesToJson(str(formData, "tags")),
    published,
    featured: bool(formData, "featured"),
    publishedAt,
    authorId: nullable(formData, "authorId"),
  };

  if (id) await db.blogPost.update({ where: { id }, data });
  else await db.blogPost.create({ data });

  revalidatePath("/admin/blog");
  revalidatePath("/blog");
  revalidatePath(`/blog/${slug}`);
  revalidatePath("/");
  redirect("/admin/blog");
}

export async function deletePost(formData: FormData) {
  await requireSession();
  const id = str(formData, "id");
  if (id) await db.blogPost.delete({ where: { id } });
  revalidatePath("/admin/blog");
  revalidatePath("/blog");
  revalidatePath("/");
}

// ---------------------------------------------------------------------------
// Submission status updates
// ---------------------------------------------------------------------------

export async function updateRegistrationStatus(formData: FormData) {
  await requireSession();
  const id = str(formData, "id");
  const status = str(formData, "status");
  if (id && status)
    await db.registration.update({ where: { id }, data: { status } });
  revalidatePath("/admin/registrations");
}

export async function updateEnquiryStatus(formData: FormData) {
  await requireSession();
  const id = str(formData, "id");
  const status = str(formData, "status");
  if (id && status)
    await db.consultancyEnquiry.update({ where: { id }, data: { status } });
  revalidatePath("/admin/enquiries");
}

export async function updateApplicationStatus(formData: FormData) {
  await requireSession();
  const id = str(formData, "id");
  const status = str(formData, "status");
  if (id && status)
    await db.jobApplication.update({ where: { id }, data: { status } });
  revalidatePath("/admin/applications");
}

export async function toggleMessageHandled(formData: FormData) {
  await requireSession();
  const id = str(formData, "id");
  if (!id) return;
  const current = await db.contactMessage.findUnique({
    where: { id },
    select: { handled: true },
  });
  if (current)
    await db.contactMessage.update({
      where: { id },
      data: { handled: !current.handled },
    });
  revalidatePath("/admin/messages");
}
