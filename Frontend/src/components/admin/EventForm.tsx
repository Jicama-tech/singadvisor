"use client";

import { useState, type ChangeEvent } from "react";
import Link from "next/link";
import { saveEvent } from "@/app/admin/actions";
import { AdminForm, FormSection, Toggle } from "@/components/admin/AdminForm";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import { CroppedImageField } from "@/components/admin/CroppedImageField";
import { VenueCanvas, type CanvasTemplate, type PlacedItem, type VenueConfigState } from "@/components/admin/VenueCanvas";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { withEventshUrl } from "@/lib/media-url";
import type { EventRow, SpeakerProfile, SponsorType, VenueAnnotation, VisitorFeatureAccess } from "@/lib/events-client";

/** `datetime-local` needs `YYYY-MM-DDTHH:mm` in local time, not an ISO string. */
function toLocalInput(iso: string | undefined): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

let rowCounter = 0;
const nextKey = () => `row-${++rowCounter}`;

const DEFAULT_FEATURE_KEYS = ["food", "parking", "wifi", "photography", "security", "accessibility"];

const BLANK_FEATURE_ACCESS: VisitorFeatureAccess = {
  food: false,
  parking: false,
  wifi: false,
  photography: false,
  security: false,
  accessibility: false,
};

type TierRow = {
  key: string;
  id: string;
  name: string;
  price: string;
  maxCount: string;
  description: string;
  featureAccess: VisitorFeatureAccess;
  isActive: boolean;
};

type SectionRow = { key: string; heading: string; content: string };
type AgeRow = { key: string; heading: string; age: string };

type SpeakerRow = {
  key: string;
  id: string;
  name: string;
  role: string;
  company: string;
  photo: string;
  photoPreview: string;
  topic: string;
  description: string;
  startTime: string;
  endTime: string;
  whatsApp: string;
  email: string;
  linkedin: string;
  instagram: string;
  youtube: string;
  facebook: string;
  twitter: string;
  website: string;
};

function speakerRowFromProfile(s: SpeakerProfile): SpeakerRow {
  return {
    key: nextKey(),
    id: s.id,
    name: s.name,
    role: s.role,
    company: s.company,
    photo: s.photo,
    photoPreview: "",
    topic: s.topic,
    description: s.description,
    startTime: s.startTime,
    endTime: s.endTime,
    whatsApp: s.whatsApp,
    email: s.email,
    linkedin: s.socialLinks.linkedin,
    instagram: s.socialLinks.instagram,
    youtube: s.socialLinks.youtube,
    facebook: s.socialLinks.facebook,
    twitter: s.socialLinks.twitter,
    website: s.socialLinks.website,
  };
}

function emptySpeakerRow(): SpeakerRow {
  return {
    key: nextKey(),
    id: "",
    name: "",
    role: "",
    company: "",
    photo: "",
    photoPreview: "",
    topic: "",
    description: "",
    startTime: "",
    endTime: "",
    whatsApp: "",
    email: "",
    linkedin: "",
    instagram: "",
    youtube: "",
    facebook: "",
    twitter: "",
    website: "",
  };
}

type SponsorRow = {
  key: string;
  id: string;
  name: string;
  price: string;
  collectPayment: boolean;
  customOptions: string;
  description: string;
};

function sponsorRowFromType(t: SponsorType): SponsorRow {
  return {
    key: nextKey(),
    id: t.id,
    name: t.name,
    price: String(t.price),
    collectPayment: t.collectPayment,
    customOptions: t.customOptions.join(", "),
    description: t.description,
  };
}

function emptySponsorRow(): SponsorRow {
  return { key: nextKey(), id: "", name: "", price: "0", collectPayment: true, customOptions: "", description: "" };
}

type VolunteerRow = { key: string; name: string; email: string; phoneNumber: string };
function emptyVolunteerRow(): VolunteerRow {
  return { key: nextKey(), name: "", email: "", phoneNumber: "" };
}

/** Terms & Conditions for Stall Exhibitors (Phase 9b) — a condition an
 * exhibitor must check off when booking a space, matching eventsh's
 * Basic Info tab exactly. */
type StallTermRow = { key: string; text: string; isMandatory: boolean };
function emptyStallTermRow(): StallTermRow {
  return { key: nextKey(), text: "", isMandatory: false };
}

/** Eventsh's "Speaker Space" — a bookable session slot (name/time/price/
 * capacity), distinct from the speaker profile cards above. Genuinely
 * useful on its own as a schedule of slots even without the Space Layout
 * canvas (Phase 8g) to place it on visually. */
type SpeakerSlotRow = {
  key: string;
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  isMainStage: boolean;
  price: string;
  maxSpeakers: string;
  maxVisitors: string;
  description: string;
};
function emptySpeakerSlotRow(): SpeakerSlotRow {
  // Non-empty id from creation (like Workshop Sessions in 8d) — Phase 8g's
  // Space Layout canvas needs to reference a template by id before it's
  // ever been saved to eventsh.
  const key = nextKey();
  return {
    key,
    id: key,
    name: "",
    startTime: "",
    endTime: "",
    isMainStage: false,
    price: "0",
    maxSpeakers: "1",
    maxVisitors: "0",
    description: "",
  };
}

type RoundTableRow = {
  key: string;
  id: string;
  name: string;
  numberOfChairs: string;
  sellingMode: "table" | "chair";
  category: string;
  color: string;
  tableDiameter: string;
  forSale: boolean;
  tablePrice: string;
  chairPrice: string;
  bookingPrice: string;
  depositPrice: string;
  memberTablePrice: string;
  memberChairPrice: string;
  memberBookingPrice: string;
  memberDepositPrice: string;
};
function emptyRoundTableRow(): RoundTableRow {
  const key = nextKey(); // non-empty id from creation — see emptySpeakerSlotRow's comment
  return {
    key,
    id: key,
    name: "",
    numberOfChairs: "10",
    sellingMode: "table",
    category: "",
    color: "#4f46e5",
    tableDiameter: "150",
    forSale: true,
    tablePrice: "0",
    chairPrice: "0",
    bookingPrice: "0",
    depositPrice: "0",
    memberTablePrice: "",
    memberChairPrice: "",
    memberBookingPrice: "",
    memberDepositPrice: "",
  };
}

type WorkshopSessionRow = {
  key: string;
  id: string;
  name: string;
  description: string;
  photo: string;
  price: string;
  facilitator: string;
  startTime: string;
  endTime: string;
  maxSeats: string;
};
function emptyWorkshopSessionRow(): WorkshopSessionRow {
  // Unlike other repeaters in this form, a brand-new session needs a
  // non-empty, stable id immediately — Workshop Packages below reference
  // sessions by id in the same submission, before either has ever been
  // saved to eventsh.
  const key = nextKey();
  return {
    key,
    id: key,
    name: "",
    description: "",
    photo: "",
    price: "0",
    facilitator: "",
    startTime: "",
    endTime: "",
    maxSeats: "20",
  };
}

type WorkshopPackageRow = {
  key: string;
  id: string;
  name: string;
  description: string;
  price: string;
  sessionIds: string[];
};
function emptyWorkshopPackageRow(): WorkshopPackageRow {
  return { key: nextKey(), id: "", name: "", description: "", price: "0", sessionIds: [] };
}

type TableTemplateRow = {
  key: string;
  id: string;
  name: string;
  width: string;
  height: string;
  rowNumber: string;
  tablePrice: string;
  bookingPrice: string;
  depositPrice: string;
  customDimensions: boolean;
};
function emptyTableTemplateRow(): TableTemplateRow {
  const key = nextKey(); // non-empty id from creation — see emptySpeakerSlotRow's comment
  return {
    key,
    id: key,
    name: "",
    width: "100",
    height: "80",
    rowNumber: "",
    tablePrice: "0",
    bookingPrice: "0",
    depositPrice: "0",
    customDimensions: false,
  };
}

type AddOnItemRow = {
  key: string;
  id: string;
  name: string;
  price: string;
  description: string;
  maxPerSpace: string;
  addOnImage: string;
};
function emptyAddOnItemRow(): AddOnItemRow {
  return { key: nextKey(), id: "", name: "", price: "0", description: "", maxPerSpace: "", addOnImage: "" };
}

type ScheduleSlotRow = { key: string; id: string; label: string; date: string; startTime: string; endTime: string };

type ScheduledSpaceRow = {
  key: string;
  id: string;
  facilityType: string;
  name: string;
  shape: "Rectangle" | "Circle";
  width: string;
  height: string;
  diameter: string;
  price: string;
  color: string;
  slots: ScheduleSlotRow[];
  // No Operator concept exists in SingAdvisor today (Phase 8f scoping
  // check, per the plan) — kept as an inert field, never exposed as a
  // pickable UI control, so the shape stays forward-compatible if
  // Operators are ever added without another data-layer change.
  operatorId: string;
};
function emptyScheduledSpaceRow(): ScheduledSpaceRow {
  const key = nextKey(); // non-empty id from creation — see emptySpeakerSlotRow's comment
  return {
    key,
    id: key,
    facilityType: "",
    name: "",
    shape: "Rectangle",
    width: "200",
    height: "100",
    diameter: "150",
    price: "0",
    color: "#0ea5e9",
    slots: [],
    operatorId: "",
  };
}

const AGE_OPTIONS = ["All Ages", "13+", "16+", "18+", "21+"];

/** Small standalone form for bulk-generating equal time slots (eventsh's
 * "Slot AI" tool) — a top-level component, not nested inside EventForm, so
 * its own local input state doesn't get wiped by every EventForm re-render. */
function SlotGenerator({
  onGenerate,
}: {
  onGenerate: (date: string, startTime: string, endTime: string, durationMins: number) => void;
}) {
  const [date, setDate] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [duration, setDuration] = useState("60");

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg bg-[var(--surface-sunken)] p-2">
      <span className="text-xs text-[var(--text-muted)]">Generate:</span>
      <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="max-w-40" />
      <Input type="time" value={start} onChange={(e) => setStart(e.target.value)} className="max-w-32" />
      <span className="text-xs text-[var(--text-muted)]">to</span>
      <Input type="time" value={end} onChange={(e) => setEnd(e.target.value)} className="max-w-32" />
      <Input
        type="number"
        min="5"
        step="5"
        value={duration}
        onChange={(e) => setDuration(e.target.value)}
        className="max-w-24"
        placeholder="mins"
      />
      <span className="text-xs text-[var(--text-muted)]">min slots</span>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={() => onGenerate(date, start, end, Number(duration) || 60)}
      >
        Generate
      </Button>
    </div>
  );
}

/**
 * Every field eventsh-v1's own admin event form exposes, grouped into the
 * SAME tab-wise layout its own form uses (Basic Info / Media / Visitors /
 * Volunteers / Venue / [Speakers] / [Sponsors] / [Round Tables] /
 * [Workshops] / [Spaces] / [Schedule] / [Space Layout]) — a real, direct
 * field-by-field/tab-by-tab match against eventsh-v1's own CreateEventForm.tsx
 * (Phase 9), not this form's own earlier ad-hoc grouping. Every input here is
 * still SingAdvisor's own `FormSection`/`Field`/`Toggle` design system, not
 * eventsh's shadcn/Radix UI — structural parity (same tabs, same fields, same
 * data), not a visual clone. Volunteers is unconditionally shown, matching
 * eventsh exactly (its own tab has no Event Sections gate either). "Seating"
 * (eventsh's cinema/concert-row module) is the one remaining real gap,
 * deliberately not built — it depends on the Space Layout canvas's "draw row"
 * bulk-seat tool, which Phase 8g's own scope explicitly left out of its MVP.
 */
