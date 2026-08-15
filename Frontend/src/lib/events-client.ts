import "server-only";
import { withBackendUrl } from "@/lib/media-url";

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
    image: withBackendUrl(event.image),
    venue: event.venue,
    startDate: event.startDate,
    endDate: event.endDate,
    speakers: event.speakers,
    price: fromPrice(event),
    currency: event.currency,
  };
}

/**
 * Public reads only — never throws, returns [] / null on any failure (Backend
 * down, network error) so pages degrade instead of 500ing. Mirrors
 * `fetchLandingSections` in `landing-client.ts`.
 */
export async function fetchPublishedEvents(opts: { includePast?: boolean } = {}): Promise<EventRow[]> {
  const backendUrl = process.env.BACKEND_URL;
  if (!backendUrl) {
    console.error("BACKEND_URL is missing; events pages will render empty.");
    return [];
  }
  try {
    const qs = opts.includePast ? "?includePast=true" : "";
    const response = await fetch(`${backendUrl}/events${qs}`, { next: { revalidate: 60 } });
    if (!response.ok) return [];
    const data: unknown = await response.json();
    return Array.isArray(data) ? (data as EventRow[]) : [];
  } catch {
    return [];
  }
}

export async function fetchEventBySlug(slug: string): Promise<EventRow | null> {
  const backendUrl = process.env.BACKEND_URL;
  if (!backendUrl) return null;
  try {
    const response = await fetch(`${backendUrl}/events/slug/${encodeURIComponent(slug)}`, {
      next: { revalidate: 60 },
    });
    if (!response.ok) return null;
    return (await response.json()) as EventRow;
  } catch {
    return null;
  }
}
