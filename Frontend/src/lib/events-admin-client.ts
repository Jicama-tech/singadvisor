import "server-only";
import { getSessionToken } from "@/lib/auth";
import { fromEventshEvent, type EventshEventDoc } from "@/lib/events-eventsh-adapter";
import type {
  AgendaItem,
  CustomSection,
  EventRow,
  SpeakerProfile,
  SponsorType,
  VisitorType,
} from "@/lib/events-client";

/** Thrown by every function below — network, auth, or a rejected Backend
 * validation (`fieldErrors` populated in that case). Mirrors
 * `LandingServiceError` in `landing-admin-client.ts`. */
export class EventsServiceError extends Error {
  status?: number;
  fieldErrors?: string[];
  constructor(message: string, status?: number, fieldErrors?: string[]) {
    super(message);
    this.name = "EventsServiceError";
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

async function parseErrorResponse(response: Response): Promise<EventsServiceError> {
  let message = `Request failed (${response.status})`;
  let fieldErrors: string[] | undefined;
  try {
    const body: unknown = await response.json();
    if (body && typeof body === "object" && "message" in body) {
      const m = (body as { message: unknown }).message;
      if (Array.isArray(m)) {
        fieldErrors = m.map(String);
        message = fieldErrors.join(" ");
      } else if (typeof m === "string") {
        message = m;
      }
    }
  } catch {
    // Non-JSON error body — fall back to the generic message above.
  }
  return new EventsServiceError(message, response.status, fieldErrors);
}

// ---------------------------------------------------------------------------
// Events — moved to eventsh (Phase 4 API-client integration). Separate from
// authedFetch below (still this app's own Backend, used for
// Tickets/Sponsors until their own cutover) — see .env.example's EVENTSH_*
// comment for why these are two distinct backends during the transition.
// ---------------------------------------------------------------------------

function eventshConfig() {
  const url = process.env.EVENTSH_BACKEND_URL;
  const organizerId = process.env.EVENTSH_ORGANIZER_ID;
  const apiKey = process.env.EVENTSH_API_KEY;
  if (!url || !organizerId || !apiKey) {
    throw new EventsServiceError(
      "EVENTSH_BACKEND_URL / EVENTSH_ORGANIZER_ID / EVENTSH_API_KEY are missing. Set them in .env (see .env.example) — generate the key from eventsh's Super Admin, Organizers page.",
    );
  }
  return { url, organizerId, apiKey };
}

async function eventshFetch(path: string, init: RequestInit = {}): Promise<unknown> {
  const { url, organizerId, apiKey } = eventshConfig();

  let response: Response;
  try {
    response = await fetch(`${url}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        "x-organizer-id": organizerId,
        "x-api-key": apiKey,
        ...init.headers,
      },
      cache: "no-store",
    });
  } catch (cause) {
    const err = new EventsServiceError("eventsh is unreachable.");
    err.cause = cause;
    throw err;
  }

  if (!response.ok) throw await parseErrorResponse(response);
  if (response.status === 204) return null;
  return response.json();
}

export type EventInput = {
  slug?: string;
  title: string;
  summary?: string;
  description?: string;
  eventType?: string;
  category?: string;
  location?: string;
  venue?: string;
  address?: string;
  startDate: string; // ISO
  endDate: string; // ISO
  visibility?: "public" | "private" | "unlisted";
  tags?: string[];
  features?: Record<string, boolean>;
  ageRestriction?: string;
  dresscode?: string;
  specialInstructions?: string;
  refundPolicy?: string;
  termsAndConditions?: string;
  ageRestrictions?: { heading: string; age: string }[];
  dressCodeTheme?: string;
  adBar?: { visible?: boolean; message?: string; bgColor?: string; textColor?: string };
  customSections?: CustomSection[];
  image?: string;
  gallery?: string[];
  reelLinks?: string[];
  socialMedia?: Record<string, string>;
  status?: "draft" | "published" | "cancelled";
  speakers?: string[];
  speakerProfiles?: (Partial<Pick<SpeakerProfile, "id">> & Omit<SpeakerProfile, "id">)[];
  agenda?: AgendaItem[];
  currency?: string;
  published?: boolean;
  featured?: boolean;
  visitorTypes: (Pick<VisitorType, "id" | "name" | "price" | "maxCount"> &
    Partial<Pick<VisitorType, "soldCount" | "featureAccess" | "isActive" | "description">>)[];
  sponsorTypes?: (Partial<Pick<SponsorType, "id">> & Omit<SponsorType, "id">)[];
};

type SpeakerProfileInput = NonNullable<EventInput["speakerProfiles"]>[number];

// -- Field-mapping adapter: EventInput (this app's shape) <-> eventsh's
//    CreateEventDto/Event shape. See docs/PHASE4_SINGADVISOR field-mapping
//    audit in the eventsh repo (docs/API_CLIENT_INTEGRATION.md) for the
//    full table this implements. Kept entirely inside this file so nothing
//    else in the app (EventForm.tsx, EventCard.tsx, etc.) needs to know
//    eventsh's shape differs from this app's own — they keep using
//    EventInput/EventRow exactly as before.

function speakerProfileToEventshSpeaker(s: SpeakerProfileInput, index: number) {
  return {
    id: s.id || `spk-${index}`,
    name: s.name,
    title: s.role || undefined,
    organization: s.company || undefined,
    bio: s.description || undefined,
    image: s.photo || undefined,
    email: s.email || undefined,
    socialLinks: {
      linkedin: s.socialLinks?.linkedin || undefined,
      twitter: s.socialLinks?.twitter || undefined,
      website: s.socialLinks?.website || undefined,
      // instagram/youtube/facebook have no eventsh equivalent — dropped.
    },
    // eventsh models a speaker's talk as a list of slots (a speaker can have
    // more than one); this app's form has one flat topic/time per speaker —
    // written as a single-slot array.
    slots: [
      {
        topic: s.topic || "",
        startTime: s.startTime || undefined,
        endTime: s.endTime || undefined,
        description: s.description || undefined,
      },
    ],
    isKeynote: false,
    order: index,
  };
}

/** eventsh stores date and time-of-day as separate fields (`startDate`
 * date-only + `time` "HH:mm"); this app's form submits one combined
 * timestamp per field (see the matching combineDateAndTime() in
 * events-eventsh-adapter.ts for the read-side half and why this split
 * exists at all — found via a real "end must be after start" failure on
 * the admin edit form, not assumed). Splits using UTC methods so the
 * date portion doesn't shift to a different calendar day depending on the
 * server's local timezone. */
function splitDateAndTime(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { date: iso, time: "" };
  const pad = (n: number) => String(n).padStart(2, "0");
  const time = `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
  const dateOnly = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  return { date: dateOnly.toISOString(), time };
}

/** EventInput -> the JSON body eventsh's create-event/update endpoints
 * expect. Drops fields eventsh has nowhere to put (see the gaps noted
 * inline) rather than sending them and having them silently ignored. */
function toEventshPayload(input: EventInput): Record<string, unknown> {
  const {
    venue,
    currency,
    agenda,
    startDate,
    endDate,
    speakers: _bareSpeakers, // superseded by speakerProfiles below
    speakerProfiles,
    visitorTypes,
    ...rest
  } = input;

  if (agenda && agenda.length > 0) {
    // KNOWN GAP: eventsh has no field for a flat agenda (time + title) list
    // — its closest concept, `functions`, is wedding/marriage-ceremony
    // specific (venue/dress-code/timeline), not a general schedule. Agenda
    // entered in this app's form is NOT currently persisted through
    // eventsh. Flagged loudly rather than silently dropped — decide
    // whether to (a) drop the Agenda tab from the form, (b) stash it in
    // customSections with a private naming convention (risky: it would
    // then render on eventsh's own public pages unless specifically
    // filtered), or (c) ask for an eventsh schema addition.
    console.warn(
      "[events-admin-client] Agenda has content but eventsh has no field for it — this data will NOT be saved. See the KNOWN GAP comment in toEventshPayload().",
    );
  }

  const start = splitDateAndTime(startDate);
  const end = splitDateAndTime(endDate);

  return {
    ...rest,
    // venue -> location: a straight rename, eventsh's closest field.
    location: venue ?? rest.location,
    startDate: start.date,
    time: start.time,
    endDate: end.date,
    endTime: end.time,
    visitorTypes: visitorTypes?.map(({ soldCount: _soldCount, ...tier }) => tier),
    speakers: (speakerProfiles || []).map((s, i) => speakerProfileToEventshSpeaker(s, i)),
  };
}

/** eventsh's create/update controllers wrap the document in
 * `{ success, message, data }`; GET /events/:id and the organizer list
 * return the document(s) more directly (a bare doc, or `{ data: [...] }`
 * respectively). This narrows either shape without a cast through `any`. */
function unwrapEventshEvent(raw: unknown): EventshEventDoc {
  if (raw && typeof raw === "object" && "data" in raw) {
    return (raw as { data: EventshEventDoc }).data;
  }
  return raw as EventshEventDoc;
}

export async function fetchEventsAdmin(): Promise<EventRow[]> {
  const { organizerId } = eventshConfig();
  const result = (await eventshFetch(
    `/events/organizer/${organizerId}?publicOnly=false`,
  )) as { data: EventshEventDoc[] };
  return (result.data || []).map(fromEventshEvent);
}

export async function fetchEventAdmin(id: string): Promise<EventRow> {
  const raw = await eventshFetch(`/events/${id}`);
  return fromEventshEvent(unwrapEventshEvent(raw));
}

export async function createEvent(input: EventInput): Promise<EventRow> {
  const raw = await eventshFetch("/events/create-event", {
    method: "POST",
    body: JSON.stringify(toEventshPayload(input)),
  });
  return fromEventshEvent(unwrapEventshEvent(raw));
}

export async function updateEvent(id: string, input: EventInput): Promise<EventRow> {
  const raw = await eventshFetch(`/events/${id}`, {
    method: "PUT",
    body: JSON.stringify(toEventshPayload(input)),
  });
  return fromEventshEvent(unwrapEventshEvent(raw));
}

export async function deleteEvent(id: string): Promise<void> {
  await eventshFetch(`/events/${id}`, { method: "DELETE" });
}

/** Uploads to eventsh's /uploads/events and returns the path to store as
 * `image`. Not built on eventshFetch — a multipart body must not get the
 * JSON Content-Type that helper always sets. */
export async function uploadEventImage(file: File): Promise<{ url: string }> {
  const { url, organizerId, apiKey } = eventshConfig();

  const body = new FormData();
  body.append("file", file);

  let response: Response;
  try {
    response = await fetch(`${url}/uploads/events`, {
      method: "POST",
      headers: { "x-organizer-id": organizerId, "x-api-key": apiKey },
      body,
    });
  } catch (cause) {
    const err = new EventsServiceError("eventsh is unreachable.");
    err.cause = cause;
    throw err;
  }

  if (!response.ok) throw await parseErrorResponse(response);
  return response.json() as Promise<{ url: string }>;
}

// ---------------------------------------------------------------------------
// Tickets / Sponsors — NOT yet cut over to eventsh. Still this app's own
// Backend (session-cookie auth via authedFetch), same as before. See the
// eventsh repo's docs/API_CLIENT_INTEGRATION.md "recipe" step 5/6 — these
// need their own field-mapping audit before moving, same as Events got.
// ---------------------------------------------------------------------------

async function authedFetch(path: string, init: RequestInit = {}): Promise<unknown> {
  const token = await getSessionToken();
  if (!token) throw new EventsServiceError("Not authorised.", 401);

  const backendUrl = process.env.BACKEND_URL;
  if (!backendUrl) throw new EventsServiceError("BACKEND_URL is missing. Set it in .env.");

  let response: Response;
  try {
    response = await fetch(`${backendUrl}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...init.headers,
      },
      cache: "no-store",
    });
  } catch (cause) {
    const err = new EventsServiceError("The Backend is unreachable.");
    err.cause = cause;
    throw err;
  }

  if (!response.ok) throw await parseErrorResponse(response);
  if (response.status === 204) return null;
  return response.json();
}

export type TicketRow = {
  _id: string;
  ticketId: string;
  eventId: string;
  eventTitle: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  ticketDetails: { ticketType: string; quantity: number; price: number; tierId: string }[];
  totalAmount: number;
  currency: string;
  status: "pending" | "confirmed" | "cancelled" | "used";
  purchaseDate: string;
  isUsed: boolean;
};

// ---------------------------------------------------------------------------
// Tickets — cut over to eventsh (same as Events; unlike Sponsors below,
// which are still on this app's own Backend). Ticket *creation* moved in
// Backend/src/modules/tickets/tickets.service.ts (after Razorpay
// verification, which stays exactly as-is there) — this is the admin-read/
// action half, same eventshFetch pattern as Events above.
// ---------------------------------------------------------------------------

interface EventshTicketDoc {
  _id: string;
  ticketId: string;
  eventId: string;
  eventTitle: string;
  customerName: string;
  customerEmail: string;
  customerWhatsapp?: string;
  ticketDetails: { ticketType: string; quantity: number; price: number; tierId?: string }[];
  totalAmount: number;
  status: "pending" | "confirmed" | "cancelled" | "used";
  purchaseDate: string;
  isUsed: boolean;
}

function fromEventshTicket(raw: EventshTicketDoc): TicketRow {
  return {
    _id: raw._id,
    ticketId: raw.ticketId,
    eventId: String(raw.eventId),
    eventTitle: raw.eventTitle,
    customerName: raw.customerName,
    customerEmail: raw.customerEmail,
    // eventsh tracks one "customerWhatsapp" field, not a separate phone —
    // closest available mapping.
    customerPhone: raw.customerWhatsapp || "",
    ticketDetails: raw.ticketDetails.map((d) => ({
      ticketType: d.ticketType,
      quantity: d.quantity,
      price: d.price,
      tierId: d.tierId || "",
    })),
    totalAmount: raw.totalAmount,
    // eventsh has no per-ticket currency field — same fixed-per-Organizer
    // assumption as Events (see events-eventsh-adapter.ts).
    currency: process.env.EVENTSH_DEFAULT_CURRENCY || "SGD",
    status: raw.status,
    purchaseDate: raw.purchaseDate,
    isUsed: raw.isUsed,
  };
}

export async function fetchTicketsAdmin(): Promise<TicketRow[]> {
  const { organizerId } = eventshConfig();
  const raw = (await eventshFetch(
    `/tickets/organizer/${organizerId}`,
  )) as EventshTicketDoc[];
  return (raw || []).map(fromEventshTicket);
}

export async function setTicketStatusAdmin(
  id: string,
  status: TicketRow["status"],
): Promise<TicketRow> {
  const raw = await eventshFetch(`/tickets/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
  return fromEventshTicket(raw as EventshTicketDoc);
}

export async function resendTicketEmailAdmin(id: string): Promise<void> {
  await eventshFetch(`/tickets/${id}/resend-email`, { method: "POST" });
}

export type SponsorRequestRow = {
  _id: string;
  eventId: string;
  sponsorTypeId: string;
  sponsorTypeName: string;
  amount: number;
  collectPayment: boolean;
  selectedOptions: string[];
  companyName: string;
  contactName: string;
  email: string;
  businessEmail: string;
  phone: string;
  website: string;
  logo: string;
  message: string;
  transactionId: string;
  transactionScreenshot: string;
  paymentMethod: string;
  paymentVerified: boolean;
  status: "Applied" | "Approved" | "PaymentSubmitted" | "Confirmed" | "Rejected" | "Cancelled";
  statusHistory: { status: string; note: string; changedAt: string }[];
  createdAt: string;
};

export function fetchSponsorRequestsAdmin(eventId: string): Promise<SponsorRequestRow[]> {
  return authedFetch(`/sponsor-requests?eventId=${eventId}`) as Promise<SponsorRequestRow[]>;
}

export function setSponsorRequestStatus(
  id: string,
  status: SponsorRequestRow["status"],
  note?: string,
): Promise<SponsorRequestRow> {
  return authedFetch(`/sponsor-requests/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status, note }),
  }) as Promise<SponsorRequestRow>;
}

export function verifySponsorPayment(id: string): Promise<SponsorRequestRow> {
  return authedFetch(`/sponsor-requests/${id}/verify-payment`, { method: "PATCH" }) as Promise<SponsorRequestRow>;
}
