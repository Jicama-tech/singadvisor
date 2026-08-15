import "server-only";
import type { EventRow, SpeakerProfile } from "@/lib/events-client";

// Shared by events-client.ts (public reads) and events-admin-client.ts
// (authenticated writes + admin reads) — both need to turn a raw eventsh
// Event document into this app's EventRow shape, so it lives here once
// instead of being duplicated (and drifting) in both files. See
// events-admin-client.ts's toEventshPayload() for the write-side half of
// this adapter (not shared — only the admin client writes).
//
// Full field-mapping rationale: docs/API_CLIENT_INTEGRATION.md in the
// eventsh repo.

/** Loosely-typed shape of a raw eventsh Event document — every field
 * optional since this is external wire data being read defensively, not a
 * contract eventsh guarantees to this app. Only the fields this adapter
 * actually reads are listed. Exported so events-admin-client.ts can type
 * eventsh's wrapped `{ success, message, data }` responses instead of
 * casting through `any`. */
export interface EventshEventDoc {
  _id: string;
  slug?: string;
  title?: string;
  description?: string;
  eventType?: string;
  category?: string;
  startDate: string;
  endDate?: string;
  time?: string;
  endTime?: string;
  location?: string;
  address?: string;
  visibility?: "public" | "private" | "unlisted";
  tags?: string[];
  features?: Record<string, boolean>;
  ageRestriction?: string;
  ageRestrictions?: { heading: string; age: string }[];
  dresscode?: string;
  dressCodeTheme?: string;
  adBar?: { visible?: boolean; message?: string; bgColor?: string; textColor?: string };
  specialInstructions?: string;
  refundPolicy?: string;
  termsAndConditions?: string;
  customSections?: { id: string; heading: string; content: string }[];
  registrationFormFields?: Record<string, unknown>;
  image?: string;
  gallery?: string[];
  reelLinks?: string[];
  socialMedia?: Record<string, string>;
  status?: "draft" | "published" | "cancelled";
  published?: boolean;
  featured?: boolean;
  speakers?: EventshSpeakerDoc[];
  visitorTypes?: EventshVisitorTypeDoc[];
  sponsorTypes?: {
    id: string;
    name: string;
    price: number;
    description?: string;
    isActive?: boolean;
    collectPayment?: boolean;
    customOptions?: string[];
  }[];
  createdAt: string;
  updatedAt: string;
}

interface EventshSpeakerDoc {
  id?: string;
  name?: string;
  title?: string;
  organization?: string;
  bio?: string;
  image?: string;
  email?: string;
  socialLinks?: { linkedin?: string; twitter?: string; website?: string };
  slots?: { topic?: string; startTime?: string; endTime?: string; description?: string }[];
}

interface EventshVisitorTypeDoc {
  id: string;
  name: string;
  price: number;
  maxCount?: number;
  description?: string;
  featureAccess?: string[];
  isActive?: boolean;
  // Present on public/slug/list reads (EventsService.attachSoldCounts()),
  // absent on the admin GET /events/:id path — always normalized to a
  // number below regardless of source.
  soldCount?: number;
}

/** eventsh stores date and time-of-day separately — `startDate`/`endDate`
 * are date-only (normalized to midnight UTC by eventsh's own organizer UI;
 * confirmed against real data), with the actual hh:mm in a separate
 * `time`/`endTime` string field. This app's own model has no such split —
 * EventForm.tsx's single `startsAt`/`endsAt` datetime-local inputs (and the
 * "end must be after start" check comparing them) expect ONE combined
 * timestamp per field. Passing eventsh's date-only startDate straight
 * through silently zeroed every event's time-of-day and made any same-day
 * event fail that check (start === end, both midnight) — found via a real
 * edit through the admin UI, not assumed. Combines using UTC methods
 * (not the server's local timezone) so the already-UTC-midnight date
 * portion never shifts to a different calendar day. */
function combineDateAndTime(dateIso: string, timeStr?: string): string {
  const d = new Date(dateIso);
  if (Number.isNaN(d.getTime()) || !timeStr) return dateIso;
  const match = /^(\d{1,2}):(\d{2})/.exec(timeStr);
  if (!match) return dateIso;
  d.setUTCHours(Number(match[1]), Number(match[2]), 0, 0);
  return d.toISOString();
}

