/**
 * Client-side port of the Next app's `src/app/actions.ts` ("use server"
 * public-form mutations). Same function names, same FormData-in / FormState-
 * out contract, same Zod validation — but each now performs its fetch
 * directly against the Backend's Phase-10a REST endpoints instead of Prisma.
 * FormState's message on ok is the success copy the old actions returned.
 */
import {
  applicationSchema,
  contactSchema,
  enquirySchema,
  fieldErrors,
  registrationSchema,
  subscribeSchema,
} from "@/lib/validation";
import { collectValues, type FormState } from "@/lib/form-state";

const raw = (fd: FormData, key: string) => {
  const v = fd.get(key);
  return typeof v === "string" ? v : undefined;
};

/** Shared JSON-post + FormState error mapping. */
async function postJson(
  path: string,
  body: unknown,
  formData: FormData,
): Promise<{ ok: boolean; status: number; data: unknown }> {
  let response: Response;
  try {
    response = await fetch(`${__API_URL__}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    return { ok: false, status: 0, data: { message: "The server is unreachable right now — please try again." } };
  }
  let data: unknown = {};
  try {
    data = await response.json();
  } catch {
    /* non-JSON error body */
  }
  void formData;
  return { ok: response.ok, status: response.status, data };
}

function errorMessage(data: unknown, fallback: string): string {
  if (data && typeof data === "object" && "message" in data) {
    const m = (data as { message: unknown }).message;
    if (Array.isArray(m)) return m.map(String).join(" ");
    if (typeof m === "string") return m;
  }
  return fallback;
}

// ---------------------------------------------------------------------------
// Trainings & Events — registration
// ---------------------------------------------------------------------------

export async function registerForTraining(formData: FormData): Promise<FormState> {
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
    return { ok: false, errors: fieldErrors(parsed.error), values: collectValues(formData) };

  const result = await postJson(`/registrations/training/${trainingId}`, parsed.data, formData);
  if (!result.ok)
    return {
      ok: false,
      message: errorMessage(result.data, "That programme is no longer open."),
      values: collectValues(formData),
    };

  return {
    ok: true,
    message: `Thanks — your place is reserved. We'll confirm by email within one working day.`,
  };
}

/** Legacy event RSVPs were superseded by eventsh's ticket flow (Phase 10a) —
 * kept as an explicit no-op-ish failure so a stale form never silently
 * pretends to succeed. */
export async function registerForEvent(formData: FormData): Promise<FormState> {
  return {
    ok: false,
    message: "This event uses online ticketing — please book through the event page.",
    values: collectValues(formData),
  };
}

// ---------------------------------------------------------------------------
// Consultancy — enquiry
// ---------------------------------------------------------------------------

export async function submitEnquiry(formData: FormData): Promise<FormState> {
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
    return { ok: false, errors: fieldErrors(parsed.error), values: collectValues(formData) };

  const result = await postJson("/consultancy-enquiries", parsed.data, formData);
  if (!result.ok)
    return { ok: false, message: errorMessage(result.data, "We could not send your enquiry."), values: collectValues(formData) };

  return {
    ok: true,
    message: "Thank you — we've received your enquiry and will respond within two working days.",
  };
}

// ---------------------------------------------------------------------------
// Careers — application with resume upload
// ---------------------------------------------------------------------------

export async function submitApplication(formData: FormData): Promise<FormState> {
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
    return { ok: false, errors: fieldErrors(parsed.error), values: collectValues(formData) };

  // Multipart: the Backend does the file validation (size/type/ext/dedup) —
  // this just forwards what the user picked.
  let response: Response;
  try {
    response = await fetch(`${__API_URL__}/careers/jobs/${jobId}/applications`, {
      method: "POST",
      body: formData,
    });
  } catch {
    return { ok: false, message: "The server is unreachable right now — please try again.", values: collectValues(formData) };
  }
  if (!response.ok) {
    let message = "We could not submit your application.";
    try {
      message = errorMessage(await response.json(), message);
    } catch {
      /* keep default */
    }
    return { ok: false, message, values: collectValues(formData) };
  }

  return {
    ok: true,
    message: `Your application is in. We review every application and will get back to you either way.`,
  };
}

// ---------------------------------------------------------------------------
// Shared
// ---------------------------------------------------------------------------

export async function submitContact(formData: FormData): Promise<FormState> {
  const parsed = contactSchema.safeParse({
    name: raw(formData, "name"),
    email: raw(formData, "email"),
    phone: raw(formData, "phone"),
    subject: raw(formData, "subject"),
    message: raw(formData, "message"),
  });
  if (!parsed.success)
    return { ok: false, errors: fieldErrors(parsed.error), values: collectValues(formData) };

  const result = await postJson("/contact-messages", parsed.data, formData);
  if (!result.ok)
    return { ok: false, message: errorMessage(result.data, "We could not send your message."), values: collectValues(formData) };

  return { ok: true, message: "Message received — we usually reply within one working day." };
}

export async function subscribe(formData: FormData): Promise<FormState> {
  const parsed = subscribeSchema.safeParse({ email: raw(formData, "email") });
  if (!parsed.success)
    return { ok: false, errors: fieldErrors(parsed.error), values: collectValues(formData) };

  const result = await postJson("/subscribers", parsed.data, formData);
  if (!result.ok)
    return { ok: false, message: errorMessage(result.data, "We could not subscribe you."), values: collectValues(formData) };

  return { ok: true, message: "You're on the list. Thanks!" };
}
