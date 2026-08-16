import "server-only";
import { withEventshUrl } from "@/lib/media-url";
import { fromEventshEvent, type EventshEventDoc } from "@/lib/events-eventsh-adapter";

/** Open key set (Phase 9c) — eventsh's own Visitors tab lets an organizer
 * add arbitrary custom feature names alongside the 6 defaults (food/
 * parking/wifi/photography/security/accessibility), and its backend really
 * does persist them despite VisitorFeatureAccessDto's own class-validator
 * shape looking fixed — confirmed directly against the live dedicated
 * instance (a custom "lounge" key round-tripped through create+refetch
 * intact), not assumed from the DTO's declared shape alone. */
export type VisitorFeatureAccess = Record<string, boolean>;

export type VisitorType = {
  id: string;
  name: string;
  price: number; // decimal currency units (e.g. dollars), not minor units
  maxCount: number;
  soldCount: number;
  description: string;
  featureAccess: VisitorFeatureAccess;
  isActive: boolean;
};

export type AgendaItem = { time: string; title: string };
export type CustomSection = { id: string; heading: string; content: string };
export type AgeRestrictionEntry = { heading: string; age: string };
export type AdBar = { visible: boolean; message: string; bgColor: string; textColor: string };

/** Public Eventfront chatbot settings (Phase 9b) — eventsh's own DTO shape
 * (`createEvent.dto.ts`'s `chatbot?: { enabled?, name?, accentColor? }`).
 * `enabled` shows/hides the floating widget on the public event page;
 * `name` falls back to "Event Assistant" if blank. */
export type EventChatbot = { enabled: boolean; name: string; accentColor: string };

/** A single condition a stall/exhibitor must agree to when booking a space
 * (Phase 9b) — matches eventsh's `termsAndConditionsforStalls` DTO in
 * substance, renamed to a plain `text` field here rather than the DTO's own
 * self-referential key name (`{ termsAndConditionsforStalls: string }`);
 * the rename happens at the payload boundary in toEventshPayload(). */
export type StallTerm = { text: string; isMandatory: boolean };
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

// ---------------------------------------------------------------------------
// Phase 8 — venue/space types. Field names/shapes match eventsh's
// createEvent.dto.ts exactly (TableTemplateDto, RoundTableTemplateDto, etc.)
// so toEventshPayload()'s `...rest` pass-through needs no per-field mapping
// for any of these — only fromEventshEvent() (events-eventsh-adapter.ts)
// needs explicit read-side wiring, done alongside these types.
// ---------------------------------------------------------------------------

export type Volunteer = { name: string; email: string; phoneNumber: string };

export type SeatRowTemplate = { id: string; name: string; price: number; color: string };
export type PositionedSeat = {
  id: string;
  rowId: string;
  seatNumber: number;
  color: string;
  name: string;
  x: number;
  y: number;
  rotation: number;
  venueConfigId: string;
};

export type TableTemplate = {
  id: string;
  name: string;
  type: "Straight";
  width: number;
  height: number;
  rowNumber?: number;
  tablePrice: number;
  bookingPrice: number;
  depositPrice: number;
  isBooked: boolean;
  bookedBy: string;
  customDimensions: boolean;
};
export type PositionedTable = TableTemplate & {
  positionId: string;
  tableName: string;
  x: number;
  y: number;
  rotation: number;
  isPlaced: boolean;
  venueConfigId: string;
};

export type AddOnItem = {
  id: string;
  name: string;
  price: number;
  addOnImage: string;
  description: string;
  maxPerSpace?: number;
  maxPerTemplate?: Record<string, number>;
};

export type RoundTableTemplate = {
  id: string;
  name: string;
  numberOfChairs: number;
  sellingMode: "table" | "chair";
  tablePrice: number;
  chairPrice: number;
  bookingPrice: number;
  depositPrice: number;
  memberTablePrice?: number;
  memberChairPrice?: number;
  memberBookingPrice?: number;
  memberDepositPrice?: number;
  category: string;
  color: string;
  tableDiameter: number;
  forSale: boolean;
};
export type PositionedRoundTable = RoundTableTemplate & {
  positionId: string;
  templateId: string;
  x: number;
  y: number;
  rotation: number;
  isPlaced: boolean;
  venueConfigId: string;
  bookedChairs: number[];
  isFullyBooked: boolean;
};

export type WorkshopSession = {
  id: string;
  name: string;
  description: string;
  image: string;
  price: number;
  facilitator: string;
  startTime: string;
  endTime: string;
  maxSeats: number;
  order: number;
};
export type WorkshopPackage = {
  id: string;
  name: string;
  description: string;
  price: number;
  sessionIds: string[];
  order: number;
};

