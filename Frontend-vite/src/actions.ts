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
  registrationFallbackSchema,
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

/**
 * What a paid enrolment needs before it can show anyone a QR, read off the
 * registration the Backend has just created.
 *
 * The amount is the Backend's own snapshot — the training's price × the seats
 * booked, written onto the row at the moment the place was taken — in minor
 * units, which is what everything on this side of the wire speaks. Nothing in
 * the browser works it out and nothing sends it back: the create request
 * carries no money field at all, and the QR is rebuilt server-side from the
 * stored row. This is a number to display, never one to submit.
 */
export type RegistrationPaymentHandle = {
  registrationId: string;
  amountCents: number;
  currency: string;
};

/** `FormState` plus, on a paid programme, the handle above. The extra key is
 * this one form's business, so it rides on the training action's return type
 * rather than on the `FormState` every other action in this file shares. */
export type RegistrationFormState = FormState & { payment?: RegistrationPaymentHandle };

/**
 * The booking as its payment routes describe it. `GET :id/paynow-qr` and
 * `POST :id/payment-claimed` return the same object, the claim reply simply
 * without `payment` — it restates the booking, it does not re-issue the QR.
 *
 * `paymentStatus` is the money and `status` is the place, and they are not the
 * same thing: `claimed` is the registrant's own assertion that they have
 * transferred, which nothing has checked. Only `paid`, which an admin sets
 * after finding the transfer, means money actually arrived.
 */
export type RegistrationPaymentView = {
  registrationId: string;
  status: "pending" | "confirmed" | "cancelled";
  paymentStatus: "unpaid" | "claimed" | "paid";
  amountCents: number;
  currency: string;
  reference: string;
  seats: number;
  trainingTitle: string;
  paymentClaimedAt: string | null;
  paymentVerifiedAt: string | null;
  payment?: { qr: string; payeeId: string; payeeName: string };
};

/**
 * The payment handle off a create reply, or null when there is nothing to pay.
 *
 * `paymentStatus` is what decides it, not a price this file went looking for:
 * the Backend sets `not-required` for a free programme and `unpaid` for a
 * payable one, and that is the whole fork. Read defensively because the reply
 * is untyped JSON — a body missing a field, or one that is not the document at
 * all, yields null and therefore the success message a free enrolment has
 * always shown, rather than a payment step quoting an amount nobody agreed.
 */
function readPaymentHandle(data: unknown): RegistrationPaymentHandle | null {
  if (!data || typeof data !== "object") return null;
  const doc = data as Record<string, unknown>;
  if (doc.paymentStatus !== "unpaid") return null;

  const registrationId = typeof doc._id === "string" ? doc._id : "";
  const amountCents = typeof doc.amountCents === "number" ? doc.amountCents : 0;
  if (!registrationId || amountCents <= 0) return null;

  return {
    registrationId,
    amountCents,
    currency: typeof doc.currency === "string" ? doc.currency : "SGD",
  };
}

export async function registerForTraining(formData: FormData): Promise<RegistrationFormState> {
  const trainingId = raw(formData, "trainingId");
  if (!trainingId) return { ok: false, message: "Missing training.", values: collectValues(formData) };

  // A credential means the form ran its Google step; its absence means this
  // build has no client id, `<GoogleSignInButton>` rendered nothing and the form
  // fell back to a typed address (see RegistrationForm). The Backend forks the
  // same way off its own GOOGLE_CLIENT_ID and is the one that decides — this
  // mirror exists so the fallback deployment still gets a field-level "please
  // enter your email" rather than a bare 400 banner.
  const credential = raw(formData, "credential");
  const fields = {
    name: raw(formData, "name"),
    email: raw(formData, "email"),
    phone: raw(formData, "phone"),
    company: raw(formData, "company"),
    seats: raw(formData, "seats") || "1",
    message: raw(formData, "message"),
  };
  const parsed = credential
    ? registrationSchema.safeParse(fields)
    : registrationFallbackSchema.safeParse(fields);
  if (!parsed.success)
    return { ok: false, errors: fieldErrors(parsed.error), values: collectValues(formData) };

  // `registrationSchema` does not declare `email`, so Zod has already dropped
  // it: the signed-in request carries the token and no address whatsoever, and
  // the stored one can only be the address Google signed.
  const body = credential ? { ...parsed.data, credential } : parsed.data;

  const result = await postJson(`/registrations/training/${trainingId}`, body, formData);
  if (!result.ok)
    return {
      ok: false,
      message: errorMessage(result.data, "That programme is no longer open."),
      values: collectValues(formData),
    };

  // Absent on a free programme, and that absence is what keeps the free path
  // exactly what it has always been: the message below and nothing else.
  const payment = readPaymentHandle(result.data);

  return {
    ok: true,
    message: `Thanks — your place is reserved. We'll confirm by email within one working day.`,
    ...(payment ? { payment } : {}),
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

/**
 * The payment step's two calls. Neither is a form submission — they take an id
 * rather than a FormData, and they throw rather than returning a FormState,
 * because the panel that shows them has one place to render a failure and a
 * retry button beside it.
 *
 * The Backend's own message survives verbatim wherever there is one: "PayNow is
 * not configured — set the company UEN and name in Settings." is precisely what
 * the registrant, and whoever they forward it to, needs to read.
 */
async function paymentJson<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${__API_URL__}${path}`, init);
  } catch {
    throw new Error("The server is unreachable right now — please try again.");
  }
  let data: unknown = {};
  try {
    data = await response.json();
  } catch {
    /* non-JSON error body */
  }
  if (!response.ok) {
    throw new Error(errorMessage(data, "We could not load your payment details."));
  }
  return data as T;
}

/** The QR for a booking already taken, with the amount and the reference
 * embedded in it. Public, like the form that created the booking — somebody who
 * has just enrolled has no session to fetch it with. */
export function fetchRegistrationPayment(
  registrationId: string,
): Promise<RegistrationPaymentView> {
  return paymentJson(`/registrations/${registrationId}/paynow-qr`);
}

/**
 * "I have paid" — recorded as a claim and nothing more. It does not mark the
 * money received and it does not confirm the place: an admin matching the
 * transfer against the bank statement does both, and PayNow offers no callback
 * that could stand in for them.
 *
 * The payer's own bank reference rides along when they typed one. It exists
 * only to help whoever goes looking for the transfer, so an empty box sends no
 * key at all rather than an empty string.
 */
export function claimRegistrationPayment(
  registrationId: string,
  payerReference: string,
): Promise<RegistrationPaymentView> {
  const reference = payerReference.trim();
  return paymentJson(`/registrations/${registrationId}/payment-claimed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(reference ? { payerReference: reference } : {}),
  });
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
