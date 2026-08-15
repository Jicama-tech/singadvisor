import "server-only";
import { withEventshUrl } from "@/lib/media-url";
import { fromEventshEvent, type EventshEventDoc } from "@/lib/events-eventsh-adapter";

export type VisitorType = {
  id: string;
  name: string;
  price: number; // decimal currency units (e.g. dollars), not minor units
  maxCount: number;
  soldCount: number;
  description: string;
  featureAccess: string[];
  isActive: boolean;
};

export type AgendaItem = { time: string; title: string };
export type CustomSection = { id: string; heading: string; content: string };
export type AgeRestrictionEntry = { heading: string; age: string };
export type AdBar = { visible: boolean; message: string; bgColor: string; textColor: string };
export type SpeakerSocialLinks = {
  linkedin: string;
  instagram: string;
  youtube: string;
  facebook: string;
  twitter: string;
  website: string;
};
export type SpeakerProfile = {
  id: string;
  name: string;
  role: string;
  company: string;
  photo: string;
  topic: string;
  description: string;
  startTime: string;
  endTime: string;
  whatsApp: string;
  email: string;
  socialLinks: SpeakerSocialLinks;
};
export type SponsorType = {
  id: string;
  name: string;
  price: number;
  collectPayment: boolean;
  customOptions: string[];
  description: string;
};

export type EventRow = {
  _id: string;
  slug: string;
  title: string;
  summary: string;
  description: string;
  eventType: string;
  category: string;
  startDate: string;
  endDate: string;
  time: string;
  endTime: string;
  location: string;
  venue: string;
  address: string;
  visibility: "public" | "private" | "unlisted";
  tags: string[];
  features: Record<string, boolean>;
  ageRestriction: string;
  ageRestrictions: AgeRestrictionEntry[];
  dresscode: string;
  dressCodeTheme: string;
  adBar: AdBar;
  specialInstructions: string;
  refundPolicy: string;
  termsAndConditions: string;
  customSections: CustomSection[];
  registrationFormFields: Record<string, unknown>;
  image: string;
  gallery: string[];
  reelLinks: string[];
  socialMedia: Record<string, string>;
  status: "draft" | "published" | "cancelled";
  published: boolean;
  featured: boolean;
  speakers: string[];
  speakerProfiles: SpeakerProfile[];
  agenda: AgendaItem[];
  currency: string;
  visitorTypes: VisitorType[];
  sponsorTypes: SponsorType[];
  createdAt: string;
  updatedAt: string;
};

/** Sum of every active tier's remaining headroom — the new equivalent of
 * the old Prisma model's flat `capacity - taken` computation. */
export function remainingCapacity(event: EventRow): number {
  return event.visitorTypes
    .filter((t) => t.isActive)
    .reduce((sum, t) => sum + Math.max(0, t.maxCount - t.soldCount), 0);
}

/** Lowest active tier price — what a listing card shows as "from $X". */
export function fromPrice(event: EventRow): number {
  const active = event.visitorTypes.filter((t) => t.isActive);
  if (active.length === 0) return 0;
  return Math.min(...active.map((t) => t.price));
}

/** Adapts a fetched `EventRow` to the shape `EventCard` (and the landing
 * `EventsSection`) render — see `components/cards/EventCard.tsx`. */
export function toEventCardData(event: EventRow) {
  return {
    slug: event.slug,
    title: event.title,
    summary: event.summary,
    image: withEventshUrl(event.image),
    venue: event.venue,
    startDate: event.startDate,
    endDate: event.endDate,
    speakers: event.speakers,
    price: fromPrice(event),
    currency: event.currency,
  };
}

// ---------------------------------------------------------------------------
// Public reads — moved to eventsh (Phase 4 API-client integration). These
// functions never run in a visitor's browser (this whole file is
// "server-only"), so they can carry the x-organizer-id header on every call
// without needing a real logged-in user — see events-admin-client.ts's
// eventshConfig() for the same pattern on the write side.
//
// Deliberately organizer-scoped: eventsh has no bare "/events" list or
// "/events/slug/:slug" lookup (a slug is only unique per organizer there,
// not globally) — this app's own old Backend had both because it was
// single-tenant. See docs/API_CLIENT_INTEGRATION.md (eventsh repo) for the
// full rationale.
//
// Never throws — returns [] / null on any failure (Backend down, network
// error, missing env config) so pages degrade instead of 500ing. Mirrors
// `fetchLandingSections` in `landing-client.ts`.
// ---------------------------------------------------------------------------

export async function fetchPublishedEvents(opts: { includePast?: boolean } = {}): Promise<EventRow[]> {
  const backendUrl = process.env.EVENTSH_BACKEND_URL;
  const organizerId = process.env.EVENTSH_ORGANIZER_ID;
  if (!backendUrl || !organizerId) {
    console.error(
      "EVENTSH_BACKEND_URL/EVENTSH_ORGANIZER_ID are missing; events pages will render empty.",
    );
    return [];
  }
  try {
    const response = await fetch(
      `${backendUrl}/events/organizer/${organizerId}?publicOnly=true`,
      { next: { revalidate: 60 } },
    );
    if (!response.ok) return [];
    const body = (await response.json()) as { data?: EventshEventDoc[] };
    const events = (body.data || []).map(fromEventshEvent);
    // includePast used to be a query param on this app's own single-tenant
    // Backend; eventsh's organizer-scoped list doesn't filter by date, so
    // apply the same "past events excluded by default" behavior here.
    if (opts.includePast) return events;
    const now = Date.now();
    return events.filter((e) => new Date(e.endDate || e.startDate).getTime() >= now);
  } catch {
    return [];
  }
}

export async function fetchEventBySlug(slug: string): Promise<EventRow | null> {
  const backendUrl = process.env.EVENTSH_BACKEND_URL;
  const organizerId = process.env.EVENTSH_ORGANIZER_ID;
  if (!backendUrl || !organizerId) return null;
  try {
    const response = await fetch(
      `${backendUrl}/events/organizer/${organizerId}/slug/${encodeURIComponent(slug)}`,
      { next: { revalidate: 60 } },
    );
    if (!response.ok) return null;
    const body = (await response.json()) as { data?: EventshEventDoc };
    if (!body?.data) return null;
    return fromEventshEvent(body.data);
  } catch {
    return null;
  }
}