export function EventForm({ event }: { event?: EventRow }) {
  const initialTiers: TierRow[] =
    event && event.visitorTypes.length > 0
      ? event.visitorTypes.map((t) => ({
          key: nextKey(),
          id: t.id,
          name: t.name,
          price: String(t.price),
          maxCount: String(t.maxCount),
          description: t.description,
          featureAccess: { ...BLANK_FEATURE_ACCESS, ...t.featureAccess },
          isActive: t.isActive,
        }))
      : [
          {
            key: nextKey(),
            id: "general",
            name: "General Admission",
            price: "0",
            maxCount: "100",
            description: "",
            featureAccess: { ...BLANK_FEATURE_ACCESS },
            isActive: true,
          },
        ];

  const initialSections: SectionRow[] = (event?.customSections ?? []).map((s) => ({
    key: nextKey(),
    heading: s.heading,
    content: s.content,
  }));

  const initialAgeRows: AgeRow[] = (event?.ageRestrictions ?? []).map((a) => ({
    key: nextKey(),
    heading: a.heading,
    age: a.age,
  }));

  const initialSpeakers: SpeakerRow[] = (event?.speakerProfiles ?? []).map(speakerRowFromProfile);
  const initialSponsors: SponsorRow[] = (event?.sponsorTypes ?? []).map(sponsorRowFromType);
  const initialVolunteers: VolunteerRow[] = (event?.volunteers ?? []).map((v) => ({
    key: nextKey(),
    name: v.name,
    email: v.email,
    phoneNumber: v.phoneNumber,
  }));
  const initialStallTerms: StallTermRow[] = (event?.termsAndConditionsforStalls ?? []).map((t) => ({
    key: nextKey(),
    text: t.text,
    isMandatory: t.isMandatory,
  }));
  const initialSpeakerSlots: SpeakerSlotRow[] = (event?.speakerSlotTemplates ?? []).map((s) => ({
    key: nextKey(),
    id: s.id,
    name: s.name,
    startTime: s.startTime,
    endTime: s.endTime,
    isMainStage: s.isMainStage,
    price: String(s.slotPrice),
    maxSpeakers: String(s.maxSpeakers),
    maxVisitors: String(s.maxVisitors),
    description: s.description,
  }));

  const initialRoundTables: RoundTableRow[] = (event?.roundTableTemplates ?? []).map((r) => ({
    key: nextKey(),
    id: r.id,
    name: r.name,
    numberOfChairs: String(r.numberOfChairs),
    sellingMode: r.sellingMode,
    category: r.category,
    color: r.color || "#4f46e5",
    tableDiameter: String(r.tableDiameter || 150),
    forSale: r.forSale,
    tablePrice: String(r.tablePrice || 0),
    chairPrice: String(r.chairPrice || 0),
    bookingPrice: String(r.bookingPrice || 0),
    depositPrice: String(r.depositPrice || 0),
    memberTablePrice: r.memberTablePrice ? String(r.memberTablePrice) : "",
    memberChairPrice: r.memberChairPrice ? String(r.memberChairPrice) : "",
    memberBookingPrice: r.memberBookingPrice ? String(r.memberBookingPrice) : "",
    memberDepositPrice: r.memberDepositPrice ? String(r.memberDepositPrice) : "",
  }));

  const initialWorkshopSessions: WorkshopSessionRow[] = (event?.workshopSessions ?? []).map((w) => ({
    key: nextKey(),
    id: w.id,
    name: w.name,
    description: w.description,
    photo: w.image,
    price: String(w.price),
    facilitator: w.facilitator,
    startTime: w.startTime,
    endTime: w.endTime,
    maxSeats: String(w.maxSeats),
  }));

  const initialWorkshopPackages: WorkshopPackageRow[] = (event?.workshopPackages ?? []).map((p) => ({
    key: nextKey(),
    id: p.id,
    name: p.name,
    description: p.description,
    price: String(p.price),
    sessionIds: p.sessionIds,
  }));

  const initialTableTemplates: TableTemplateRow[] = (event?.tableTemplates ?? []).map((t) => ({
    key: nextKey(),
    id: t.id,
    name: t.name,
    width: String(t.width),
    height: String(t.height),
    rowNumber: t.rowNumber ? String(t.rowNumber) : "",
    tablePrice: String(t.tablePrice),
    bookingPrice: String(t.bookingPrice),
    depositPrice: String(t.depositPrice),
    customDimensions: t.customDimensions,
  }));

  const initialAddOnItems: AddOnItemRow[] = (event?.addOnItems ?? []).map((a) => ({
    key: nextKey(),
    id: a.id,
    name: a.name,
    price: String(a.price),
    description: a.description,
    maxPerSpace: a.maxPerSpace ? String(a.maxPerSpace) : "",
    addOnImage: a.addOnImage,
  }));

  const initialScheduledSpaces: ScheduledSpaceRow[] = (event?.scheduledSpaceTemplates ?? []).map((s) => ({
    key: nextKey(),
    id: s.id,
    facilityType: s.facilityType,
    name: s.name,
    shape: s.shape,
    width: String(s.width || 200),
    height: String(s.height || 100),
    diameter: String(s.diameter || 150),
    price: String(s.price),
    color: s.color || "#0ea5e9",
    slots: (s.slots ?? []).map((sl) => ({ key: nextKey(), id: sl.id, label: sl.label, date: sl.date, startTime: sl.startTime, endTime: sl.endTime })),
    operatorId: s.operatorId || "",
  }));

  // Space Layout (Phase 8g). Simplified from eventsh's array-of-venue-
  // configs to a single primary config — this app has no multi-venue
  // concept for one event today.
  const firstVenueConfig = event?.venueConfig?.[0];
  const initialVenueConfig: VenueConfigState = {
    width: firstVenueConfig?.width || 800,
    height: firstVenueConfig?.height || 500,
    gridSize: firstVenueConfig?.gridSize || 50,
    showGrid: firstVenueConfig?.showGrid ?? true,
  };
  const initialPlacedItems: PlacedItem[] = [
    ...(event?.venueTables ?? []).map((t) => ({
      positionId: t.positionId,
      templateId: t.id,
      kind: "table" as const,
      name: t.tableName || t.name,
      x: t.x,
      y: t.y,
      width: t.width,
      height: t.height,
      rotation: t.rotation || 0,
      isCircle: false,
      color: "#6366f1",
    })),
    ...(event?.venueRoundTables ?? []).map((t) => ({
      positionId: t.positionId,
      templateId: t.templateId,
      kind: "roundTable" as const,
      name: t.name,
      x: t.x,
      y: t.y,
      width: t.tableDiameter || 150,
      height: t.tableDiameter || 150,
      rotation: t.rotation || 0,
      isCircle: true,
      color: t.color || "#4f46e5",
    })),
    ...(event?.venueScheduledSpaces ?? []).map((s) => ({
      positionId: s.positionId,
      templateId: s.templateId,
      kind: "scheduledSpace" as const,
      name: s.name,
      x: s.x,
      y: s.y,
      width: s.shape === "Circle" ? s.diameter || 150 : s.width || 200,
      height: s.shape === "Circle" ? s.diameter || 150 : s.height || 100,
      rotation: s.rotation || 0,
      isCircle: s.shape === "Circle",
      color: s.color || "#0ea5e9",
    })),
    ...(event?.venueSpeakerZones ?? []).map((z) => ({
      positionId: z.positionId,
      templateId: z.templateId,
      kind: "speakerZone" as const,
      name: z.name,
      x: z.x,
      y: z.y,
      width: z.width || 150,
      height: z.height || 100,
      rotation: z.rotation || 0,
      isCircle: false,
      color: "#f59e0b",
    })),
  ];

  // CAD annotations (Phase 8h) — drawn on top of the Space Layout canvas.
  // Stored flat, matching eventsh's own `venueAnnotations` shape (a single
  // array, not keyed per venue config — this app has no multi-venue concept
  // for one event, same simplification already made for venueConfig above).
  const initialAnnotations: VenueAnnotation[] = event?.venueAnnotations ?? [];

  const [tiers, setTiers] = useState<TierRow[]>(initialTiers);
  const [sections, setSections] = useState<SectionRow[]>(initialSections);
  const [ageRows, setAgeRows] = useState<AgeRow[]>(initialAgeRows);
  const [speakerRows, setSpeakerRows] = useState<SpeakerRow[]>(initialSpeakers);
  const [sponsorRows, setSponsorRows] = useState<SponsorRow[]>(initialSponsors);
  const [volunteerRows, setVolunteerRows] = useState<VolunteerRow[]>(initialVolunteers);
  const [stallTermRows, setStallTermRows] = useState<StallTermRow[]>(initialStallTerms);
  const [speakerSlotRows, setSpeakerSlotRows] = useState<SpeakerSlotRow[]>(initialSpeakerSlots);
  const [roundTableRows, setRoundTableRows] = useState<RoundTableRow[]>(initialRoundTables);
  const [workshopSessionRows, setWorkshopSessionRows] = useState<WorkshopSessionRow[]>(initialWorkshopSessions);
  const [workshopPackageRows, setWorkshopPackageRows] = useState<WorkshopPackageRow[]>(initialWorkshopPackages);
  const [tableTemplateRows, setTableTemplateRows] = useState<TableTemplateRow[]>(initialTableTemplates);
  const [addOnItemRows, setAddOnItemRows] = useState<AddOnItemRow[]>(initialAddOnItems);
  const [scheduledSpaceRows, setScheduledSpaceRows] = useState<ScheduledSpaceRow[]>(initialScheduledSpaces);
  const [venueConfig, setVenueConfig] = useState<VenueConfigState>(initialVenueConfig);
  const [placedItems, setPlacedItems] = useState<PlacedItem[]>(initialPlacedItems);
  const [annotations, setAnnotations] = useState<VenueAnnotation[]>(initialAnnotations);
  const [imagePreview, setImagePreview] = useState(event?.image ?? "");

  // Mirrors eventsh-v1's "Event Sections" toggles on its Venue tab: a
  // module's tab only appears once its switch is on. Defaults on if the
  // event already has real data for it (editing something created before
  // this toggle existed, or by another admin) so real content is never
  // hidden behind an off switch the first time you open the form.
  const [hasSpeakers, setHasSpeakers] = useState(
    Boolean(event?.features?.hasSpeakers) || (event?.speakerProfiles.length ?? 0) > 0,
  );
  const [hasSponsors, setHasSponsors] = useState(
    Boolean(event?.features?.hasSponsors) || (event?.sponsorTypes.length ?? 0) > 0,
  );
  const [hasRoundTables, setHasRoundTables] = useState(
    Boolean(event?.features?.hasRoundTables) || (event?.roundTableTemplates.length ?? 0) > 0,
  );
  const [hasWorkshops, setHasWorkshops] = useState(
    Boolean(event?.features?.hasWorkshops) || (event?.workshopSessions.length ?? 0) > 0,
  );
  const [hasSpaces, setHasSpaces] = useState(
    Boolean(event?.features?.hasSpaces) || (event?.tableTemplates.length ?? 0) > 0,
  );
  const [hasScheduledSpaces, setHasScheduledSpaces] = useState(
    Boolean(event?.features?.hasScheduledSpaces) || (event?.scheduledSpaceTemplates.length ?? 0) > 0,
  );
  const [hasSpaceLayout, setHasSpaceLayout] = useState(
    Boolean(event?.features?.hasSpaceLayout) || initialPlacedItems.length > 0,
  );

  function handleImageFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImagePreview(URL.createObjectURL(file));
  }

  function updateTier(key: string, patch: Partial<TierRow>) {
    setTiers((rows) => rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }
  function addTier() {
    setTiers((rows) => [
      ...rows,
      { key: nextKey(), id: "", name: "", price: "0", maxCount: "50", description: "", featureAccess: { ...BLANK_FEATURE_ACCESS }, isActive: true },
    ]);
  }
  function removeTier(key: string) {
    setTiers((rows) => (rows.length > 1 ? rows.filter((r) => r.key !== key) : rows));
  }

  function updateAgeRow(key: string, patch: Partial<AgeRow>) {
    setAgeRows((rows) => rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }
  function addAgeRow() {
    setAgeRows((rows) => [...rows, { key: nextKey(), heading: "", age: "All Ages" }]);
  }
  function removeAgeRow(key: string) {
    setAgeRows((rows) => rows.filter((r) => r.key !== key));
  }

  function updateSection(key: string, patch: Partial<SectionRow>) {
    setSections((rows) => rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }
  function addSection() {
    setSections((rows) => [...rows, { key: nextKey(), heading: "", content: "" }]);
  }
  function removeSection(key: string) {
    setSections((rows) => rows.filter((r) => r.key !== key));
  }

  function updateSpeaker(key: string, patch: Partial<SpeakerRow>) {
    setSpeakerRows((rows) => rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }
  function addSpeaker() {
    setSpeakerRows((rows) => [...rows, emptySpeakerRow()]);
  }
  function removeSpeaker(key: string) {
    setSpeakerRows((rows) => rows.filter((r) => r.key !== key));
  }
  function handleSpeakerPhotoChange(key: string, e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    updateSpeaker(key, { photoPreview: URL.createObjectURL(file) });
  }

  function updateSponsor(key: string, patch: Partial<SponsorRow>) {
    setSponsorRows((rows) => rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }
  function addSponsor() {
    setSponsorRows((rows) => [...rows, emptySponsorRow()]);
  }
  function removeSponsor(key: string) {
    setSponsorRows((rows) => rows.filter((r) => r.key !== key));
  }

  function updateVolunteer(key: string, patch: Partial<VolunteerRow>) {
    setVolunteerRows((rows) => rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }
  function addVolunteer() {
    setVolunteerRows((rows) => [...rows, emptyVolunteerRow()]);
  }
  function removeVolunteer(key: string) {
    setVolunteerRows((rows) => rows.filter((r) => r.key !== key));
  }

  function updateStallTerm(key: string, patch: Partial<StallTermRow>) {
    setStallTermRows((rows) => rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }
  function addStallTerm() {
    setStallTermRows((rows) => [...rows, emptyStallTermRow()]);
  }
  function removeStallTerm(key: string) {
    setStallTermRows((rows) => rows.filter((r) => r.key !== key));
  }

  function updateSpeakerSlot(key: string, patch: Partial<SpeakerSlotRow>) {
    setSpeakerSlotRows((rows) => rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }
  function addSpeakerSlot() {
    setSpeakerSlotRows((rows) => [...rows, emptySpeakerSlotRow()]);
  }
  function removeSpeakerSlot(key: string) {
    setSpeakerSlotRows((rows) => rows.filter((r) => r.key !== key));
  }

  function updateRoundTable(key: string, patch: Partial<RoundTableRow>) {
    setRoundTableRows((rows) => rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }
  function addRoundTable() {
    setRoundTableRows((rows) => [...rows, emptyRoundTableRow()]);
  }
  function removeRoundTable(key: string) {
    setRoundTableRows((rows) => rows.filter((r) => r.key !== key));
  }

  function updateWorkshopSession(key: string, patch: Partial<WorkshopSessionRow>) {
    setWorkshopSessionRows((rows) => rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }
  function addWorkshopSession() {
    setWorkshopSessionRows((rows) => [...rows, emptyWorkshopSessionRow()]);
  }
  function removeWorkshopSession(key: string) {
    setWorkshopSessionRows((rows) => rows.filter((r) => r.key !== key));
    // A package referencing this session's id just harmlessly stops matching
    // anything on next load — not scrubbed here to keep this a pure removal.
  }

  function updateWorkshopPackage(key: string, patch: Partial<WorkshopPackageRow>) {
    setWorkshopPackageRows((rows) => rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }
  function addWorkshopPackage() {
    setWorkshopPackageRows((rows) => [...rows, emptyWorkshopPackageRow()]);
  }
  function removeWorkshopPackage(key: string) {
    setWorkshopPackageRows((rows) => rows.filter((r) => r.key !== key));
  }
  function updateTableTemplate(key: string, patch: Partial<TableTemplateRow>) {
    setTableTemplateRows((rows) => rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }
  function addTableTemplate() {
    setTableTemplateRows((rows) => [...rows, emptyTableTemplateRow()]);
  }
  function removeTableTemplate(key: string) {
    setTableTemplateRows((rows) => rows.filter((r) => r.key !== key));
  }

  function updateAddOnItem(key: string, patch: Partial<AddOnItemRow>) {
    setAddOnItemRows((rows) => rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }
  function addAddOnItem() {
    setAddOnItemRows((rows) => [...rows, emptyAddOnItemRow()]);
  }
  function removeAddOnItem(key: string) {
    setAddOnItemRows((rows) => rows.filter((r) => r.key !== key));
  }

  function updateScheduledSpace(key: string, patch: Partial<ScheduledSpaceRow>) {
    setScheduledSpaceRows((rows) => rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }
  function addScheduledSpace() {
    setScheduledSpaceRows((rows) => [...rows, emptyScheduledSpaceRow()]);
  }
  function removeScheduledSpace(key: string) {
    setScheduledSpaceRows((rows) => rows.filter((r) => r.key !== key));
  }
  function addSlot(spaceKey: string) {
    setScheduledSpaceRows((rows) =>
      rows.map((r) =>
        r.key === spaceKey
          ? { ...r, slots: [...r.slots, { key: nextKey(), id: "", label: "", date: "", startTime: "", endTime: "" }] }
          : r,
      ),
    );
  }
  function updateSlot(spaceKey: string, slotKey: string, patch: Partial<ScheduleSlotRow>) {
    setScheduledSpaceRows((rows) =>
      rows.map((r) =>
        r.key === spaceKey ? { ...r, slots: r.slots.map((s) => (s.key === slotKey ? { ...s, ...patch } : s)) } : r,
      ),
    );
  }
  function removeSlot(spaceKey: string, slotKey: string) {
    setScheduledSpaceRows((rows) =>
      rows.map((r) => (r.key === spaceKey ? { ...r, slots: r.slots.filter((s) => s.key !== slotKey) } : r)),
    );
  }
  /** eventsh's own "Slot AI" tool calls out to an AI service to generate a
   * run of equal slots; this is the deterministic equivalent (no new AI
   * integration needed for the same practical outcome) — carve a date +
   * time window into N equal-length slots in one click instead of adding
   * them one at a time. */
  function generateSlots(spaceKey: string, date: string, startTime: string, endTime: string, durationMins: number) {
    if (!date || !startTime || !endTime || durationMins <= 0) return;
    const [sh, sm] = startTime.split(":").map(Number);
    const [eh, em] = endTime.split(":").map(Number);
    let cursor = sh * 60 + sm;
    const end = eh * 60 + em;
    const pad = (n: number) => String(n).padStart(2, "0");
    const toHM = (mins: number) => `${pad(Math.floor(mins / 60) % 24)}:${pad(mins % 60)}`;
    const generated: ScheduleSlotRow[] = [];
    while (cursor + durationMins <= end) {
      generated.push({
        key: nextKey(),
        id: "",
        label: "",
        date,
        startTime: toHM(cursor),
        endTime: toHM(cursor + durationMins),
      });
      cursor += durationMins;
    }
    setScheduledSpaceRows((rows) =>
      rows.map((r) => (r.key === spaceKey ? { ...r, slots: [...r.slots, ...generated] } : r)),
    );
  }

  function toggleWorkshopPackageSession(packageKey: string, sessionId: string, checked: boolean) {
    setWorkshopPackageRows((rows) =>
      rows.map((r) =>
        r.key === packageKey
          ? {
              ...r,
              sessionIds: checked ? [...r.sessionIds, sessionId] : r.sessionIds.filter((id) => id !== sessionId),
            }
          : r,
      ),
    );
  }

  const tagsLine = (event?.tags ?? []).join(", ");
  const galleryLines = (event?.gallery ?? []).join("\n");
  const reelLines = (event?.reelLinks ?? []).join("\n");
  const social = event?.socialMedia ?? {};

  return (
    <AdminForm
      action={saveEvent}
      id={event?._id}
      cancelHref="/admin/events"
      submitLabel={event ? "Save changes" : "Create event"}
      wide
    >
      {(errors, values) => {
        const submitted = Object.keys(values).length > 0;

        return (
          <div className="flex flex-col gap-6">
            {/* Repeater state is submitted via indexed hidden inputs — same
                convention PillarsSectionForm uses for its 4 fixed rows,
                extended here to a variable-length list. tierCount/
                sectionCount tell the server action how many indices to
                read back out of FormData. */}
            <input type="hidden" name="tierCount" value={tiers.length} />
            <input type="hidden" name="sectionCount" value={sections.length} />
            <input type="hidden" name="ageRowCount" value={ageRows.length} />
            <input type="hidden" name="speakerCount" value={speakerRows.length} />
            <input type="hidden" name="sponsorCount" value={sponsorRows.length} />
            <input type="hidden" name="volunteerCount" value={volunteerRows.length} />
            <input type="hidden" name="stallTermCount" value={stallTermRows.length} />
            <input type="hidden" name="speakerSlotCount" value={speakerSlotRows.length} />
            <input type="hidden" name="roundTableCount" value={roundTableRows.length} />
            <input type="hidden" name="workshopSessionCount" value={workshopSessionRows.length} />
            <input type="hidden" name="workshopPackageCount" value={workshopPackageRows.length} />
            <input type="hidden" name="tableTemplateCount" value={tableTemplateRows.length} />
            <input type="hidden" name="addOnItemCount" value={addOnItemRows.length} />
            <input type="hidden" name="scheduledSpaceCount" value={scheduledSpaceRows.length} />
            {scheduledSpaceRows.map((s, i) => (
              <input key={s.key} type="hidden" name={`scheduledSpace${i}SlotCount`} value={s.slots.length} />
            ))}
            {/* Space Layout (8g) placements are homogeneous-but-variably-shaped
                across 4 kinds — JSON is a cleaner fit here than the indexed
                per-field convention every other repeater in this form uses. */}
            <input type="hidden" name="venueConfigJson" value={JSON.stringify(venueConfig)} />
            <input type="hidden" name="placedItemsJson" value={JSON.stringify(placedItems)} />
            {/* CAD annotations (8h) drawn on the same canvas — flat array,
                same JSON-field rationale as the two placements fields above. */}
            <input type="hidden" name="venueAnnotationsJson" value={JSON.stringify(annotations)} />

            <Tabs defaultValue="basic">
              <TabsList>
                {/* Fixed tabs, in eventsh's own order (Basic Info, Media,
                    Visitors, Volunteers, Venue) — Volunteers is unconditional
                    there too, not gated by an Event Sections switch, matched
                    here for the same reason. */}
                <TabsTrigger value="basic">Basic Info</TabsTrigger>
                <TabsTrigger value="media">Media</TabsTrigger>
                <TabsTrigger value="tickets">Visitors</TabsTrigger>
                <TabsTrigger value="volunteers">Volunteers</TabsTrigger>
                <TabsTrigger value="schedule">Venue</TabsTrigger>
                {hasSpeakers && <TabsTrigger value="speakers">Speakers</TabsTrigger>}
                {hasSponsors && <TabsTrigger value="sponsors">Sponsors</TabsTrigger>}
                {hasRoundTables && <TabsTrigger value="roundtables">Round Tables</TabsTrigger>}
                {hasWorkshops && <TabsTrigger value="workshops">Workshops</TabsTrigger>}
                {hasSpaces && <TabsTrigger value="spaces">Spaces</TabsTrigger>}
                {hasScheduledSpaces && <TabsTrigger value="schedule-spaces">Schedule</TabsTrigger>}
                {hasSpaceLayout && <TabsTrigger value="space-layout">Space Layout</TabsTrigger>}
              </TabsList>

              {/* ---- Basic Info ------------------------------------------------ */}
              <TabsContent value="basic" className="mt-6">
                <div className="flex flex-col gap-6">
                  <FormSection title="Event details">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Title" htmlFor="e-title" required error={errors.title}>
                        <Input id="e-title" name="title" required defaultValue={values.title ?? event?.title} />
                      </Field>
                      <Field label="URL slug" htmlFor="e-slug" hint="Leave blank to generate from the title." error={errors.slug}>
                        <Input id="e-slug" name="slug" defaultValue={values.slug ?? event?.slug} />
                      </Field>
                    </div>

                    <Field label="Summary" htmlFor="e-summary" error={errors.summary}>
                      <Textarea id="e-summary" name="summary" rows={2} defaultValue={values.summary ?? event?.summary} />
                    </Field>

                    <Field label="Description" htmlFor="e-description" error={errors.description}>
                      <Textarea id="e-description" name="description" rows={6} defaultValue={values.description ?? event?.description} />
                    </Field>

                    <div className="grid gap-4 sm:grid-cols-3">
                      <Field label="Event type" htmlFor="e-eventType" hint="e.g. Workshop, Conference">
                        <Input id="e-eventType" name="eventType" defaultValue={values.eventType ?? event?.eventType ?? "general"} />
                      </Field>
                      <Field label="Category" htmlFor="e-category">
                        <Input id="e-category" name="category" defaultValue={values.category ?? event?.category} />
                      </Field>
                      <Field label="Visibility" htmlFor="e-visibility">
                        <Select id="e-visibility" name="visibility" defaultValue={values.visibility ?? event?.visibility ?? "public"}>
                          <option value="public">Public</option>
                          <option value="unlisted">Unlisted</option>
                          <option value="private">Private</option>
                        </Select>
                      </Field>
                    </div>

                    <Field label="Tags" htmlFor="e-tags" hint="Comma-separated.">
                      <Input id="e-tags" name="tags" defaultValue={values.tags ?? tagsLine} />
                    </Field>
                  </FormSection>

                  <FormSection title="Status &amp; visibility">
                    <Field label="Status" htmlFor="e-status">
                      <Select id="e-status" name="status" defaultValue={values.status ?? event?.status ?? "draft"} className="max-w-52">
                        <option value="draft">Draft</option>
                        <option value="published">Published</option>
                        <option value="cancelled">Cancelled</option>
                      </Select>
                    </Field>
                    <Toggle
                      name="published"
                      label="Published"
                      hint="Visible on the public site — a separate kill switch from Status above."
                      defaultChecked={submitted ? values.published === "on" : (event?.published ?? true)}
                    />
                    <Toggle
                      name="featured"
                      label="Featured"
                      hint="Highlighted on the home page."
                      defaultChecked={submitted ? values.featured === "on" : (event?.featured ?? false)}
                    />
                  </FormSection>

                  {/* Dates/venue/address + social links live here, matching
                      eventsh's own single "Event Information" card — this
                      form previously split them across "Schedule & Venue"
                      and part of "Media". */}
                  <FormSection title="When and where">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Starts" htmlFor="e-starts" required error={errors.startsAt}>
                        <Input
                          id="e-starts"
                          name="startsAt"
                          type="datetime-local"
                          required
                          defaultValue={values.startsAt ?? toLocalInput(event?.startDate)}
                        />
                      </Field>
                      <Field label="Ends" htmlFor="e-ends" required error={errors.endsAt}>
                        <Input
                          id="e-ends"
                          name="endsAt"
                          type="datetime-local"
                          required
                          defaultValue={values.endsAt ?? toLocalInput(event?.endDate)}
                        />
                      </Field>
                      <Field label="Location" htmlFor="e-location" hint="City/area, e.g. Singapore.">
                        <Input id="e-location" name="location" defaultValue={values.location ?? event?.location} />
                      </Field>
                      <Field label="Venue" htmlFor="e-venue" error={errors.venue}>
                        <Input id="e-venue" name="venue" defaultValue={values.venue ?? event?.venue} />
                      </Field>
                    </div>

                    <Field label="Full address" htmlFor="e-address" error={errors.address}>
                      <Input id="e-address" name="address" defaultValue={values.address ?? event?.address} />
                    </Field>
                  </FormSection>

                  <FormSection title="Social links">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Facebook" htmlFor="e-facebook">
                        <Input id="e-facebook" name="facebook" defaultValue={values.facebook ?? social.facebook} />
                      </Field>
                      <Field label="Instagram" htmlFor="e-instagram">
                        <Input id="e-instagram" name="instagram" defaultValue={values.instagram ?? social.instagram} />
                      </Field>
                    </div>
                    {/* Twitter/LinkedIn inputs are removed to match eventsh's
                        own Basic Info tab exactly (it only exposes Facebook
                        and Instagram) — but a value already saved on an
                        existing event is preserved via these hidden fields
                        rather than silently cleared on next save. */}
                    <input type="hidden" name="twitter" value={social.twitter ?? ""} />
                    <input type="hidden" name="linkedin" value={social.linkedin ?? ""} />
                  </FormSection>

                  {/* Matches eventsh's Basic Info "Event Settings" card —
                      age/dress code, policies and custom sections all live
                      here, not on their own tab. */}
                  <FormSection title="Event settings">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Age restriction" htmlFor="e-ageRestriction" hint="General default, e.g. 18+, All ages">
                        <Input id="e-ageRestriction" name="ageRestriction" defaultValue={values.ageRestriction ?? event?.ageRestriction} />
                      </Field>
                      <Field label="Dress code" htmlFor="e-dresscode">
                        <Input id="e-dresscode" name="dresscode" defaultValue={values.dresscode ?? event?.dresscode} />
                      </Field>
                    </div>
                    <Field label="Dress code theme" htmlFor="e-dressCodeTheme" hint="e.g. Great Gatsby, All White, Bollywood Retro">
                      <Input id="e-dressCodeTheme" name="dressCodeTheme" defaultValue={values.dressCodeTheme ?? event?.dressCodeTheme} />
                    </Field>

                    <div className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] p-4">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium text-[var(--text-primary)]">Custom age restrictions</p>
                          <p className="text-xs text-[var(--text-muted)]">
                            A different age limit per purpose — e.g. &quot;Vendors&quot;, &quot;Round Tables&quot;.
                          </p>
                        </div>
                        <Button type="button" variant="secondary" size="sm" onClick={addAgeRow}>
                          <Icon name="plus" size={14} />
                          Add
                        </Button>
                      </div>
                      {ageRows.length === 0 ? (
                        <p className="mt-3 text-xs text-[var(--text-muted)]">
                          None added. The general Age restriction above applies to everyone.
                        </p>
                      ) : (
                        <div className="mt-3 flex flex-col gap-2">
                          {ageRows.map((row, i) => (
                            <div key={row.key} className="flex items-center gap-2">
                              <input type="hidden" name={`ageRow${i}Heading`} value={row.heading} />
                              <input type="hidden" name={`ageRow${i}Age`} value={row.age} />
                              <Input
                                placeholder="Heading (e.g. Vendors)"
                                value={row.heading}
                                onChange={(e) => updateAgeRow(row.key, { heading: e.target.value })}
                                className="flex-1"
                              />
                              <Select
                                value={row.age}
                                onChange={(e) => updateAgeRow(row.key, { age: e.target.value })}
                                className="w-32 shrink-0"
                              >
                                {AGE_OPTIONS.map((opt) => (
                                  <option key={opt} value={opt}>
                                    {opt}
                                  </option>
                                ))}
                              </Select>
                              <button
                                type="button"
                                onClick={() => removeAgeRow(row.key)}
                                className="shrink-0 text-[var(--text-muted)] hover:text-red-600"
                                aria-label="Remove"
                              >
                                <Icon name="x" size={16} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <Field label="Special instructions" htmlFor="e-specialInstructions">
                      <Textarea
                        id="e-specialInstructions"
                        name="specialInstructions"
                        rows={3}
                        defaultValue={values.specialInstructions ?? event?.specialInstructions}
                      />
                    </Field>
                    <Field label="Refund policy" htmlFor="e-refundPolicy">
                      <Textarea id="e-refundPolicy" name="refundPolicy" rows={3} defaultValue={values.refundPolicy ?? event?.refundPolicy} />
                    </Field>
                    <Field label="Terms and conditions" htmlFor="e-termsAndConditions">
                      <Textarea
                        id="e-termsAndConditions"
                        name="termsAndConditions"
                        rows={4}
                        defaultValue={values.termsAndConditions ?? event?.termsAndConditions}
                      />
                    </Field>
                  </FormSection>

                  <FormSection title="Custom sections" description="Extra free-form blocks shown on the event page — FAQs, sponsor info, anything else.">
                    <div className="flex flex-col gap-4">
                      {sections.map((section, i) => (
                        <div key={section.key} className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] p-4">
                          <input type="hidden" name={`section${i}Heading`} value={section.heading} />
                          <input type="hidden" name={`section${i}Content`} value={section.content} />
                          <div className="flex flex-col gap-3">
                            <Field label="Heading" htmlFor={`section${i}-heading`}>
                              <Input
                                id={`section${i}-heading`}
                                value={section.heading}
                                onChange={(e) => updateSection(section.key, { heading: e.target.value })}
                              />
                            </Field>
                            <Field label="Content" htmlFor={`section${i}-content`}>
                              <RichTextEditor
                                value={section.content}
                                onChange={(html) => updateSection(section.key, { content: html })}
                                placeholder="Write this section's content…"
                              />
                            </Field>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeSection(section.key)}
                            className="mt-3 flex items-center gap-1 text-sm text-[var(--text-muted)] hover:text-red-600"
                          >
                            <Icon name="x" size={14} />
                            Remove section
                          </button>
                        </div>
                      ))}
                    </div>
                    <Button type="button" variant="secondary" onClick={addSection}>
                      <Icon name="plus" size={16} />
                      Add custom section
                    </Button>
                  </FormSection>

                  <FormSection
                    title="Terms &amp; Conditions for Stall Exhibitors"
                    description="Each condition appears as a checkbox exhibitors must agree to when booking a stall."
                  >
                    <div className="flex flex-col gap-3">
                      {stallTermRows.map((row, i) => (
                        <div key={row.key} className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] p-4">
                          <input type="hidden" name={`stallTerm${i}Text`} value={row.text} />
                          <Field label={`Condition ${i + 1}`} htmlFor={`stallTerm${i}-text`}>
                            <Textarea
                              id={`stallTerm${i}-text`}
                              rows={2}
                              placeholder="e.g. Goods once sold are non-refundable."
                              value={row.text}
                              onChange={(e) => updateStallTerm(row.key, { text: e.target.value })}
                            />
                          </Field>
                          <div className="mt-2 flex items-center justify-between">
                            <label className="flex cursor-pointer items-center gap-2 text-sm text-[var(--text-secondary)]">
                              <input
                                type="checkbox"
                                name={`stallTerm${i}Mandatory`}
                                checked={row.isMandatory}
                                onChange={(e) => updateStallTerm(row.key, { isMandatory: e.target.checked })}
                                className="h-4 w-4 rounded border-[var(--border-strong)] accent-[var(--accent)]"
                              />
                              Mandatory — exhibitor must accept to proceed
                            </label>
                            <button
                              type="button"
                              onClick={() => removeStallTerm(row.key)}
                              className="flex items-center gap-1 text-sm text-[var(--text-muted)] hover:text-red-600"
                            >
                              <Icon name="x" size={14} />
                              Remove
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <Button type="button" variant="secondary" onClick={addStallTerm}>
                      <Icon name="plus" size={16} />
                      Add condition
                    </Button>
                  </FormSection>

                  <FormSection
                    title="Event chatbot"
                    description="A floating AI chat on your public event page that answers visitor questions using this event's details."
                  >
                    <Toggle
                      name="chatbotEnabled"
                      label="Enable chatbot"
                      defaultChecked={submitted ? values.chatbotEnabled === "on" : (event?.chatbot?.enabled ?? false)}
                    />
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Chatbot name" htmlFor="e-chatbotName" hint="Defaults to “Event Assistant”.">
                        <Input
                          id="e-chatbotName"
                          name="chatbotName"
                          maxLength={40}
                          placeholder="Event Assistant"
                          defaultValue={values.chatbotName ?? event?.chatbot?.name}
                        />
                      </Field>
                      <Field label="Theme colour" htmlFor="e-chatbotAccentColor">
                        <Input
                          id="e-chatbotAccentColor"
                          name="chatbotAccentColor"
                          type="color"
                          className="h-11 p-1"
                          defaultValue={values.chatbotAccentColor ?? event?.chatbot?.accentColor ?? "#2563eb"}
                        />
                      </Field>
                    </div>
                  </FormSection>
                </div>
              </TabsContent>

              {/* ---- Venue (Event Sections module toggles only — dates/
                  location/address moved to Basic Info, matching eventsh's
                  own "Venue" tab exactly: it's the spatial/module config,
                  not scheduling) ------------------------------------------ */}
              <TabsContent value="schedule" className="mt-6">
                <FormSection
                  title="Event modules"
                  description="Turn on the extras this event actually uses — its tab appears once switched on. Off by default so the form doesn't show tabs with nothing in them."
                >
                  <input type="hidden" name="feature_hasSpeakers" value={hasSpeakers ? "on" : ""} />
                  <input type="hidden" name="feature_hasSponsors" value={hasSponsors ? "on" : ""} />
                  {/* Volunteers has no toggle here, and no feature_hasVolunteers
                      hidden field either — matches eventsh exactly, whose
                      Volunteers tab is always visible AND whose own schema
                      doesn't declare a hasVolunteers module flag at all. */}
                  <input type="hidden" name="feature_hasRoundTables" value={hasRoundTables ? "on" : ""} />
                  <input type="hidden" name="feature_hasWorkshops" value={hasWorkshops ? "on" : ""} />
                  <input type="hidden" name="feature_hasSpaces" value={hasSpaces ? "on" : ""} />
                  <input type="hidden" name="feature_hasScheduledSpaces" value={hasScheduledSpaces ? "on" : ""} />
                  <input type="hidden" name="feature_hasSpaceLayout" value={hasSpaceLayout ? "on" : ""} />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="flex cursor-pointer items-start gap-3 rounded-[var(--radius-card)] border border-[var(--border-subtle)] p-3 hover:border-[var(--accent)]">
                      <input
                        type="checkbox"
                        checked={hasSpeakers}
                        onChange={(e) => setHasSpeakers(e.target.checked)}
                        className="mt-0.5 h-4 w-4 shrink-0 rounded border-[var(--border-strong)] accent-[var(--accent)]"
                      />
                      <span>
                        <span className="block text-sm font-medium text-[var(--text-primary)]">Speakers</span>
                        <span className="block text-xs text-[var(--text-muted)]">
                          Full profiles — photo, bio, session time, social links.
                        </span>
                      </span>
                    </label>
                    <label className="flex cursor-pointer items-start gap-3 rounded-[var(--radius-card)] border border-[var(--border-subtle)] p-3 hover:border-[var(--accent)]">
                      <input
                        type="checkbox"
                        checked={hasSponsors}
                        onChange={(e) => setHasSponsors(e.target.checked)}
                        className="mt-0.5 h-4 w-4 shrink-0 rounded border-[var(--border-strong)] accent-[var(--accent)]"
                      />
                      <span>
                        <span className="block text-sm font-medium text-[var(--text-primary)]">Sponsors</span>
                        <span className="block text-xs text-[var(--text-muted)]">
                          Sponsorship tiers with a public &quot;Become a sponsor&quot; application form.
                        </span>
                      </span>
                    </label>
                    <label className="flex cursor-pointer items-start gap-3 rounded-[var(--radius-card)] border border-[var(--border-subtle)] p-3 hover:border-[var(--accent)]">
                      <input
                        type="checkbox"
                        checked={hasRoundTables}
                        onChange={(e) => setHasRoundTables(e.target.checked)}
                        className="mt-0.5 h-4 w-4 shrink-0 rounded border-[var(--border-strong)] accent-[var(--accent)]"
                      />
                      <span>
                        <span className="block text-sm font-medium text-[var(--text-primary)]">Round Tables</span>
                        <span className="block text-xs text-[var(--text-muted)]">
                          Gala/banquet table templates — sell by the whole table or per chair.
                        </span>
                      </span>
                    </label>
                    <label className="flex cursor-pointer items-start gap-3 rounded-[var(--radius-card)] border border-[var(--border-subtle)] p-3 hover:border-[var(--accent)]">
                      <input
                        type="checkbox"
                        checked={hasWorkshops}
                        onChange={(e) => setHasWorkshops(e.target.checked)}
                        className="mt-0.5 h-4 w-4 shrink-0 rounded border-[var(--border-strong)] accent-[var(--accent)]"
                      />
                      <span>
                        <span className="block text-sm font-medium text-[var(--text-primary)]">Workshops</span>
                        <span className="block text-xs text-[var(--text-muted)]">
                          Priced workshop sessions, plus bundle packages across sessions.
                        </span>
                      </span>
                    </label>
                    <label className="flex cursor-pointer items-start gap-3 rounded-[var(--radius-card)] border border-[var(--border-subtle)] p-3 hover:border-[var(--accent)]">
                      <input
                        type="checkbox"
                        checked={hasSpaces}
                        onChange={(e) => setHasSpaces(e.target.checked)}
                        className="mt-0.5 h-4 w-4 shrink-0 rounded border-[var(--border-strong)] accent-[var(--accent)]"
                      />
                      <span>
                        <span className="block text-sm font-medium text-[var(--text-primary)]">Spaces</span>
                        <span className="block text-xs text-[var(--text-muted)]">
                          Booth/table templates for vendors, with add-on items and pricing.
                        </span>
                      </span>
                    </label>
                    <label className="flex cursor-pointer items-start gap-3 rounded-[var(--radius-card)] border border-[var(--border-subtle)] p-3 hover:border-[var(--accent)]">
                      <input
                        type="checkbox"
                        checked={hasScheduledSpaces}
                        onChange={(e) => setHasScheduledSpaces(e.target.checked)}
                        className="mt-0.5 h-4 w-4 shrink-0 rounded border-[var(--border-strong)] accent-[var(--accent)]"
                      />
                      <span>
                        <span className="block text-sm font-medium text-[var(--text-primary)]">Scheduled Spaces</span>
                        <span className="block text-xs text-[var(--text-muted)]">
                          Time-slot-bookable facilities — courts, rooms, equipment — not sold once for the whole event.
                        </span>
                      </span>
                    </label>
                    <label className="flex cursor-pointer items-start gap-3 rounded-[var(--radius-card)] border border-[var(--border-subtle)] p-3 hover:border-[var(--accent)]">
                      <input
                        type="checkbox"
                        checked={hasSpaceLayout}
                        onChange={(e) => setHasSpaceLayout(e.target.checked)}
                        className="mt-0.5 h-4 w-4 shrink-0 rounded border-[var(--border-strong)] accent-[var(--accent)]"
                      />
                      <span>
                        <span className="block text-sm font-medium text-[var(--text-primary)]">Space Layout</span>
                        <span className="block text-xs text-[var(--text-muted)]">
                          Visually place your Spaces/Round Tables/Scheduled Spaces/Speaker slots on a venue map.
                        </span>
                      </span>
                    </label>
                  </div>
                </FormSection>
              </TabsContent>

              {/* ---- Tickets (eventsh-v1's "Visitors" tab) ---------------------- */}
              <TabsContent value="tickets" className="mt-6">
                <FormSection
                  title="Ticket tiers"
                  description="Each tier is a separately priced, separately capped ticket type — e.g. General Admission, VIP. Quantities sold against a tier are preserved automatically when you edit it here."
                >
                  {/* No currency selector — eventsh has no per-event currency
                      field either (it derives currency from the Organizer's
                      own country); price labels below still show the read-side
                      event?.currency for context, just not editable here. */}
                  <div className="flex flex-col gap-4">
                    {tiers.map((tier, i) => (
                      <div key={tier.key} className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] p-4">
                        <input type="hidden" name={`tier${i}Id`} value={tier.id} />
                        <div className="grid gap-3 sm:grid-cols-4">
                          <Field label="Name" htmlFor={`tier${i}-name`}>
                            <Input
                              id={`tier${i}-name`}
                              name={`tier${i}Name`}
                              placeholder="e.g. VIP, General"
                              value={tier.name}
                              onChange={(e) => updateTier(tier.key, { name: e.target.value })}
                            />
                          </Field>
                          <Field label={`Price (${values.currency ?? event?.currency ?? "SGD"})`} htmlFor={`tier${i}-price`}>
                            <Input
                              id={`tier${i}-price`}
                              name={`tier${i}Price`}
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="0 = Free"
                              value={tier.price}
                              onChange={(e) => updateTier(tier.key, { price: e.target.value })}
                            />
                          </Field>
                          <Field label="Quantity" htmlFor={`tier${i}-max`}>
                            <Input
                              id={`tier${i}-max`}
                              name={`tier${i}MaxCount`}
                              type="number"
                              min="0"
                              placeholder="e.g. 100"
                              value={tier.maxCount}
                              onChange={(e) => updateTier(tier.key, { maxCount: e.target.value })}
                            />
                          </Field>
                        </div>
                        <Field label="Included with this tier" htmlFor={`tier${i}-features`} className="mt-3">
                          {/* Open key set (Phase 9c), matching eventsh's own
                              Visitors tab — the 6 defaults plus whatever
                              custom features an organizer adds. Submitted as
                              one JSON field since the key set is dynamic per
                              tier, unlike every fixed-shape checkbox group
                              elsewhere in this form. */}
                          <input type="hidden" name={`tier${i}FeatureAccessJson`} value={JSON.stringify(tier.featureAccess)} />
                          <div id={`tier${i}-features`} className="flex flex-wrap gap-x-5 gap-y-2">
                            {Object.entries(tier.featureAccess).map(([key, checked]) => (
                              <label key={key} className="flex items-center gap-1.5 text-sm capitalize">
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={(e) =>
                                    updateTier(tier.key, {
                                      featureAccess: { ...tier.featureAccess, [key]: e.target.checked },
                                    })
                                  }
                                  className="h-4 w-4 rounded border-[var(--border-strong)] accent-[var(--accent)]"
                                />
                                {key}
                                {!DEFAULT_FEATURE_KEYS.includes(key) && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const next = { ...tier.featureAccess };
                                      delete next[key];
                                      updateTier(tier.key, { featureAccess: next });
                                    }}
                                    className="text-[var(--text-muted)] hover:text-red-600"
                                    aria-label={`Remove ${key}`}
                                  >
                                    <Icon name="x" size={12} />
                                  </button>
                                )}
                              </label>
                            ))}
                          </div>
                          <div className="mt-2 flex gap-2">
                            <Input
                              placeholder="Add custom feature (e.g. Lounge, Charging Station)"
                              className="max-w-72 text-xs"
                              onKeyDown={(e) => {
                                if (e.key !== "Enter") return;
                                e.preventDefault();
                                const input = e.currentTarget;
                                const val = input.value.trim().toLowerCase();
                                if (val && !(val in tier.featureAccess)) {
                                  updateTier(tier.key, { featureAccess: { ...tier.featureAccess, [val]: true } });
                                  input.value = "";
                                }
                              }}
                            />
                          </div>
                        </Field>
                        <Field label="Description" htmlFor={`tier${i}-description`} className="mt-3" hint="Optional — shown to buyers picking a tier.">
                          <Input
                            id={`tier${i}-description`}
                            name={`tier${i}Description`}
                            placeholder="Brief description of this ticket type"
                            value={tier.description}
                            onChange={(e) => updateTier(tier.key, { description: e.target.value })}
                          />
                        </Field>
                        <div className="mt-3 flex items-center justify-between">
                          <label className="flex cursor-pointer items-center gap-2 text-sm text-[var(--text-secondary)]">
                            <input
                              type="checkbox"
                              name={`tier${i}Active`}
                              checked={tier.isActive}
                              onChange={(e) => updateTier(tier.key, { isActive: e.target.checked })}
                              className="h-4 w-4 rounded border-[var(--border-strong)] accent-[var(--accent)]"
                            />
                            On sale
                          </label>
                          {tiers.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeTier(tier.key)}
                              className="flex items-center gap-1 text-sm text-[var(--text-muted)] hover:text-red-600"
                            >
                              <Icon name="x" size={14} />
                              Remove tier
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <Button type="button" variant="secondary" onClick={addTier}>
                    <Icon name="plus" size={16} />
                    Add ticket tier
                  </Button>
                </FormSection>
              </TabsContent>

              {/* ---- Media ------------------------------------------------------ */}
              <TabsContent value="media" className="mt-6">
                <div className="flex flex-col gap-6">
                  <FormSection title="Ad bar" description="A scrolling announcement strip above the event banner — promo codes, early-bird notices, last-minute updates.">
                    <Toggle
                      name="adBarVisible"
                      label="Show ad bar"
                      defaultChecked={submitted ? values.adBarVisible === "on" : (event?.adBar?.visible ?? false)}
                    />
                    <Field label="Message" htmlFor="e-adBarMessage">
                      <Input
                        id="e-adBarMessage"
                        name="adBarMessage"
                        placeholder="Early-bird tickets end Friday — use code EARLY20"
                        defaultValue={values.adBarMessage ?? event?.adBar?.message}
                      />
                    </Field>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Background colour" htmlFor="e-adBarBg">
                        <Input
                          id="e-adBarBg"
                          name="adBarBgColor"
                          type="color"
                          className="h-11 p-1"
                          defaultValue={values.adBarBgColor ?? event?.adBar?.bgColor ?? "#000000"}
                        />
                      </Field>
                      <Field label="Text colour" htmlFor="e-adBarText">
                        <Input
                          id="e-adBarText"
                          name="adBarTextColor"
                          type="color"
                          className="h-11 p-1"
                          defaultValue={values.adBarTextColor ?? event?.adBar?.textColor ?? "#ffffff"}
                        />
                      </Field>
                    </div>
                  </FormSection>

                  <FormSection title="Images &amp; links">
                    <Field label="Cover image" htmlFor="e-imageFile" hint="JPEG, PNG, WebP or GIF.">
                      <Input
                        id="e-imageFile"
                        name="imageFile"
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        onChange={handleImageFileChange}
                        className="file:mr-3 file:rounded-full file:border-0 file:bg-[var(--accent)] file:px-4 file:py-2 file:text-sm file:font-medium file:text-[var(--accent-foreground)] hover:file:bg-[var(--accent-hover)]"
                      />
                    </Field>
                    {imagePreview && (
                      // eslint-disable-next-line @next/next/no-img-element -- a blob: preview URL can't go through next/image
                      <img
                        src={imagePreview.startsWith("blob:") ? imagePreview : withEventshUrl(imagePreview)}
                        alt=""
                        className="h-40 w-full rounded-[var(--radius-card)] object-cover"
                      />
                    )}
                    <Field
                      label="Image path"
                      htmlFor="e-image"
                      hint="A path under /public, or leave as-is after uploading above."
                      error={errors.image}
                    >
                      <Input id="e-image" name="image" defaultValue={values.image ?? event?.image} />
                    </Field>
                    <Field label="Gallery" htmlFor="e-gallery" hint="One image URL per line.">
                      <Textarea id="e-gallery" name="gallery" rows={4} defaultValue={values.gallery ?? galleryLines} />
                    </Field>
                    <Field label="Reel / video links" htmlFor="e-reelLinks" hint="One link per line.">
                      <Textarea id="e-reelLinks" name="reelLinks" rows={3} defaultValue={values.reelLinks ?? reelLines} />
                    </Field>
                    {/* Social links moved to Basic Info, matching eventsh's
                        own placement (its Event Information card, not Media). */}
                  </FormSection>
                </div>
              </TabsContent>

              {/* ---- Speakers (eventsh-v1's "Speakers" tab, minus the venue-zone
                  placement — see event.entity.ts's SpeakerProfile doc comment) --- */}
              <TabsContent value="speakers" className="mt-6">
                <div className="flex flex-col gap-6">
                <FormSection
                  title="Speakers"
                  description="Full speaker profiles with photo, bio and session details — richer than the plain name list on the Programme tab, which still works as a quick fallback."
                >
                  <div className="flex flex-col gap-5">
                    {speakerRows.map((s, i) => (
                      <div key={s.key} className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] p-4">
                        <input type="hidden" name={`speaker${i}Id`} value={s.id} />
                        <div className="flex gap-4">
                          <div className="shrink-0">
                            <label
                              htmlFor={`speaker${i}-photoFile`}
                              className="grid h-16 w-16 cursor-pointer place-items-center overflow-hidden rounded-full border-2 border-dashed border-[var(--border-strong)] bg-[var(--surface-sunken)] hover:border-[var(--accent)]"
                            >
                              {s.photoPreview || s.photo ? (
                                // eslint-disable-next-line @next/next/no-img-element -- blob: preview URLs can't go through next/image
                                <img
                                  src={s.photoPreview || withEventshUrl(s.photo)}
                                  alt=""
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <Icon name="plus" size={18} className="text-[var(--text-muted)]" />
                              )}
                            </label>
                            <input
                              id={`speaker${i}-photoFile`}
                              name={`speaker${i}PhotoFile`}
                              type="file"
                              accept="image/jpeg,image/png,image/webp,image/gif"
                              onChange={(e) => handleSpeakerPhotoChange(s.key, e)}
                              className="hidden"
                            />
                            <input type="hidden" name={`speaker${i}Photo`} value={s.photo} />
                          </div>

                          <div className="grid flex-1 gap-3 sm:grid-cols-3">
                            <Field label="Speaker name" htmlFor={`speaker${i}-name`}>
                              <Input
                                id={`speaker${i}-name`}
                                name={`speaker${i}Name`}
                                placeholder="Full name of the speaker"
                                value={s.name}
                                onChange={(e) => updateSpeaker(s.key, { name: e.target.value })}
                              />
                            </Field>
                            <Field label="Role / title" htmlFor={`speaker${i}-role`}>
                              <Input
                                id={`speaker${i}-role`}
                                name={`speaker${i}Role`}
                                placeholder="e.g. CTO, Professor"
                                value={s.role}
                                onChange={(e) => updateSpeaker(s.key, { role: e.target.value })}
                              />
                            </Field>
                            <Field label="Company / organisation" htmlFor={`speaker${i}-company`}>
                              <Input
                                id={`speaker${i}-company`}
                                name={`speaker${i}Company`}
                                placeholder="e.g. Google, MIT (optional)"
                                value={s.company}
                                onChange={(e) => updateSpeaker(s.key, { company: e.target.value })}
                              />
                            </Field>
                          </div>
                        </div>

                        <div className="mt-3 grid gap-3">
                          <Field label="Topic" htmlFor={`speaker${i}-topic`}>
                            <Input
                              id={`speaker${i}-topic`}
                              name={`speaker${i}Topic`}
                              placeholder="What will they speak about?"
                              value={s.topic}
                              onChange={(e) => updateSpeaker(s.key, { topic: e.target.value })}
                            />
                          </Field>
                          <Field label="Session description" htmlFor={`speaker${i}-description`}>
                            <Textarea
                              id={`speaker${i}-description`}
                              name={`speaker${i}Description`}
                              rows={2}
                              placeholder="Detailed session description…"
                              value={s.description}
                              onChange={(e) => updateSpeaker(s.key, { description: e.target.value })}
                            />
                          </Field>
                        </div>

                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                          <Field label="Start time" htmlFor={`speaker${i}-start`}>
                            <Input
                              id={`speaker${i}-start`}
                              name={`speaker${i}StartTime`}
                              type="time"
                              value={s.startTime}
                              onChange={(e) => updateSpeaker(s.key, { startTime: e.target.value })}
                            />
                          </Field>
                          <Field label="End time" htmlFor={`speaker${i}-end`}>
                            <Input
                              id={`speaker${i}-end`}
                              name={`speaker${i}EndTime`}
                              type="time"
                              value={s.endTime}
                              onChange={(e) => updateSpeaker(s.key, { endTime: e.target.value })}
                            />
                          </Field>
                        </div>

                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                          <Field label="WhatsApp number" htmlFor={`speaker${i}-whatsapp`}>
                            <Input
                              id={`speaker${i}-whatsapp`}
                              name={`speaker${i}WhatsApp`}
                              placeholder="+65 8123 4567"
                              value={s.whatsApp}
                              onChange={(e) => updateSpeaker(s.key, { whatsApp: e.target.value })}
                            />
                          </Field>
                          <Field label="Email" htmlFor={`speaker${i}-email`}>
                            <Input
                              id={`speaker${i}-email`}
                              name={`speaker${i}Email`}
                              type="email"
                              placeholder="speaker@example.com"
                              value={s.email}
                              onChange={(e) => updateSpeaker(s.key, { email: e.target.value })}
                            />
                          </Field>
                        </div>

                        <div className="mt-3">
                          <p className="mb-1.5 text-xs font-medium text-[var(--text-secondary)]">Social links</p>
                          <div className="grid gap-2 sm:grid-cols-3">
                            <Input
                              name={`speaker${i}Linkedin`}
                              placeholder="LinkedIn URL"
                              value={s.linkedin}
                              onChange={(e) => updateSpeaker(s.key, { linkedin: e.target.value })}
                            />
                            <Input
                              name={`speaker${i}Instagram`}
                              placeholder="Instagram URL"
                              value={s.instagram}
                              onChange={(e) => updateSpeaker(s.key, { instagram: e.target.value })}
                            />
                            <Input
                              name={`speaker${i}Youtube`}
                              placeholder="YouTube URL"
                              value={s.youtube}
                              onChange={(e) => updateSpeaker(s.key, { youtube: e.target.value })}
                            />
                            <Input
                              name={`speaker${i}Facebook`}
                              placeholder="Facebook URL"
                              value={s.facebook}
                              onChange={(e) => updateSpeaker(s.key, { facebook: e.target.value })}
                            />
                            <Input
                              name={`speaker${i}Twitter`}
                              placeholder="Twitter / X URL"
                              value={s.twitter}
                              onChange={(e) => updateSpeaker(s.key, { twitter: e.target.value })}
                            />
                            <Input
                              name={`speaker${i}Website`}
                              placeholder="Website URL"
                              value={s.website}
                              onChange={(e) => updateSpeaker(s.key, { website: e.target.value })}
                            />
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => removeSpeaker(s.key)}
                          className="mt-3 flex items-center gap-1 text-sm text-[var(--text-muted)] hover:text-red-600"
                        >
                          <Icon name="x" size={14} />
                          Remove speaker
                        </button>
                      </div>
                    ))}
                  </div>

                  <Button type="button" variant="secondary" onClick={addSpeaker}>
                    <Icon name="plus" size={16} />
                    Add speaker
                  </Button>
                </FormSection>

                <FormSection
                  title="Speaker slots"
                  description="Named session slots — a schedule of when/where speakers present, separate from the profile cards above (a slot doesn't have to be assigned to a speaker yet). Visual placement on a venue map isn't built yet; this defines the slots themselves."
                >
                  <div className="flex flex-col gap-4">
                    {speakerSlotRows.map((slot, i) => (
                      <div key={slot.key} className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] p-4">
                        <input type="hidden" name={`speakerSlot${i}Id`} value={slot.id} />
                        <div className="grid gap-3 sm:grid-cols-2">
                          <Field label="Slot name" htmlFor={`speakerSlot${i}-name`}>
                            <Input
                              id={`speakerSlot${i}-name`}
                              name={`speakerSlot${i}Name`}
                              placeholder="e.g. Main Stage — Morning Keynote"
                              value={slot.name}
                              onChange={(e) => updateSpeakerSlot(slot.key, { name: e.target.value })}
                            />
                          </Field>
                          <Field label="Description" htmlFor={`speakerSlot${i}-description`}>
                            <Input
                              id={`speakerSlot${i}-description`}
                              name={`speakerSlot${i}Description`}
                              value={slot.description}
                              onChange={(e) => updateSpeakerSlot(slot.key, { description: e.target.value })}
                            />
                          </Field>
                        </div>
                        <div className="mt-3 grid gap-3 sm:grid-cols-4">
                          <Field label="Start time" htmlFor={`speakerSlot${i}-start`}>
                            <Input
                              id={`speakerSlot${i}-start`}
                              name={`speakerSlot${i}StartTime`}
                              type="time"
                              value={slot.startTime}
                              onChange={(e) => updateSpeakerSlot(slot.key, { startTime: e.target.value })}
                            />
                          </Field>
                          <Field label="End time" htmlFor={`speakerSlot${i}-end`}>
                            <Input
                              id={`speakerSlot${i}-end`}
                              name={`speakerSlot${i}EndTime`}
                              type="time"
                              value={slot.endTime}
                              onChange={(e) => updateSpeakerSlot(slot.key, { endTime: e.target.value })}
                            />
                          </Field>
                          <Field label="Max speakers" htmlFor={`speakerSlot${i}-maxSpeakers`}>
                            <Input
                              id={`speakerSlot${i}-maxSpeakers`}
                              name={`speakerSlot${i}MaxSpeakers`}
                              type="number"
                              min="1"
                              value={slot.maxSpeakers}
                              onChange={(e) => updateSpeakerSlot(slot.key, { maxSpeakers: e.target.value })}
                            />
                          </Field>
                          <Field label="Max visitors" htmlFor={`speakerSlot${i}-maxVisitors`}>
                            <Input
                              id={`speakerSlot${i}-maxVisitors`}
                              name={`speakerSlot${i}MaxVisitors`}
                              type="number"
                              min="0"
                              placeholder="0 = unlimited"
                              value={slot.maxVisitors}
                              onChange={(e) => updateSpeakerSlot(slot.key, { maxVisitors: e.target.value })}
                            />
                          </Field>
                        </div>
                        <div className="mt-3 flex items-center justify-between">
                          <label className="flex cursor-pointer items-center gap-2 text-sm text-[var(--text-secondary)]">
                            <input
                              type="checkbox"
                              name={`speakerSlot${i}IsMainStage`}
                              checked={slot.isMainStage}
                              onChange={(e) => updateSpeakerSlot(slot.key, { isMainStage: e.target.checked })}
                              className="h-4 w-4 rounded border-[var(--border-strong)] accent-[var(--accent)]"
                            />
                            Main stage
                          </label>
                          <button
                            type="button"
                            onClick={() => removeSpeakerSlot(slot.key)}
                            className="flex items-center gap-1 text-sm text-[var(--text-muted)] hover:text-red-600"
                          >
                            <Icon name="x" size={14} />
                            Remove slot
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Button type="button" variant="secondary" onClick={addSpeakerSlot}>
                    <Icon name="plus" size={16} />
                    Add speaker slot
                  </Button>
                </FormSection>
                </div>
              </TabsContent>

              {/* ---- Sponsors ------------------------------------------------------ */}
              <TabsContent value="sponsors" className="mt-6">
                <FormSection
                  title="Sponsorship tiers"
                  description="Packages businesses can apply for from the event page's 'Become a sponsor' form. Turn off Collect Payment for a non-cash tier — the sponsor picks from options you offer (a booth, a product hamper, etc.) instead of paying."
                >
                  {event?._id && (
                    <Link
                      href={`/admin/events/${event._id}/sponsors`}
                      className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-[var(--accent)] hover:underline"
                    >
                      Review sponsor applications
                      <Icon name="external" size={14} />
                    </Link>
                  )}

                  <div className="flex flex-col gap-4">
                    {sponsorRows.map((s, i) => (
                      <div key={s.key} className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] p-4">
                        <input type="hidden" name={`sponsor${i}Id`} value={s.id} />
                        <div className="grid gap-3 sm:grid-cols-2">
                          <Field label="Tier name" htmlFor={`sponsor${i}-name`}>
                            <Input
                              id={`sponsor${i}-name`}
                              name={`sponsor${i}Name`}
                              placeholder="e.g. Gold, Silver, Community Partner"
                              value={s.name}
                              onChange={(e) => updateSponsor(s.key, { name: e.target.value })}
                            />
                          </Field>
                          <Field
                            label={s.collectPayment ? `Price (${values.currency ?? event?.currency ?? "SGD"})` : "Value (what the sponsor provides instead)"}
                            htmlFor={`sponsor${i}-price`}
                          >
                            <Input
                              id={`sponsor${i}-price`}
                              name={`sponsor${i}Price`}
                              type="number"
                              min="0"
                              placeholder="0"
                              value={s.price}
                              onChange={(e) => updateSponsor(s.key, { price: e.target.value })}
                            />
                          </Field>
                        </div>

                        <label className="mt-3 flex cursor-pointer items-center justify-between gap-3 rounded-[var(--radius-card)] border border-[var(--border-subtle)] px-3 py-2">
                          <span>
                            <span className="block text-sm font-medium text-[var(--text-primary)]">Collect payment</span>
                            <span className="block text-xs text-[var(--text-muted)]">
                              Off — sponsors pick from options you offer instead of paying.
                            </span>
                          </span>
                          <input
                            type="checkbox"
                            name={`sponsor${i}CollectPayment`}
                            checked={s.collectPayment}
                            onChange={(e) => updateSponsor(s.key, { collectPayment: e.target.checked })}
                            className="h-4 w-4 shrink-0 rounded border-[var(--border-strong)] accent-[var(--accent)]"
                          />
                        </label>

                        {!s.collectPayment && (
                          <Field
                            label="Options sponsors can choose"
                            htmlFor={`sponsor${i}-options`}
                            className="mt-3"
                            hint="Comma-separated — e.g. Voucher, Product hamper, Service credit."
                          >
                            <Input
                              id={`sponsor${i}-options`}
                              name={`sponsor${i}CustomOptions`}
                              placeholder="Voucher, Coupon"
                              value={s.customOptions}
                              onChange={(e) => updateSponsor(s.key, { customOptions: e.target.value })}
                            />
                          </Field>
                        )}

                        <Field
                          label="Description"
                          htmlFor={`sponsor${i}-description`}
                          className="mt-3"
                          hint="What the sponsor gets — logo placement, stall, speaking slot, passes…"
                        >
                          <Textarea
                            id={`sponsor${i}-description`}
                            name={`sponsor${i}Description`}
                            rows={2}
                            value={s.description}
                            onChange={(e) => updateSponsor(s.key, { description: e.target.value })}
                          />
                        </Field>

                        <button
                          type="button"
                          onClick={() => removeSponsor(s.key)}
                          className="mt-3 flex items-center gap-1 text-sm text-[var(--text-muted)] hover:text-red-600"
                        >
                          <Icon name="x" size={14} />
                          Remove tier
                        </button>
                      </div>
                    ))}
                  </div>

                  <Button type="button" variant="secondary" onClick={addSponsor}>
                    <Icon name="plus" size={16} />
                    Add sponsorship tier
                  </Button>
                </FormSection>
              </TabsContent>

              {/* ---- Volunteers ---------------------------------------------------- */}
              <TabsContent value="volunteers" className="mt-6">
                <FormSection
                  title="Volunteers"
                  description="A contact list for door/scanner access at this event — name, email, phone."
                >
                  <div className="flex flex-col gap-3">
                    {volunteerRows.map((v, i) => (
                      <div key={v.key} className="grid gap-3 rounded-[var(--radius-card)] border border-[var(--border-subtle)] p-4 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end">
                        <Field label="Name" htmlFor={`volunteer${i}-name`}>
                          <Input
                            id={`volunteer${i}-name`}
                            name={`volunteer${i}Name`}
                            value={v.name}
                            onChange={(e) => updateVolunteer(v.key, { name: e.target.value })}
                          />
                        </Field>
                        <Field label="Email" htmlFor={`volunteer${i}-email`}>
                          <Input
                            id={`volunteer${i}-email`}
                            name={`volunteer${i}Email`}
                            type="email"
                            value={v.email}
                            onChange={(e) => updateVolunteer(v.key, { email: e.target.value })}
                          />
                        </Field>
                        <Field label="Phone" htmlFor={`volunteer${i}-phone`} hint="Optional">
                          <Input
                            id={`volunteer${i}-phone`}
                            name={`volunteer${i}Phone`}
                            placeholder="+65 8123 4567"
                            value={v.phoneNumber}
                            onChange={(e) => updateVolunteer(v.key, { phoneNumber: e.target.value })}
                          />
                        </Field>
                        <button
                          type="button"
                          onClick={() => removeVolunteer(v.key)}
                          aria-label="Remove volunteer"
                          className="grid h-11 w-11 shrink-0 place-items-center rounded-lg text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-sunken)] hover:text-red-600"
                        >
                          <Icon name="x" size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <Button type="button" variant="secondary" onClick={addVolunteer}>
                    <Icon name="plus" size={16} />
                    Add volunteer
                  </Button>
                </FormSection>
              </TabsContent>

              {/* ---- Round Tables ---------------------------------------------------- */}
              <TabsContent value="roundtables" className="mt-6">
                <FormSection
                  title="Round table templates"
                  description="Gala/banquet tables — sell the whole table at once, or per chair. Placing them visually on a venue map isn't built yet; this defines the templates and their pricing."
                >
                  <div className="flex flex-col gap-4">
                    {roundTableRows.map((rt, i) => (
                      <div key={rt.key} className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] p-4">
                        <input type="hidden" name={`roundTable${i}Id`} value={rt.id} />
                        <div className="grid gap-3 sm:grid-cols-4">
                          <Field label="Name" htmlFor={`rt${i}-name`}>
                            <Input
                              id={`rt${i}-name`}
                              name={`roundTable${i}Name`}
                              placeholder="e.g. Gala Table"
                              value={rt.name}
                              onChange={(e) => updateRoundTable(rt.key, { name: e.target.value })}
                            />
                          </Field>
                          <Field label="Chairs" htmlFor={`rt${i}-chairs`}>
                            <Input
                              id={`rt${i}-chairs`}
                              name={`roundTable${i}NumberOfChairs`}
                              type="number"
                              min="1"
                              value={rt.numberOfChairs}
                              onChange={(e) => updateRoundTable(rt.key, { numberOfChairs: e.target.value })}
                            />
                          </Field>
                          <Field label="Sell by" htmlFor={`rt${i}-sellingMode`}>
                            <Select
                              id={`rt${i}-sellingMode`}
                              name={`roundTable${i}SellingMode`}
                              value={rt.sellingMode}
                              onChange={(e) => updateRoundTable(rt.key, { sellingMode: e.target.value as "table" | "chair" })}
                            >
                              <option value="table">Whole table</option>
                              <option value="chair">Per chair</option>
                            </Select>
                          </Field>
                          <Field label="Category" htmlFor={`rt${i}-category`} hint="Optional, e.g. Gala">
                            <Input
                              id={`rt${i}-category`}
                              name={`roundTable${i}Category`}
                              value={rt.category}
                              onChange={(e) => updateRoundTable(rt.key, { category: e.target.value })}
                            />
                          </Field>
                        </div>

                        <div className="mt-3 grid gap-3 sm:grid-cols-4">
                          {rt.sellingMode === "table" ? (
                            <Field label={`Table price (${values.currency ?? event?.currency ?? "SGD"})`} htmlFor={`rt${i}-tablePrice`}>
                              <Input
                                id={`rt${i}-tablePrice`}
                                name={`roundTable${i}TablePrice`}
                                type="number"
                                min="0"
                                value={rt.tablePrice}
                                onChange={(e) => updateRoundTable(rt.key, { tablePrice: e.target.value })}
                              />
                            </Field>
                          ) : (
                            <Field label={`Chair price (${values.currency ?? event?.currency ?? "SGD"})`} htmlFor={`rt${i}-chairPrice`}>
                              <Input
                                id={`rt${i}-chairPrice`}
                                name={`roundTable${i}ChairPrice`}
                                type="number"
                                min="0"
                                value={rt.chairPrice}
                                onChange={(e) => updateRoundTable(rt.key, { chairPrice: e.target.value })}
                              />
                            </Field>
                          )}
                          <Field label="Booking price" htmlFor={`rt${i}-bookingPrice`} hint="Non-refundable to hold it">
                            <Input
                              id={`rt${i}-bookingPrice`}
                              name={`roundTable${i}BookingPrice`}
                              type="number"
                              min="0"
                              value={rt.bookingPrice}
                              onChange={(e) => updateRoundTable(rt.key, { bookingPrice: e.target.value })}
                            />
                          </Field>
                          <Field label="Deposit price" htmlFor={`rt${i}-depositPrice`}>
                            <Input
                              id={`rt${i}-depositPrice`}
                              name={`roundTable${i}DepositPrice`}
                              type="number"
                              min="0"
                              value={rt.depositPrice}
                              onChange={(e) => updateRoundTable(rt.key, { depositPrice: e.target.value })}
                            />
                          </Field>
                          <Field label="Table diameter (cm)" htmlFor={`rt${i}-diameter`}>
                            <Input
                              id={`rt${i}-diameter`}
                              name={`roundTable${i}TableDiameter`}
                              type="number"
                              min="0"
                              value={rt.tableDiameter}
                              onChange={(e) => updateRoundTable(rt.key, { tableDiameter: e.target.value })}
                            />
                          </Field>
                        </div>

                        <details className="mt-3">
                          <summary className="cursor-pointer text-sm font-medium text-[var(--text-secondary)]">
                            Member pricing (optional)
                          </summary>
                          <div className="mt-3 grid gap-3 sm:grid-cols-4">
                            <Field label="Member table price" htmlFor={`rt${i}-memberTablePrice`}>
                              <Input
                                id={`rt${i}-memberTablePrice`}
                                name={`roundTable${i}MemberTablePrice`}
                                type="number"
                                min="0"
                                placeholder="Same as above"
                                value={rt.memberTablePrice}
                                onChange={(e) => updateRoundTable(rt.key, { memberTablePrice: e.target.value })}
                              />
                            </Field>
                            <Field label="Member chair price" htmlFor={`rt${i}-memberChairPrice`}>
                              <Input
                                id={`rt${i}-memberChairPrice`}
                                name={`roundTable${i}MemberChairPrice`}
                                type="number"
                                min="0"
                                placeholder="Same as above"
                                value={rt.memberChairPrice}
                                onChange={(e) => updateRoundTable(rt.key, { memberChairPrice: e.target.value })}
                              />
                            </Field>
                            <Field label="Member booking price" htmlFor={`rt${i}-memberBookingPrice`}>
                              <Input
                                id={`rt${i}-memberBookingPrice`}
                                name={`roundTable${i}MemberBookingPrice`}
                                type="number"
                                min="0"
                                placeholder="Same as above"
                                value={rt.memberBookingPrice}
                                onChange={(e) => updateRoundTable(rt.key, { memberBookingPrice: e.target.value })}
                              />
                            </Field>
                            <Field label="Member deposit price" htmlFor={`rt${i}-memberDepositPrice`}>
                              <Input
                                id={`rt${i}-memberDepositPrice`}
                                name={`roundTable${i}MemberDepositPrice`}
                                type="number"
                                min="0"
                                placeholder="Same as above"
                                value={rt.memberDepositPrice}
                                onChange={(e) => updateRoundTable(rt.key, { memberDepositPrice: e.target.value })}
                              />
                            </Field>
                          </div>
                        </details>

                        <div className="mt-3 flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <label className="flex cursor-pointer items-center gap-2 text-sm text-[var(--text-secondary)]">
                              <input
                                type="checkbox"
                                name={`roundTable${i}ForSale`}
                                checked={rt.forSale}
                                onChange={(e) => updateRoundTable(rt.key, { forSale: e.target.checked })}
                                className="h-4 w-4 rounded border-[var(--border-strong)] accent-[var(--accent)]"
                              />
                              For sale
                            </label>
                            <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                              Colour
                              <input
                                type="color"
                                name={`roundTable${i}Color`}
                                value={rt.color}
                                onChange={(e) => updateRoundTable(rt.key, { color: e.target.value })}
                                className="h-8 w-8 rounded border border-[var(--border-strong)] p-0.5"
                              />
                            </label>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeRoundTable(rt.key)}
                            className="flex items-center gap-1 text-sm text-[var(--text-muted)] hover:text-red-600"
                          >
                            <Icon name="x" size={14} />
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Button type="button" variant="secondary" onClick={addRoundTable}>
                    <Icon name="plus" size={16} />
                    Add round table template
                  </Button>
                </FormSection>
              </TabsContent>

              {/* ---- Workshops ---------------------------------------------------- */}
              <TabsContent value="workshops" className="mt-6">
                <div className="flex flex-col gap-6">
                  <FormSection
                    title="Workshop sessions"
                    description="Individually priced sessions attendees can book into."
                  >
                    <Toggle
                      name="workshopHostingOpen"
                      label="Open to host applications"
                      hint="Let facilitators apply to run a session, instead of only you adding them here."
                      defaultChecked={submitted ? values.workshopHostingOpen === "on" : (event?.workshopHostingOpen ?? false)}
                    />
                    <div className="flex flex-col gap-4">
                      {workshopSessionRows.map((w, i) => (
                        <div key={w.key} className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] p-4">
                          <input type="hidden" name={`workshopSession${i}Id`} value={w.id} />
                          <input type="hidden" name={`workshopSession${i}Photo`} value={w.photo} />
                          <div className="flex gap-4">
                            <CroppedImageField
                              name={`workshopSession${i}PhotoFile`}
                              existingPath={w.photo}
                              aspect={4 / 3}
                              label="Photo"
                            />
                            <div className="grid flex-1 gap-3 sm:grid-cols-2">
                              <Field label="Name" htmlFor={`ws${i}-name`}>
                                <Input
                                  id={`ws${i}-name`}
                                  name={`workshopSession${i}Name`}
                                  value={w.name}
                                  onChange={(e) => updateWorkshopSession(w.key, { name: e.target.value })}
                                />
                              </Field>
                              <Field label="Facilitator" htmlFor={`ws${i}-facilitator`}>
                                <Input
                                  id={`ws${i}-facilitator`}
                                  name={`workshopSession${i}Facilitator`}
                                  value={w.facilitator}
                                  onChange={(e) => updateWorkshopSession(w.key, { facilitator: e.target.value })}
                                />
                              </Field>
                              <Field label="Start time" htmlFor={`ws${i}-start`}>
                                <Input
                                  id={`ws${i}-start`}
                                  name={`workshopSession${i}StartTime`}
                                  type="time"
                                  value={w.startTime}
                                  onChange={(e) => updateWorkshopSession(w.key, { startTime: e.target.value })}
                                />
                              </Field>
                              <Field label="End time" htmlFor={`ws${i}-end`}>
                                <Input
                                  id={`ws${i}-end`}
                                  name={`workshopSession${i}EndTime`}
                                  type="time"
                                  value={w.endTime}
                                  onChange={(e) => updateWorkshopSession(w.key, { endTime: e.target.value })}
                                />
                              </Field>
                              <Field label={`Price (${values.currency ?? event?.currency ?? "SGD"})`} htmlFor={`ws${i}-price`}>
                                <Input
                                  id={`ws${i}-price`}
                                  name={`workshopSession${i}Price`}
                                  type="number"
                                  min="0"
                                  value={w.price}
                                  onChange={(e) => updateWorkshopSession(w.key, { price: e.target.value })}
                                />
                              </Field>
                              <Field label="Max seats" htmlFor={`ws${i}-maxSeats`}>
                                <Input
                                  id={`ws${i}-maxSeats`}
                                  name={`workshopSession${i}MaxSeats`}
                                  type="number"
                                  min="0"
                                  value={w.maxSeats}
                                  onChange={(e) => updateWorkshopSession(w.key, { maxSeats: e.target.value })}
                                />
                              </Field>
                            </div>
                          </div>
                          <Field label="Description" htmlFor={`ws${i}-description`} className="mt-3">
                            <Textarea
                              id={`ws${i}-description`}
                              name={`workshopSession${i}Description`}
                              rows={2}
                              value={w.description}
                              onChange={(e) => updateWorkshopSession(w.key, { description: e.target.value })}
                            />
                          </Field>
                          <button
                            type="button"
                            onClick={() => removeWorkshopSession(w.key)}
                            className="mt-3 flex items-center gap-1 text-sm text-[var(--text-muted)] hover:text-red-600"
                          >
                            <Icon name="x" size={14} />
                            Remove session
                          </button>
                        </div>
                      ))}
                    </div>
                    <Button type="button" variant="secondary" onClick={addWorkshopSession}>
                      <Icon name="plus" size={16} />
                      Add session
                    </Button>
                  </FormSection>

                  <FormSection
                    title="Workshop packages"
                    description="A named bundle of sessions sold at its own price, independent of the sum of the individual session prices."
                  >
                    <div className="flex flex-col gap-4">
                      {workshopPackageRows.map((p, i) => (
                        <div key={p.key} className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] p-4">
                          <input type="hidden" name={`workshopPackage${i}Id`} value={p.id} />
                          <div className="grid gap-3 sm:grid-cols-2">
                            <Field label="Package name" htmlFor={`wp${i}-name`}>
                              <Input
                                id={`wp${i}-name`}
                                name={`workshopPackage${i}Name`}
                                value={p.name}
                                onChange={(e) => updateWorkshopPackage(p.key, { name: e.target.value })}
                              />
                            </Field>
                            <Field label={`Bundle price (${values.currency ?? event?.currency ?? "SGD"})`} htmlFor={`wp${i}-price`}>
                              <Input
                                id={`wp${i}-price`}
                                name={`workshopPackage${i}Price`}
                                type="number"
                                min="0"
                                value={p.price}
                                onChange={(e) => updateWorkshopPackage(p.key, { price: e.target.value })}
                              />
                            </Field>
                          </div>
                          <Field label="Description" htmlFor={`wp${i}-description`} className="mt-3">
                            <Input
                              id={`wp${i}-description`}
                              name={`workshopPackage${i}Description`}
                              value={p.description}
                              onChange={(e) => updateWorkshopPackage(p.key, { description: e.target.value })}
                            />
                          </Field>
                          {workshopSessionRows.length > 0 ? (
                            <div className="mt-3">
                              <p className="mb-1.5 text-xs font-medium text-[var(--text-secondary)]">Included sessions</p>
                              <div className="flex flex-wrap gap-x-5 gap-y-2">
                                {workshopSessionRows.map((w) => (
                                  <label key={w.key} className="flex items-center gap-2 text-sm">
                                    <input
                                      type="checkbox"
                                      name={`workshopPackage${i}SessionIds`}
                                      value={w.id}
                                      checked={p.sessionIds.includes(w.id)}
                                      onChange={(e) => toggleWorkshopPackageSession(p.key, w.id, e.target.checked)}
                                      className="h-4 w-4 rounded border-[var(--border-strong)] accent-[var(--accent)]"
                                    />
                                    {w.name || "(unnamed session)"}
                                  </label>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <p className="mt-3 text-xs text-[var(--text-muted)]">Add a session above first.</p>
                          )}
                          <button
                            type="button"
                            onClick={() => removeWorkshopPackage(p.key)}
                            className="mt-3 flex items-center gap-1 text-sm text-[var(--text-muted)] hover:text-red-600"
                          >
                            <Icon name="x" size={14} />
                            Remove package
                          </button>
                        </div>
                      ))}
                    </div>
                    <Button type="button" variant="secondary" onClick={addWorkshopPackage}>
                      <Icon name="plus" size={16} />
                      Add package
                    </Button>
                  </FormSection>
                </div>
              </TabsContent>

              {/* ---- Spaces (eventsh-v1's "Spaces"/table templates) ---------------- */}
              <TabsContent value="spaces" className="mt-6">
                <div className="flex flex-col gap-6">
                  <FormSection
                    title="Space templates"
                    description="Booth/table templates vendors can book — dimensions and pricing. Placing them visually on a venue map isn't built yet."
                  >
                    <div className="flex flex-col gap-4">
                      {tableTemplateRows.map((t, i) => (
                        <div key={t.key} className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] p-4">
                          <input type="hidden" name={`tableTemplate${i}Id`} value={t.id} />
                          <div className="grid gap-3 sm:grid-cols-4">
                            <Field label="Name" htmlFor={`tt${i}-name`}>
                              <Input
                                id={`tt${i}-name`}
                                name={`tableTemplate${i}Name`}
                                placeholder="e.g. Standard Booth"
                                value={t.name}
                                onChange={(e) => updateTableTemplate(t.key, { name: e.target.value })}
                              />
                            </Field>
                            <Field label="Width (cm)" htmlFor={`tt${i}-width`}>
                              <Input
                                id={`tt${i}-width`}
                                name={`tableTemplate${i}Width`}
                                type="number"
                                min="0"
                                value={t.width}
                                onChange={(e) => updateTableTemplate(t.key, { width: e.target.value })}
                              />
                            </Field>
                            <Field label="Height (cm)" htmlFor={`tt${i}-height`}>
                              <Input
                                id={`tt${i}-height`}
                                name={`tableTemplate${i}Height`}
                                type="number"
                                min="0"
                                value={t.height}
                                onChange={(e) => updateTableTemplate(t.key, { height: e.target.value })}
                              />
                            </Field>
                            <Field label="Row number" htmlFor={`tt${i}-row`} hint="Optional grouping">
                              <Input
                                id={`tt${i}-row`}
                                name={`tableTemplate${i}RowNumber`}
                                type="number"
                                min="1"
                                value={t.rowNumber}
                                onChange={(e) => updateTableTemplate(t.key, { rowNumber: e.target.value })}
                              />
                            </Field>
                          </div>
                          <div className="mt-3 grid gap-3 sm:grid-cols-3">
                            <Field label={`Table price (${values.currency ?? event?.currency ?? "SGD"})`} htmlFor={`tt${i}-tablePrice`}>
                              <Input
                                id={`tt${i}-tablePrice`}
                                name={`tableTemplate${i}TablePrice`}
                                type="number"
                                min="0"
                                value={t.tablePrice}
                                onChange={(e) => updateTableTemplate(t.key, { tablePrice: e.target.value })}
                              />
                            </Field>
                            <Field label="Booking price" htmlFor={`tt${i}-bookingPrice`} hint="Non-refundable to hold it">
                              <Input
                                id={`tt${i}-bookingPrice`}
                                name={`tableTemplate${i}BookingPrice`}
                                type="number"
                                min="0"
                                value={t.bookingPrice}
                                onChange={(e) => updateTableTemplate(t.key, { bookingPrice: e.target.value })}
                              />
                            </Field>
                            <Field label="Deposit price" htmlFor={`tt${i}-depositPrice`}>
                              <Input
                                id={`tt${i}-depositPrice`}
                                name={`tableTemplate${i}DepositPrice`}
                                type="number"
                                min="0"
                                value={t.depositPrice}
                                onChange={(e) => updateTableTemplate(t.key, { depositPrice: e.target.value })}
                              />
                            </Field>
                          </div>
                          <div className="mt-3 flex items-center justify-between">
                            <label className="flex cursor-pointer items-center gap-2 text-sm text-[var(--text-secondary)]">
                              <input
                                type="checkbox"
                                name={`tableTemplate${i}CustomDimensions`}
                                checked={t.customDimensions}
                                onChange={(e) => updateTableTemplate(t.key, { customDimensions: e.target.checked })}
                                className="h-4 w-4 rounded border-[var(--border-strong)] accent-[var(--accent)]"
                              />
                              Vendor can request custom dimensions
                            </label>
                            <button
                              type="button"
                              onClick={() => removeTableTemplate(t.key)}
                              className="flex items-center gap-1 text-sm text-[var(--text-muted)] hover:text-red-600"
                            >
                              <Icon name="x" size={14} />
                              Remove
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <Button type="button" variant="secondary" onClick={addTableTemplate}>
                      <Icon name="plus" size={16} />
                      Add space template
                    </Button>
                  </FormSection>

                  <FormSection
                    title="Add-on items"
                    description="Extras a vendor can add to their booking — power supply, extra chair, signage, etc."
                  >
                    <div className="flex flex-col gap-4">
                      {addOnItemRows.map((a, i) => (
                        <div key={a.key} className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] p-4">
                          <input type="hidden" name={`addOnItem${i}Id`} value={a.id} />
                          <input type="hidden" name={`addOnItem${i}Image`} value={a.addOnImage} />
                          <div className="flex gap-4">
                            <CroppedImageField
                              name={`addOnItem${i}ImageFile`}
                              existingPath={a.addOnImage}
                              aspect={1}
                              label="Photo"
                            />
                            <div className="grid flex-1 gap-3 sm:grid-cols-3">
                              <Field label="Name" htmlFor={`ai${i}-name`}>
                                <Input
                                  id={`ai${i}-name`}
                                  name={`addOnItem${i}Name`}
                                  placeholder="e.g. Extra Chair"
                                  value={a.name}
                                  onChange={(e) => updateAddOnItem(a.key, { name: e.target.value })}
                                />
                              </Field>
                              <Field label={`Price (${values.currency ?? event?.currency ?? "SGD"})`} htmlFor={`ai${i}-price`}>
                                <Input
                                  id={`ai${i}-price`}
                                  name={`addOnItem${i}Price`}
                                  type="number"
                                  min="0"
                                  value={a.price}
                                  onChange={(e) => updateAddOnItem(a.key, { price: e.target.value })}
                                />
                              </Field>
                              <Field label="Max per space" htmlFor={`ai${i}-maxPerSpace`} hint="Optional">
                                <Input
                                  id={`ai${i}-maxPerSpace`}
                                  name={`addOnItem${i}MaxPerSpace`}
                                  type="number"
                                  min="0"
                                  value={a.maxPerSpace}
                                  onChange={(e) => updateAddOnItem(a.key, { maxPerSpace: e.target.value })}
                                />
                              </Field>
                            </div>
                          </div>
                          <Field label="Description" htmlFor={`ai${i}-description`} className="mt-3">
                            <Input
                              id={`ai${i}-description`}
                              name={`addOnItem${i}Description`}
                              value={a.description}
                              onChange={(e) => updateAddOnItem(a.key, { description: e.target.value })}
                            />
                          </Field>
                          <button
                            type="button"
                            onClick={() => removeAddOnItem(a.key)}
                            className="mt-3 flex items-center gap-1 text-sm text-[var(--text-muted)] hover:text-red-600"
                          >
                            <Icon name="x" size={14} />
                            Remove add-on
                          </button>
                        </div>
                      ))}
                    </div>
                    <Button type="button" variant="secondary" onClick={addAddOnItem}>
                      <Icon name="plus" size={16} />
                      Add add-on item
                    </Button>
                  </FormSection>

                  <FormSection title="Vendor settings">
                    <Field label="Max spaces per vendor" htmlFor="e-maxSpacesPerVendor" className="max-w-48">
                      <Input
                        id="e-maxSpacesPerVendor"
                        name="maxSpacesPerVendor"
                        type="number"
                        min="1"
                        defaultValue={values.maxSpacesPerVendor ?? String(event?.maxSpacesPerVendor ?? 1)}
                      />
                    </Field>
                    <Toggle
                      name="autoGenerateVendorCoupon"
                      label="Auto-generate a vendor coupon"
                      hint="Each confirmed vendor automatically gets a discount coupon to share."
                      defaultChecked={submitted ? values.autoGenerateVendorCoupon === "on" : (event?.autoGenerateVendorCoupon ?? true)}
                    />
                    <Toggle
                      name="showSpacePricesOnEventfront"
                      label="Show space prices publicly"
                      hint="Off hides pricing from the public page — vendors apply and are quoted directly."
                      defaultChecked={submitted ? values.showSpacePricesOnEventfront === "on" : (event?.showSpacePricesOnEventfront ?? true)}
                    />
                  </FormSection>
                </div>
              </TabsContent>

              {/* ---- Scheduled Spaces ------------------------------------------------ */}
              <TabsContent value="schedule-spaces" className="mt-6">
                <FormSection
                  title="Scheduled spaces"
                  description="Bookable facilities that sell by the time slot, not once for the whole event — courts, rooms, equipment. Visual placement on a venue map isn't built yet."
                >
                  <div className="flex flex-col gap-4">
                    {scheduledSpaceRows.map((s, i) => (
                      <div key={s.key} className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] p-4">
                        <input type="hidden" name={`scheduledSpace${i}Id`} value={s.id} />
                        <div className="grid gap-3 sm:grid-cols-4">
                          <Field label="Name" htmlFor={`ss${i}-name`}>
                            <Input
                              id={`ss${i}-name`}
                              name={`scheduledSpace${i}Name`}
                              placeholder="e.g. Tennis Court 1"
                              value={s.name}
                              onChange={(e) => updateScheduledSpace(s.key, { name: e.target.value })}
                            />
                          </Field>
                          <Field label="Facility type" htmlFor={`ss${i}-facilityType`} hint="e.g. Court, Room">
                            <Input
                              id={`ss${i}-facilityType`}
                              name={`scheduledSpace${i}FacilityType`}
                              value={s.facilityType}
                              onChange={(e) => updateScheduledSpace(s.key, { facilityType: e.target.value })}
                            />
                          </Field>
                          <Field label="Shape" htmlFor={`ss${i}-shape`}>
                            <Select
                              id={`ss${i}-shape`}
                              name={`scheduledSpace${i}Shape`}
                              value={s.shape}
                              onChange={(e) => updateScheduledSpace(s.key, { shape: e.target.value as "Rectangle" | "Circle" })}
                            >
                              <option value="Rectangle">Rectangle</option>
                              <option value="Circle">Circle</option>
                            </Select>
                          </Field>
                          <Field label={`Price per slot (${values.currency ?? event?.currency ?? "SGD"})`} htmlFor={`ss${i}-price`}>
                            <Input
                              id={`ss${i}-price`}
                              name={`scheduledSpace${i}Price`}
                              type="number"
                              min="0"
                              value={s.price}
                              onChange={(e) => updateScheduledSpace(s.key, { price: e.target.value })}
                            />
                          </Field>
                        </div>

                        <div className="mt-3 grid gap-3 sm:grid-cols-4">
                          {s.shape === "Rectangle" ? (
                            <>
                              <Field label="Width (cm)" htmlFor={`ss${i}-width`}>
                                <Input
                                  id={`ss${i}-width`}
                                  name={`scheduledSpace${i}Width`}
                                  type="number"
                                  min="0"
                                  value={s.width}
                                  onChange={(e) => updateScheduledSpace(s.key, { width: e.target.value })}
                                />
                              </Field>
                              <Field label="Height (cm)" htmlFor={`ss${i}-height`}>
                                <Input
                                  id={`ss${i}-height`}
                                  name={`scheduledSpace${i}Height`}
                                  type="number"
                                  min="0"
                                  value={s.height}
                                  onChange={(e) => updateScheduledSpace(s.key, { height: e.target.value })}
                                />
                              </Field>
                            </>
                          ) : (
                            <Field label="Diameter (cm)" htmlFor={`ss${i}-diameter`}>
                              <Input
                                id={`ss${i}-diameter`}
                                name={`scheduledSpace${i}Diameter`}
                                type="number"
                                min="0"
                                value={s.diameter}
                                onChange={(e) => updateScheduledSpace(s.key, { diameter: e.target.value })}
                              />
                            </Field>
                          )}
                          <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                            Colour
                            <input
                              type="color"
                              name={`scheduledSpace${i}Color`}
                              value={s.color}
                              onChange={(e) => updateScheduledSpace(s.key, { color: e.target.value })}
                              className="h-8 w-8 rounded border border-[var(--border-strong)] p-0.5"
                            />
                          </label>
                        </div>

                        <div className="mt-4 rounded-[var(--radius-card)] border border-[var(--border-subtle)] p-3">
                          <p className="mb-2 text-xs font-medium text-[var(--text-secondary)]">Bookable time slots</p>
                          {s.slots.length === 0 ? (
                            <p className="mb-2 text-xs text-[var(--text-muted)]">No slots yet.</p>
                          ) : (
                            <div className="mb-3 flex flex-col gap-2">
                              {s.slots.map((slot, si) => (
                                <div key={slot.key} className="flex items-center gap-2">
                                  <input type="hidden" name={`scheduledSpace${i}Slot${si}Id`} value={slot.id} />
                                  <Input
                                    type="date"
                                    name={`scheduledSpace${i}Slot${si}Date`}
                                    value={slot.date}
                                    onChange={(e) => updateSlot(s.key, slot.key, { date: e.target.value })}
                                    className="max-w-40"
                                  />
                                  <Input
                                    type="time"
                                    name={`scheduledSpace${i}Slot${si}StartTime`}
                                    value={slot.startTime}
                                    onChange={(e) => updateSlot(s.key, slot.key, { startTime: e.target.value })}
                                    className="max-w-32"
                                  />
                                  <Input
                                    type="time"
                                    name={`scheduledSpace${i}Slot${si}EndTime`}
                                    value={slot.endTime}
                                    onChange={(e) => updateSlot(s.key, slot.key, { endTime: e.target.value })}
                                    className="max-w-32"
                                  />
                                  <Input
                                    name={`scheduledSpace${i}Slot${si}Label`}
                                    placeholder="Label (optional)"
                                    value={slot.label}
                                    onChange={(e) => updateSlot(s.key, slot.key, { label: e.target.value })}
                                    className="flex-1"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => removeSlot(s.key, slot.key)}
                                    aria-label="Remove slot"
                                    className="shrink-0 text-[var(--text-muted)] hover:text-red-600"
                                  >
                                    <Icon name="x" size={16} />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                          <div className="flex flex-wrap items-center gap-2">
                            <Button type="button" variant="secondary" size="sm" onClick={() => addSlot(s.key)}>
                              <Icon name="plus" size={14} />
                              Add slot
                            </Button>
                            <SlotGenerator onGenerate={(date, start, end, duration) => generateSlots(s.key, date, start, end, duration)} />
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => removeScheduledSpace(s.key)}
                          className="mt-3 flex items-center gap-1 text-sm text-[var(--text-muted)] hover:text-red-600"
                        >
                          <Icon name="x" size={14} />
                          Remove space
                        </button>
                      </div>
                    ))}
                  </div>
                  <Button type="button" variant="secondary" onClick={addScheduledSpace}>
                    <Icon name="plus" size={16} />
                    Add scheduled space
                  </Button>
                </FormSection>
              </TabsContent>

              {/* ---- Space Layout (eventsh-v1's VenueDesigner, scoped port — see
                  VenueCanvas.tsx's own doc comment for exactly what's in/out) ---- */}
              <TabsContent value="space-layout" className="mt-6">
                <FormSection
                  title="Space layout"
                  description="Drag templates onto the venue plan below, then move/resize/rotate them. Click a placed item to select it."
                >
                  <VenueCanvas
                    venueConfig={venueConfig}
                    onVenueConfigChange={(patch) => setVenueConfig((c) => ({ ...c, ...patch }))}
                    templates={[
                      ...tableTemplateRows
                        .filter((t) => t.name)
                        .map((t): CanvasTemplate => ({
                          templateId: t.id,
                          kind: "table",
                          name: t.name,
                          width: Number(t.width) || 100,
                          height: Number(t.height) || 80,
                          isCircle: false,
                          color: "#6366f1",
                        })),
                      ...roundTableRows
                        .filter((t) => t.name)
                        .map((t): CanvasTemplate => ({
                          templateId: t.id,
                          kind: "roundTable",
                          name: t.name,
                          width: Number(t.tableDiameter) || 150,
                          height: Number(t.tableDiameter) || 150,
                          isCircle: true,
                          color: t.color,
                        })),
                      ...scheduledSpaceRows
                        .filter((s) => s.name)
                        .map((s): CanvasTemplate => ({
                          templateId: s.id,
                          kind: "scheduledSpace",
                          name: s.name,
                          width: s.shape === "Circle" ? Number(s.diameter) || 150 : Number(s.width) || 200,
                          height: s.shape === "Circle" ? Number(s.diameter) || 150 : Number(s.height) || 100,
                          isCircle: s.shape === "Circle",
                          color: s.color,
                        })),
                      ...speakerSlotRows
                        .filter((s) => s.name)
                        .map((s): CanvasTemplate => ({
                          templateId: s.id,
                          kind: "speakerZone",
                          name: s.name,
                          width: 150,
                          height: 100,
                          isCircle: false,
                          color: "#f59e0b",
                        })),
                    ]}
                    placedItems={placedItems}
                    onChange={setPlacedItems}
                    annotations={annotations}
                    onAnnotationsChange={setAnnotations}
                  />
                </FormSection>
              </TabsContent>

              {/* Policies & extras (age/dress code, custom age restrictions,
                  special instructions, refund policy, terms & conditions,
                  custom sections, and "Amenities") deleted as its own tab —
                  the real content moved into Basic Info's "Event settings"
                  section, matching eventsh's own placement exactly. Amenities
                  itself was dropped outright: real, schema-declared fields on
                  eventsh (food/parking/wifi/photography/security/
                  accessibility), but its own CreateEventForm never exposes
                  any UI to set them either. */}
            </Tabs>
          </div>
        );
      }}
    </AdminForm>
  );
}
