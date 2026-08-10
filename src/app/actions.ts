"use server";

import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { collectValues, type FormState } from "@/lib/form-state";
import { UPLOAD_DIR } from "@/lib/uploads";
import {
  RESUME_ACCEPTED_EXTENSIONS,
  RESUME_ACCEPTED_TYPES,
  RESUME_MAX_BYTES,
} from "@/lib/constants";
import {
  applicationSchema,
  contactSchema,
  enquirySchema,
  fieldErrors,
  registrationSchema,
  subscribeSchema,
} from "@/lib/validation";

const raw = (fd: FormData, key: string) => {
  const v = fd.get(key);
  return typeof v === "string" ? v : undefined;
};

// ---------------------------------------------------------------------------
// Trainings & Events — registration
// ---------------------------------------------------------------------------

export async function registerForTraining(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const trainingId = raw(formData, "trainingId");
  if (!trainingId) return { ok: false, message: "Missing training.", values: collectValues(formData) };

  const parsed = registrationSchema.safeParse({
    name: raw(formData, "name"),
    email: raw(formData, "email"),
    phone: raw(formData, "phone"),
    company: raw(formData, "company"),
    seats: raw(formData, "seats") || "1",
    message: raw(formData, "message"),
  });
  if (!parsed.success)
    return {
      ok: false,
      errors: fieldErrors(parsed.error),
      values: collectValues(formData),
    };

  const training = await db.training.findUnique({
    where: { id: trainingId },
    select: { id: true, published: true, title: true },
  });
  if (!training?.published)
    return { ok: false, message: "That programme is no longer open.", values: collectValues(formData) };

  await db.registration.create({
    data: { ...parsed.data, trainingId: training.id },
  });

  revalidatePath("/admin/registrations");
  return {
    ok: true,
    message: `Thanks — your place on ${training.title} is reserved. We'll confirm by email within one working day.`,
  };
}

export async function registerForEvent(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const eventId = raw(formData, "eventId");
  if (!eventId) return { ok: false, message: "Missing event.", values: collectValues(formData) };

  const parsed = registrationSchema.safeParse({
    name: raw(formData, "name"),
    email: raw(formData, "email"),
    phone: raw(formData, "phone"),
    company: raw(formData, "company"),
    seats: raw(formData, "seats") || "1",
    message: raw(formData, "message"),
  });
  if (!parsed.success)
    return {
      ok: false,
      errors: fieldErrors(parsed.error),
      values: collectValues(formData),
    };

  const event = await db.event.findUnique({
    where: { id: eventId },
    select: { id: true, published: true, title: true, capacity: true, startsAt: true },
  });
  if (!event?.published)
    return { ok: false, message: "That event is no longer open.", values: collectValues(formData) };
  if (event.startsAt < new Date())
    return { ok: false, message: "That event has already taken place.", values: collectValues(formData) };

  // Capacity is checked at submit time rather than render time so a stale page
  // cannot oversell the room.
  const taken = await db.registration.aggregate({
    where: { eventId: event.id, status: { not: "cancelled" } },
    _sum: { seats: true },
  });
  const remaining = event.capacity - (taken._sum.seats ?? 0);
  if (remaining < parsed.data.seats) {
    return {
      ok: false,
      message:
        remaining > 0
          ? `Only ${remaining} seat${remaining === 1 ? "" : "s"} left — please reduce your request.`
          : "This event is fully booked. Contact us to join the waitlist.",
      values: collectValues(formData),
    };
  }

  await db.registration.create({
    data: { ...parsed.data, eventId: event.id },
  });

  revalidatePath("/admin/registrations");
  return {
    ok: true,
    message: `You're registered for ${event.title}. Details are on their way to your inbox.`,
  };
}

// ---------------------------------------------------------------------------
// Consultancy — enquiry
// ---------------------------------------------------------------------------

export async function submitEnquiry(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = enquirySchema.safeParse({
    name: raw(formData, "name"),
    email: raw(formData, "email"),
    phone: raw(formData, "phone"),
    company: raw(formData, "company"),
    companySize: raw(formData, "companySize") || undefined,
    budget: raw(formData, "budget"),
    timeline: raw(formData, "timeline"),
    message: raw(formData, "message"),
    serviceId: raw(formData, "serviceId"),
  });
  if (!parsed.success)
    return {
      ok: false,
      errors: fieldErrors(parsed.error),
      values: collectValues(formData),
    };

  const { serviceId, ...rest } = parsed.data;

  // Only attach a service if it genuinely exists — a stale or tampered id
  // should not fail the whole submission.
  const service = serviceId
    ? await db.consultancyService.findUnique({
        where: { id: serviceId },
        select: { id: true },
      })
    : null;

  await db.consultancyEnquiry.create({
    data: { ...rest, serviceId: service?.id ?? null },
  });

  revalidatePath("/admin/enquiries");
  return {
    ok: true,
    message:
      "Thank you — we've received your enquiry and will respond within two working days.",
  };
}

