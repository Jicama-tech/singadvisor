import "server-only";
import { getSessionToken } from "@/lib/auth";
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

  if (!response.ok) {
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
    throw new EventsServiceError(message, response.status, fieldErrors);
  }

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

export function fetchEventsAdmin(): Promise<EventRow[]> {
  return authedFetch("/events/admin") as Promise<EventRow[]>;
}

export function fetchEventAdmin(id: string): Promise<EventRow> {
  return authedFetch(`/events/${id}`) as Promise<EventRow>;
}

export function createEvent(input: EventInput): Promise<EventRow> {
  return authedFetch("/events", { method: "POST", body: JSON.stringify(input) }) as Promise<EventRow>;
}

export function updateEvent(id: string, input: EventInput): Promise<EventRow> {
  return authedFetch(`/events/${id}`, { method: "PUT", body: JSON.stringify(input) }) as Promise<EventRow>;
}

export async function deleteEvent(id: string): Promise<void> {
  await authedFetch(`/events/${id}`, { method: "DELETE" });
}

/** Uploads to Backend/uploads/events/ and returns the path to store as
 * `image`. Not built on `authedFetch` — a multipart body must not get the
 * JSON Content-Type that helper always sets; mirrors
 * `uploadLandingMedia` in `landing-admin-client.ts`. */
export async function uploadEventImage(file: File): Promise<{ url: string }> {
  const token = await getSessionToken();
  if (!token) throw new EventsServiceError("Not authorised.", 401);

  const backendUrl = process.env.BACKEND_URL;
  if (!backendUrl) throw new EventsServiceError("BACKEND_URL is missing. Set it in .env.");

  const body = new FormData();
  body.append("file", file);

  let response: Response;
  try {
    response = await fetch(`${backendUrl}/uploads/events`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body,
    });
  } catch (cause) {
    const err = new EventsServiceError("The Backend is unreachable.");
    err.cause = cause;
    throw err;
  }

  if (!response.ok) {
    let message = `Upload failed (${response.status})`;
    try {
      const body: unknown = await response.json();
      if (body && typeof body === "object" && "message" in body && typeof body.message === "string") {
        message = body.message;
      }
    } catch {
      // Non-JSON error body — fall back to the generic message above.
    }
    throw new EventsServiceError(message, response.status);
  }

  return response.json() as Promise<{ url: string }>;
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

export function fetchTicketsAdmin(eventId?: string): Promise<TicketRow[]> {
  const qs = eventId ? `?eventId=${eventId}` : "";
  return authedFetch(`/tickets/admin${qs}`) as Promise<TicketRow[]>;
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