export type ScheduleSlot = { id: string; label: string; date: string; startTime: string; endTime: string };
export type ScheduledSpaceTemplate = {
  id: string;
  facilityType: string;
  name: string;
  shape: "Rectangle" | "Circle";
  width: number;
  height: number;
  diameter: number;
  price: number;
  color: string;
  slots: ScheduleSlot[];
  // Operator this space is assigned to — SingAdvisor has no Operator
  // concept today; kept as a bare id string (eventsh's own shape) until
  // Phase 8f's scoping check decides whether this applies at all.
  operatorId: string;
};
export type PositionedScheduledSpace = ScheduledSpaceTemplate & {
  positionId: string;
  templateId: string;
  displayWidth: number;
  displayHeight: number;
  x: number;
  y: number;
  rotation: number;
  isPlaced: boolean;
  venueConfigId: string;
};

export type VenueConfig = {
  venueConfigId: string;
  width: number;
  height: number;
  scale: number;
  gridSize: number;
  showGrid: boolean;
  hasMainStage: boolean;
  mainStageLabel?: string;
  mainStageShape?: string;
  mainStageWidth?: number;
  mainStageHeight?: number;
  mainStageX?: number;
  mainStageY?: number;
  totalRows?: number;
  hasEntrance?: boolean;
  hasExit?: boolean;
  entranceShape?: string;
  exitShape?: string;
  customDoorTypes?: unknown[];
  cropped?: boolean;
  cropWidth?: number;
  cropHeight?: number;
  published?: boolean;
};

export type SpeakerSlotTemplate = {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  isMainStage: boolean;
  width: number;
  height: number;
  slotPrice: number;
  maxSpeakers: number;
  maxVisitors: number;
  description: string;
  assignedSpeakerId: string;
  assignedSpeakerName: string;
  openForApplications: boolean;
};
export type PositionedSpeakerZone = {
  positionId: string;
  templateId: string;
  name: string;
  startTime: string;
  endTime: string;
  isMainStage: boolean;
  width: number;
  height: number;
  x: number;
  y: number;
  rotation: number;
  isPlaced: boolean;
  venueConfigId: string;
  assignedSpeakerId: string;
  assignedSpeakerName: string;
};

/** Placed door — eventsh itself keeps this as a loose `any[]` (createEvent.dto.ts's
 * own comment: "small and stable enough... skip a typed sub-DTO"), and door
 * placement isn't built in SingAdvisor's own Space Layout canvas (Phase 8g/8h
 * scoped to tables/round tables/scheduled spaces/speaker zones + annotations
 * only), so it stays untyped here too rather than over-typing what nothing
 * yet produces. */
export type VenueDoor = Record<string, unknown>;

/** CAD annotation drawn on the Space Layout canvas (Phase 8h) — line / arrow
 * / rect / text / dimension shapes. Matches VenueAnnotationLayer.tsx's own
 * type (kept as a separate, structurally-identical definition rather than
 * importing a UI component's types into this data-layer file, same
 * decoupling already used for CanvasTemplate/PlacedItem vs. this module's
 * TableTemplate/RoundTableTemplate — the two are merged by id server-side,
 * not shared by type). eventsh itself stores this as a loose `any[]` on the
 * DTO; typed properly here since it's real, structured data this app now
 * produces and needs to round-trip. */
export type VenueAnnotation = {
  id: string;
  type: "line" | "arrow" | "text" | "rect" | "dimension";
  points?: number[];
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  text?: string;
  color?: string;
  fill?: string;
  strokeWidth?: number;
  fontSize?: number;
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
  chatbot: EventChatbot;
  termsAndConditionsforStalls: StallTerm[];
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
  // Phase 8 additions.
  volunteers: Volunteer[];
  seatRowTemplates: SeatRowTemplate[];
  venueSeats: PositionedSeat[];
  tableTemplates: TableTemplate[];
  venueTables: PositionedTable[];
  addOnItems: AddOnItem[];
  maxSpacesPerVendor: number;
  autoGenerateVendorCoupon: boolean;
  showSpacePricesOnEventfront: boolean;
  roundTableTemplates: RoundTableTemplate[];
  venueRoundTables: PositionedRoundTable[];
  workshopSessions: WorkshopSession[];
  workshopPackages: WorkshopPackage[];
  workshopHostingOpen: boolean;
  scheduledSpaceTemplates: ScheduledSpaceTemplate[];
  venueScheduledSpaces: PositionedScheduledSpace[];
  venueConfig: VenueConfig[];
  venueDoors: VenueDoor[];
  venueAnnotations: VenueAnnotation[];
  speakerSlotTemplates: SpeakerSlotTemplate[];
  venueSpeakerZones: PositionedSpeakerZone[];
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
