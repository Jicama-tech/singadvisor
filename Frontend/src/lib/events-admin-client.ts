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
  Volunteer,
  SeatRowTemplate,
  PositionedSeat,
  TableTemplate,
  PositionedTable,
  AddOnItem,
  RoundTableTemplate,
  PositionedRoundTable,
  WorkshopSession,
  WorkshopPackage,
  ScheduledSpaceTemplate,
  PositionedScheduledSpace,
  VenueConfig,
  SpeakerSlotTemplate,
  PositionedSpeakerZone,
  VenueDoor,
  VenueAnnotation,
  EventChatbot,
  StallTerm,
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
  chatbot?: EventChatbot;
  termsAndConditionsforStalls?: StallTerm[];
  customSections?: CustomSection[];
  image?: string;
  gallery?: string[];
  sponsors?: string[];
  showSponsorBar?: boolean;
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
  // Phase 8 additions — all optional (an event with none of these is still
  // perfectly valid, same as today). Field names match eventsh's
  // createEvent.dto.ts exactly so toEventshPayload()'s `...rest` needs no
  // per-field handling for any of them.
  volunteers?: Volunteer[];
  seatRowTemplates?: SeatRowTemplate[];
  venueSeats?: PositionedSeat[];
  tableTemplates?: TableTemplate[];
  venueTables?: PositionedTable[];
  addOnItems?: AddOnItem[];
  maxSpacesPerVendor?: number;
  autoGenerateVendorCoupon?: boolean;
  showSpacePricesOnEventfront?: boolean;
  roundTableTemplates?: RoundTableTemplate[];
  venueRoundTables?: PositionedRoundTable[];
  workshopSessions?: WorkshopSession[];
  workshopPackages?: WorkshopPackage[];
  workshopHostingOpen?: boolean;
  scheduledSpaceTemplates?: ScheduledSpaceTemplate[];
  venueScheduledSpaces?: PositionedScheduledSpace[];
  venueConfig?: VenueConfig[];
  venueDoors?: VenueDoor[];
  venueAnnotations?: VenueAnnotation[];
  speakerSlotTemplates?: SpeakerSlotTemplate[];
  venueSpeakerZones?: PositionedSpeakerZone[];
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
 * the admin edit form, not assumed).
 *
 * Inverse of combineDateAndTime's Singapore-offset handling: this app
 * displays every date/time in Singapore time regardless of viewer/server
 * timezone (utils.ts's `formatDateTime`, `timeZone: "Asia/Singapore"`), so
 * the "HH:mm" eventsh expects has to be the SGT wall-clock reading of this
 * timestamp, not its raw UTC hours — otherwise a 9am SGT event round-trips
 * back out as 5pm (found via a real rendered event page after the first,
 * UTC-only version of this fix; a DB-level check alone didn't render
 * through the SGT formatter, so it looked correct there). Shift the
 * instant by +8h first, then read UTC fields off the shifted value — that
 * also naturally recovers the correct SGT calendar day when the shift
 * crosses midnight, not just the correct clock digits. */
function splitDateAndTime(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { date: iso, time: "" };
  const SGT_OFFSET_MS = 8 * 60 * 60 * 1000;
  const sgt = new Date(d.getTime() + SGT_OFFSET_MS);
  const pad = (n: number) => String(n).padStart(2, "0");
  const time = `${pad(sgt.getUTCHours())}:${pad(sgt.getUTCMinutes())}`;
  const dateOnly = new Date(Date.UTC(sgt.getUTCFullYear(), sgt.getUTCMonth(), sgt.getUTCDate()));
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
    eventType, // see the reassignment below — not eventsh-compatible as-is
    category,
    speakers: _bareSpeakers, // superseded by speakerProfiles below
    speakerProfiles,
    visitorTypes,
    termsAndConditionsforStalls,
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
    // eventType is NOT the same field on both sides despite the identical
    // name — this app's own "Event type" input is free text ("Workshop",
    // "Conference", defaulting to the literal string "general" when left
    // untouched — EventForm.tsx's `?? "general"` fallback). eventsh's
    // `eventType` is a strict schema enum, "commercial" | "personal" only —
    // sending "general" straight through failed with a real Mongoose
    // validation error ("`general` is not a valid enum value for path
    // `eventType`"), confirmed by actually submitting the form, not
    // assumed. This app has no "commercial vs personal" concept of its own
    // (it never asks), and every event it creates is a business/public one
    // (trainings, consultancy, career workshops) — never a private family
    // function — so eventsh's "commercial" is always correct here.
    // Category is the field that actually carries the free-text
    // Workshop/Conference-style value on eventsh; if this app's own
    // Category field was left blank, fall back to whatever was typed into
    // Event type (as long as it isn't just the untouched "general" default)
    // rather than losing that value entirely.
    eventType: "commercial",
    category: category || (eventType && eventType !== "general" ? eventType : undefined),
    visitorTypes: visitorTypes?.map(({ soldCount: _soldCount, ...tier }) => tier),
    speakers: (speakerProfiles || []).map((s, i) => speakerProfileToEventshSpeaker(s, i)),
    // eventsh's DTO item shape nests the text under a self-referential key
    // (`{ termsAndConditionsforStalls: string }`) rather than a plain `text`
    // field — renamed here, at the payload boundary, same pattern as the
    // venue -> location rename above.
    termsAndConditionsforStalls: termsAndConditionsforStalls?.map((t) => ({
      termsAndConditionsforStalls: t.text,
      isMandatory: t.isMandatory,
    })),
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

/** Check-in. Deliberately NOT setTicketStatusAdmin (`PATCH /tickets/:id`,
 * a generic field patch by Mongo _id) — eventsh's real door-scan action is
 * this dedicated endpoint, looked up by the human-readable `ticketId`, which
 * sets both `attendance` and `isUsed` server-side (see
 * tickets.service.ts's markAttendance). Confirmed by reading eventsh's own
 * QR scanner (ORCodeScanner.tsx) and service code, not assumed from the
 * similar-looking generic endpoint. */
export async function markTicketAttendanceAdmin(ticketId: string): Promise<void> {
  await eventshFetch(`/tickets/mark-attendance/${ticketId}`, { method: "PATCH" });
}

// ---------------------------------------------------------------------------
// Coupons — cut over to eventsh alongside Events (same eventshFetch, same
// organizer). coupon.controller.ts's writes were unauthenticated until the
// Phase 6a guard fix; every call below now relies on eventshFetch's
// x-organizer-id/x-api-key headers to satisfy that guard.
// ---------------------------------------------------------------------------

export type CouponRow = {
  _id: string;
  code: string;
  discountType: "PERCENTAGE" | "FLAT";
  discountPercentage?: number;
  flatDiscountAmount?: number;
  minOrderAmount?: number;
  maxUsage?: number;
  usedCount: number;
  expiryDate: string;
  isActive: boolean;
  eventIds: string[];
};

export type CouponInput = {
  code: string;
  discountType: "PERCENTAGE" | "FLAT";
  discountPercentage?: number;
  flatDiscountAmount?: number;
  minOrderAmount?: number;
  maxUsage?: number;
  expiryDate: string; // ISO
  isActive?: boolean;
  eventIds?: string[];
};

interface EventshCouponDoc {
  _id: string;
  code: string;
  discountType: "PERCENTAGE" | "FLAT";
  discountPercentage?: number;
  flatDiscountAmount?: number;
  minOrderAmount?: number;
  maxUsage?: number;
  usedCount: number;
  expiryDate: string;
  isActive: boolean;
  eventIds?: string[];
  eventId?: string; // legacy single-event field
}

function fromEventshCoupon(raw: EventshCouponDoc): CouponRow {
  return {
    _id: raw._id,
    code: raw.code,
    discountType: raw.discountType,
    discountPercentage: raw.discountPercentage,
    flatDiscountAmount: raw.flatDiscountAmount,
    minOrderAmount: raw.minOrderAmount,
    maxUsage: raw.maxUsage,
    usedCount: raw.usedCount ?? 0,
    expiryDate: raw.expiryDate,
    isActive: raw.isActive,
    // Migrate legacy single-event coupons the same way eventsh's own
    // CouponsManager.tsx does when reading them back.
    eventIds:
      raw.eventIds && raw.eventIds.length > 0
        ? raw.eventIds
        : raw.eventId
          ? [raw.eventId]
          : [],
  };
}

export async function fetchCouponsAdmin(): Promise<CouponRow[]> {
  const { organizerId } = eventshConfig();
  try {
    const result = (await eventshFetch(`/coupons/organizer/${organizerId}`)) as {
      data: EventshCouponDoc[];
    };
    return (result.data || []).map(fromEventshCoupon);
  } catch (err) {
    // findByOrganizer throws a 404 ("No coupons found") when the list is
    // empty rather than returning an empty array — treat that specific case
    // as "no coupons yet", not an error.
    if (err instanceof EventsServiceError && err.status === 404) return [];
    throw err;
  }
}

export async function createCoupon(input: CouponInput): Promise<CouponRow> {
  const { organizerId } = eventshConfig();
  const raw = await eventshFetch("/coupons/create-coupon", {
    method: "POST",
    body: JSON.stringify({ ...input, organizerId, appliesTo: "ORGANIZER" }),
  });
  return fromEventshCoupon(raw as EventshCouponDoc);
}

export async function updateCoupon(
  id: string,
  input: Partial<CouponInput>,
): Promise<CouponRow> {
  const raw = (await eventshFetch(`/coupons/update-coupon/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  })) as { data: EventshCouponDoc };
  return fromEventshCoupon(raw.data);
}

export async function setCouponActive(id: string, isActive: boolean): Promise<CouponRow> {
  return updateCoupon(id, { isActive });
}

export async function deleteCoupon(id: string): Promise<void> {
  await eventshFetch(`/coupons/delete-coupon/${id}`, { method: "DELETE" });
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