// ---------------------------------------------------------------------------
// Careers — application with resume upload
// ---------------------------------------------------------------------------

export async function submitApplication(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const jobId = raw(formData, "jobId");
  if (!jobId) return { ok: false, message: "Missing job posting.", values: collectValues(formData) };

  const parsed = applicationSchema.safeParse({
    name: raw(formData, "name"),
    email: raw(formData, "email"),
    phone: raw(formData, "phone"),
    linkedin: raw(formData, "linkedin"),
    portfolio: raw(formData, "portfolio"),
    coverLetter: raw(formData, "coverLetter"),
  });
  if (!parsed.success)
    return {
      ok: false,
      errors: fieldErrors(parsed.error),
      values: collectValues(formData),
    };

  const job = await db.jobPosting.findUnique({
    where: { id: jobId },
    select: { id: true, published: true, title: true, closesAt: true },
  });
  if (!job?.published)
    return { ok: false, message: "That role is no longer accepting applications.", values: collectValues(formData) };
  if (job.closesAt && job.closesAt < new Date())
    return { ok: false, message: "Applications for that role have closed.", values: collectValues(formData) };

  // One application per email per role.
  const existing = await db.jobApplication.findFirst({
    where: { jobId: job.id, email: parsed.data.email },
    select: { id: true },
  });
  if (existing)
    return {
      ok: false,
      message: "You've already applied for this role. We'll be in touch.",
      values: collectValues(formData),
    };

  let resumePath: string | null = null;
  let resumeName: string | null = null;

  const file = formData.get("resume");
  if (file instanceof File && file.size > 0) {
    if (file.size > RESUME_MAX_BYTES)
      return {
        ok: false,
        errors: { resume: "Your resume must be under 5 MB." },
        values: collectValues(formData),
      };

    const ext = path.extname(file.name).toLowerCase();
    const typeOk = (RESUME_ACCEPTED_TYPES as readonly string[]).includes(
      file.type,
    );
    const extOk = (RESUME_ACCEPTED_EXTENSIONS as readonly string[]).includes(ext);
    if (!typeOk || !extOk)
      return {
        ok: false,
        errors: { resume: "Please upload a PDF, DOC or DOCX file." },
        values: collectValues(formData),
      };

    // Never reuse the submitted filename on disk — it is attacker-controlled.
    // A random name plus the validated extension removes path traversal and
    // overwrite risk entirely.
    const stored = `${randomUUID()}${ext}`;
    await mkdir(UPLOAD_DIR, { recursive: true });
    await writeFile(
      path.join(UPLOAD_DIR, stored),
      Buffer.from(await file.arrayBuffer()),
    );

    // Store the bare filename; the download URL is derived from it. Résumés
    // live outside public/ and are streamed by an admin-only route.
    resumePath = stored;
    resumeName = file.name.slice(0, 200);
  }

  await db.jobApplication.create({
    data: { ...parsed.data, jobId: job.id, resumePath, resumeName },
  });

  revalidatePath("/admin/applications");
  return {
    ok: true,
    message: `Your application for ${job.title} is in. We review every application and will get back to you either way.`,
  };
}

// ---------------------------------------------------------------------------
// Shared
// ---------------------------------------------------------------------------

export async function submitContact(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = contactSchema.safeParse({
    name: raw(formData, "name"),
    email: raw(formData, "email"),
    phone: raw(formData, "phone"),
    subject: raw(formData, "subject"),
    message: raw(formData, "message"),
  });
  if (!parsed.success)
    return {
      ok: false,
      errors: fieldErrors(parsed.error),
      values: collectValues(formData),
    };

  await db.contactMessage.create({ data: parsed.data });
  revalidatePath("/admin/messages");
  return {
    ok: true,
    message: "Message received — we usually reply within one working day.",
  };
}

export async function subscribe(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = subscribeSchema.safeParse({ email: raw(formData, "email") });
  if (!parsed.success)
    return {
      ok: false,
      errors: fieldErrors(parsed.error),
      values: collectValues(formData),
    };

  // Re-subscribing is idempotent and reactivates a previous unsubscribe.
  await db.subscriber.upsert({
    where: { email: parsed.data.email },
    update: { active: true },
    create: { email: parsed.data.email },
  });

  return { ok: true, message: "You're on the list. Thanks!" };
}