function eventshSpeakerToProfile(sp: EventshSpeakerDoc): SpeakerProfile {
  const firstSlot = sp.slots?.[0];
  return {
    id: sp.id || "",
    name: sp.name || "",
    role: sp.title || "",
    company: sp.organization || "",
    photo: sp.image || "",
    topic: firstSlot?.topic || "",
    description: sp.bio || firstSlot?.description || "",
    startTime: firstSlot?.startTime || "",
    endTime: firstSlot?.endTime || "",
    whatsApp: "", // no eventsh equivalent
    email: sp.email || "",
    socialLinks: {
      linkedin: sp.socialLinks?.linkedin || "",
      instagram: "", // no eventsh equivalent
      youtube: "", // no eventsh equivalent
      facebook: "", // no eventsh equivalent
      twitter: sp.socialLinks?.twitter || "",
      website: sp.socialLinks?.website || "",
    },
  };
}

/** Raw eventsh Event document -> this app's EventRow shape. */
export function fromEventshEvent(raw: EventshEventDoc): EventRow {
  const speakerProfiles: SpeakerProfile[] = (raw.speakers || []).map(eventshSpeakerToProfile);
  return {
    _id: raw._id,
    slug: raw.slug || "",
    title: raw.title || "",
    summary: raw.description || "", // eventsh has no separate short-excerpt field
    description: raw.description || "",
    eventType: raw.eventType || "",
    category: raw.category || "",
    // See combineDateAndTime — eventsh's startDate/endDate are date-only;
    // this app's model expects the real time-of-day folded in.
    startDate: combineDateAndTime(raw.startDate, raw.time),
    endDate: raw.endDate ? combineDateAndTime(raw.endDate, raw.endTime) : "",
    time: raw.time || "",
    endTime: raw.endTime || "",
    location: raw.location || "",
    venue: raw.location || "", // eventsh has no separate venue field
    address: raw.address || "",
    visibility: raw.visibility || "public",
    tags: raw.tags || [],
    features: raw.features || {},
    ageRestriction: raw.ageRestriction || "",
    ageRestrictions: raw.ageRestrictions || [],
    dresscode: raw.dresscode || "",
    dressCodeTheme: raw.dressCodeTheme || "",
    adBar: {
      visible: raw.adBar?.visible ?? false,
      message: raw.adBar?.message || "",
      bgColor: raw.adBar?.bgColor || "",
      textColor: raw.adBar?.textColor || "",
    },
    specialInstructions: raw.specialInstructions || "",
    refundPolicy: raw.refundPolicy || "",
    termsAndConditions: raw.termsAndConditions || "",
    customSections: raw.customSections || [],
    registrationFormFields: raw.registrationFormFields || {},
    image: raw.image || "",
    gallery: raw.gallery || [],
    reelLinks: raw.reelLinks || [],
    socialMedia: raw.socialMedia || {},
    status: raw.status || "draft",
    published: !!raw.published,
    featured: !!raw.featured,
    speakers: speakerProfiles.map((s) => s.name),
    speakerProfiles,
    // KNOWN GAP: eventsh has no field for a flat agenda (time + title) list
    // — its closest concept, `functions`, is wedding/marriage-ceremony
    // specific, not a general schedule. Always empty until agenda has an
    // eventsh-side home (see events-admin-client.ts's toEventshPayload for
    // the write-side warning when this data would be lost).
    agenda: [],
    // eventsh derives currency from the Organizer's country rather than
    // storing it per-event; this integration is locked to one Organizer,
    // so it's effectively fixed. See .env.example.
    currency: process.env.EVENTSH_DEFAULT_CURRENCY || "SGD",
    visitorTypes: (raw.visitorTypes || []).map((vt) => ({
      id: vt.id,
      name: vt.name,
      price: vt.price,
      maxCount: vt.maxCount ?? 0,
      soldCount: vt.soldCount ?? 0,
      description: vt.description || "",
      featureAccess: vt.featureAccess || [],
      isActive: vt.isActive ?? true,
    })),
    sponsorTypes: (raw.sponsorTypes || []).map((st) => ({
      id: st.id,
      name: st.name,
      price: st.price,
      collectPayment: st.collectPayment ?? false,
      customOptions: st.customOptions || [],
      description: st.description || "",
    })),
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}
