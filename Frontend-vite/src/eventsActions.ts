/**
 * Events action family — the client-side port of the events half of the Next
 * app's `src/app/admin/actions.ts`. Same FormData field names, same
 * validation, same payload assembly; the create/update/delete/ticket/coupon/
 * sponsor calls go through events-admin-client (Backend /eventsh/* proxy),
 * and on success the PAGE navigates (the old server actions' redirect() has
 * no SPA equivalent).
 */
import { collectValues, type FormState } from "@/lib/form-state";
import { slugify } from "@/lib/utils";
import {
  EventsServiceError,
  createEvent as createEventBackend,
  deleteEvent as deleteEventBackend,
  fetchEventAdmin,
  updateEvent as updateEventBackend,
  uploadEventImage,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  setCouponActive,
  fetchTicketsAdmin,
  markTicketAttendanceAdmin,
  resendTicketEmailAdmin,
  setSponsorRequestStatus,
  verifySponsorPayment,
} from "@/lib/events-admin-client";
import type {
  PositionedRoundTable,
  PositionedSeat,
  PositionedScheduledSpace,
  PositionedSpeakerZone,
  PositionedTable,
  VenueAnnotation,
} from "@/lib/events-client";

const str = (fd: FormData, key: string) => {
  const v = fd.get(key);
  return typeof v === "string" ? v : "";
};
const num = (fd: FormData, key: string, fallback = 0) => {
  const n = Number(str(fd, key));
  return Number.isFinite(n) ? n : fallback;
};
const bool = (fd: FormData, key: string) => str(fd, key) === "true";

function eventsErrorState(err: unknown, formData: FormData): FormState {
  if (err instanceof EventsServiceError) {
    return {
      ok: false,
      message: err.fieldErrors?.length ? err.fieldErrors.join(" ") : err.message,
      values: collectValues(formData),
    };
  }
  if (err instanceof Error) {
    return { ok: false, message: err.message, values: collectValues(formData) };
  }
  return { ok: false, message: "Something went wrong.", values: collectValues(formData) };
}

/** An untouched `<input type="file">` still submits an entry — an empty File
 * with no name and zero size — so "was anything actually chosen" has to be
 * checked explicitly, not just truthiness of the FormData entry. */
async function uploadEventImageIfPresent(formData: FormData, fieldName: string): Promise<string | null> {
  const file = formData.get(fieldName);
  if (!(file instanceof File) || file.size === 0) return null;
  const { url } = await uploadEventImage(file);
  return url;
}

/** One indexed slot of a CroppedImageField repeater (Gallery, Sponsor logos,
 * Phase 9d) — uploads the new cropped file if one was chosen, falling back
 * to the existing path (the hidden `${prefix}${i}ExistingPath` field
 * EventForm renders alongside each CroppedImageField) so an untouched slot
 * keeps its current image on save. */
async function buildIndexedImage(formData: FormData, prefix: string, i: number): Promise<string> {
  const uploaded = await uploadEventImageIfPresent(formData, `${prefix}${i}File`);
  return uploaded ?? str(formData, `${prefix}${i}ExistingPath`);
}

/** Reads one indexed speaker row out of FormData, uploading its photo file
 * if one was chosen (falling back to whatever path was already there). */
async function buildSpeakerProfile(formData: FormData, i: number) {
  const uploadedPhoto = await uploadEventImageIfPresent(formData, `speaker${i}PhotoFile`);
  return {
    id: str(formData, `speaker${i}Id`),
    name: str(formData, `speaker${i}Name`),
    role: str(formData, `speaker${i}Role`),
    company: str(formData, `speaker${i}Company`),
    photo: uploadedPhoto ?? str(formData, `speaker${i}Photo`),
    topic: str(formData, `speaker${i}Topic`),
    description: str(formData, `speaker${i}Description`),
    startTime: str(formData, `speaker${i}StartTime`),
    endTime: str(formData, `speaker${i}EndTime`),
    whatsApp: str(formData, `speaker${i}WhatsApp`),
    email: str(formData, `speaker${i}Email`),
    socialLinks: {
      linkedin: str(formData, `speaker${i}Linkedin`),
      instagram: str(formData, `speaker${i}Instagram`),
      youtube: str(formData, `speaker${i}Youtube`),
      facebook: str(formData, `speaker${i}Facebook`),
      twitter: str(formData, `speaker${i}Twitter`),
      website: str(formData, `speaker${i}Website`),
    },
  };
}

/** Same pattern as buildSpeakerProfile above, for a Workshop Sessions row. */
async function buildWorkshopSession(formData: FormData, i: number) {
  const uploadedPhoto = await uploadEventImageIfPresent(formData, `workshopSession${i}PhotoFile`);
  return {
    id: str(formData, `workshopSession${i}Id`) || `ws-${i}`,
    name: str(formData, `workshopSession${i}Name`),
    description: str(formData, `workshopSession${i}Description`),
    image: uploadedPhoto ?? str(formData, `workshopSession${i}Photo`),
    price: num(formData, `workshopSession${i}Price`, 0),
    facilitator: str(formData, `workshopSession${i}Facilitator`),
    startTime: str(formData, `workshopSession${i}StartTime`),
    endTime: str(formData, `workshopSession${i}EndTime`),
    maxSeats: num(formData, `workshopSession${i}MaxSeats`, 0),
    order: i,
  };
}

/** Same pattern again for an Add-on Items row (Spaces tab, Phase 8e). */
async function buildAddOnItem(formData: FormData, i: number) {
  const uploadedImage = await uploadEventImageIfPresent(formData, `addOnItem${i}ImageFile`);
  return {
    id: str(formData, `addOnItem${i}Id`) || `addon-${i}`,
    name: str(formData, `addOnItem${i}Name`),
    price: num(formData, `addOnItem${i}Price`, 0),
    addOnImage: uploadedImage ?? str(formData, `addOnItem${i}Image`),
    description: str(formData, `addOnItem${i}Description`),
    maxPerSpace: str(formData, `addOnItem${i}MaxPerSpace`) ? num(formData, `addOnItem${i}MaxPerSpace`) : undefined,
  };
}

export async function saveEvent(formData: FormData): Promise<FormState> {
  const id = str(formData, "id") || null;
  const title = str(formData, "title");
  if (!title)
    return { ok: false, errors: { title: "Title is required." }, values: collectValues(formData) };

  const startsAt = new Date(str(formData, "startsAt"));
  const endsAt = new Date(str(formData, "endsAt"));
  if (Number.isNaN(startsAt.getTime()))
    return { ok: false, errors: { startsAt: "Enter a valid start date." }, values: collectValues(formData) };
  if (Number.isNaN(endsAt.getTime()))
    return { ok: false, errors: { endsAt: "Enter a valid end date." }, values: collectValues(formData) };
  if (endsAt <= startsAt)
    return { ok: false, errors: { endsAt: "The end must be after the start." }, values: collectValues(formData) };

  const tags = str(formData, "tags").split(",").map((s) => s.trim()).filter(Boolean);
  const reelLinks = str(formData, "reelLinks").split("\n").map((s) => s.trim()).filter(Boolean);
  const socialMedia = Object.fromEntries(
    (["facebook", "instagram", "twitter", "linkedin"] as const)
      .map((k) => [k, str(formData, k)])
      .filter(([, v]) => v),
  );

  // Module toggles — mirrors eventsh-v1's Venue-tab "Event Sections"
  // switches, gating which of this form's own tabs are shown.
  const features = Object.fromEntries(
    [
      "hasSpeakers",
      "hasSponsors",
      "hasRoundTables",
      "hasWorkshops",
      "hasSpaces",
      "hasScheduledSpaces",
      "hasSeating",
      "hasSpaceLayout",
    ]
      .filter((k) => bool(formData, `feature_${k}`))
      .map((k) => [k, true]),
  );

  // Existing tiers keyed by id, so an edited tier's `soldCount` survives —
  // the Backend's update wholesale-replaces `visitorTypes`, it doesn't merge.
  const existingTiersById = new Map<string, number>();
  if (id) {
    try {
      const existing = await fetchEventAdmin(id);
      for (const t of existing.visitorTypes) existingTiersById.set(t.id, t.soldCount);
    } catch (err) {
      return eventsErrorState(err, formData);
    }
  }

  const tierCount = num(formData, "tierCount", 0);
  const visitorTypes = Array.from({ length: tierCount }, (_, i) => {
    const tierId = str(formData, `tier${i}Id`);
    const typedName = str(formData, `tier${i}Name`).trim();
    return {
      // An event does not have to sell tickets — plenty are booked purely by
      // space or court slot. The form always renders at least one tier row
      // (the last one cannot be removed), so a row with neither an id nor a
      // typed name is an untouched placeholder and is dropped below rather
      // than saved. Left in, it became a phantom "General Admission" tier that
      // made the public page believe the event sells tickets and then, with
      // none sold, call it Fully booked.
      untouched: !tierId && !typedName,
      id: tierId,
      name: typedName || "General Admission",
      price: num(formData, `tier${i}Price`),
      maxCount: num(formData, `tier${i}MaxCount`, 0),
      soldCount: existingTiersById.get(tierId) ?? 0,
      description: str(formData, `tier${i}Description`),
      // Open key set (Phase 9c) — JSON since the feature-key set is dynamic
      // per tier, matching eventsh's own custom-feature Visitors tab UI.
      featureAccess: (() => {
        try {
          return JSON.parse(str(formData, `tier${i}FeatureAccessJson`) || "{}");
        } catch {
          return {};
        }
      })(),
      isActive: bool(formData, `tier${i}Active`),
    };
  });
  const filledVisitorTypes = visitorTypes
    .filter((t) => !t.untouched)
    .map(({ untouched: _untouched, ...tier }) => tier);

  const sectionCount = num(formData, "sectionCount", 0);
  const customSections = Array.from({ length: sectionCount }, (_, i) => ({
    id: `section-${i}`,
    heading: str(formData, `section${i}Heading`),
    content: str(formData, `section${i}Content`),
  })).filter((s) => s.heading || s.content);

  const sponsorCount = num(formData, "sponsorCount", 0);
  const sponsorTypes = Array.from({ length: sponsorCount }, (_, i) => ({
    id: str(formData, `sponsor${i}Id`),
    name: str(formData, `sponsor${i}Name`),
    price: num(formData, `sponsor${i}Price`),
    collectPayment: bool(formData, `sponsor${i}CollectPayment`),
    customOptions: str(formData, `sponsor${i}CustomOptions`).split(",").map((s) => s.trim()).filter(Boolean),
    description: str(formData, `sponsor${i}Description`),
  })).filter((s) => s.name);

  const ageRowCount = num(formData, "ageRowCount", 0);
  const ageRestrictions = Array.from({ length: ageRowCount }, (_, i) => ({
    heading: str(formData, `ageRow${i}Heading`),
    age: str(formData, `ageRow${i}Age`) || "All Ages",
  })).filter((a) => a.heading);

  // Terms & Conditions for Stall Exhibitors (Phase 9b).
  const stallTermCount = num(formData, "stallTermCount", 0);
  const termsAndConditionsforStalls = Array.from({ length: stallTermCount }, (_, i) => ({
    text: str(formData, `stallTerm${i}Text`),
    isMandatory: bool(formData, `stallTerm${i}Mandatory`),
  })).filter((t) => t.text);

  const volunteerCount = num(formData, "volunteerCount", 0);
  const volunteers = Array.from({ length: volunteerCount }, (_, i) => ({
    name: str(formData, `volunteer${i}Name`),
    email: str(formData, `volunteer${i}Email`),
    phoneNumber: str(formData, `volunteer${i}Phone`),
  })).filter((v) => v.name && v.email);

  const speakerSlotCount = num(formData, "speakerSlotCount", 0);
  const speakerSlotTemplates = Array.from({ length: speakerSlotCount }, (_, i) => ({
    id: str(formData, `speakerSlot${i}Id`) || `slot-${i}`,
    name: str(formData, `speakerSlot${i}Name`),
    startTime: str(formData, `speakerSlot${i}StartTime`),
    endTime: str(formData, `speakerSlot${i}EndTime`),
    isMainStage: bool(formData, `speakerSlot${i}IsMainStage`),
    slotPrice: num(formData, `speakerSlot${i}Price`, 0),
    maxSpeakers: num(formData, `speakerSlot${i}MaxSpeakers`, 1),
    maxVisitors: num(formData, `speakerSlot${i}MaxVisitors`, 0),
    description: str(formData, `speakerSlot${i}Description`),
    // Only meaningful once the Space Layout canvas (Phase 8g) exists to
    // place a slot visually / an application flow assigns a speaker to it.
    width: 0,
    height: 0,
    assignedSpeakerId: "",
    assignedSpeakerName: "",
    openForApplications: false,
  })).filter((s) => s.name);

  const roundTableCount = num(formData, "roundTableCount", 0);
  const roundTableTemplates = Array.from({ length: roundTableCount }, (_, i) => ({
    id: str(formData, `roundTable${i}Id`) || `rt-${i}`,
    name: str(formData, `roundTable${i}Name`),
    numberOfChairs: num(formData, `roundTable${i}NumberOfChairs`, 10),
    sellingMode: (str(formData, `roundTable${i}SellingMode`) || "table") as "table" | "chair",
    category: str(formData, `roundTable${i}Category`),
    color: str(formData, `roundTable${i}Color`) || "#4f46e5",
    tableDiameter: num(formData, `roundTable${i}TableDiameter`, 150),
    forSale: bool(formData, `roundTable${i}ForSale`),
    tablePrice: num(formData, `roundTable${i}TablePrice`, 0),
    chairPrice: num(formData, `roundTable${i}ChairPrice`, 0),
    bookingPrice: num(formData, `roundTable${i}BookingPrice`, 0),
    depositPrice: num(formData, `roundTable${i}DepositPrice`, 0),
    memberTablePrice: str(formData, `roundTable${i}MemberTablePrice`) ? num(formData, `roundTable${i}MemberTablePrice`) : undefined,
    memberChairPrice: str(formData, `roundTable${i}MemberChairPrice`) ? num(formData, `roundTable${i}MemberChairPrice`) : undefined,
    memberBookingPrice: str(formData, `roundTable${i}MemberBookingPrice`) ? num(formData, `roundTable${i}MemberBookingPrice`) : undefined,
    memberDepositPrice: str(formData, `roundTable${i}MemberDepositPrice`) ? num(formData, `roundTable${i}MemberDepositPrice`) : undefined,
    x: 0,
    y: 0,
    rotation: 0,
    isPlaced: false,
    venueConfigId: "",
    bookedChairs: [] as number[],
    isFullyBooked: false,
  })).filter((rt) => rt.name);

  const workshopPackageCount = num(formData, "workshopPackageCount", 0);
  const workshopPackages = Array.from({ length: workshopPackageCount }, (_, i) => ({
    id: str(formData, `workshopPackage${i}Id`) || `wp-${i}`,
    name: str(formData, `workshopPackage${i}Name`),
    description: str(formData, `workshopPackage${i}Description`),
    price: num(formData, `workshopPackage${i}Price`, 0),
    sessionIds: formData.getAll(`workshopPackage${i}SessionIds`).map(String),
    order: i,
  })).filter((wp) => wp.name);

  const tableTemplateCount = num(formData, "tableTemplateCount", 0);
  const tableTemplates = Array.from({ length: tableTemplateCount }, (_, i) => ({
    id: str(formData, `tableTemplate${i}Id`) || `tbl-${i}`,
    name: str(formData, `tableTemplate${i}Name`),
    type: "Straight" as const,
    width: num(formData, `tableTemplate${i}Width`, 100),
    height: num(formData, `tableTemplate${i}Height`, 80),
    rowNumber: str(formData, `tableTemplate${i}RowNumber`) ? num(formData, `tableTemplate${i}RowNumber`) : undefined,
    tablePrice: num(formData, `tableTemplate${i}TablePrice`, 0),
    bookingPrice: num(formData, `tableTemplate${i}BookingPrice`, 0),
    depositPrice: num(formData, `tableTemplate${i}DepositPrice`, 0),
    isBooked: false,
    bookedBy: "",
    customDimensions: bool(formData, `tableTemplate${i}CustomDimensions`),
  })).filter((t) => t.name);

  const scheduledSpaceCount = num(formData, "scheduledSpaceCount", 0);
  const scheduledSpaceTemplates = Array.from({ length: scheduledSpaceCount }, (_, i) => {
    const shape = (str(formData, `scheduledSpace${i}Shape`) || "Rectangle") as "Rectangle" | "Circle";
    const slotCount = num(formData, `scheduledSpace${i}SlotCount`, 0);
    const slots = Array.from({ length: slotCount }, (_, si) => ({
      id: str(formData, `scheduledSpace${i}Slot${si}Id`) || `slot-${i}-${si}`,
      label: str(formData, `scheduledSpace${i}Slot${si}Label`),
      date: str(formData, `scheduledSpace${i}Slot${si}Date`),
      startTime: str(formData, `scheduledSpace${i}Slot${si}StartTime`),
      endTime: str(formData, `scheduledSpace${i}Slot${si}EndTime`),
    })).filter((sl) => sl.date && sl.startTime && sl.endTime);
    return {
      id: str(formData, `scheduledSpace${i}Id`) || `ss-${i}`,
      facilityType: str(formData, `scheduledSpace${i}FacilityType`),
      name: str(formData, `scheduledSpace${i}Name`),
      shape,
      width: shape === "Rectangle" ? num(formData, `scheduledSpace${i}Width`, 200) : 0,
      height: shape === "Rectangle" ? num(formData, `scheduledSpace${i}Height`, 100) : 0,
      diameter: shape === "Circle" ? num(formData, `scheduledSpace${i}Diameter`, 150) : 0,
      price: num(formData, `scheduledSpace${i}Price`, 0),
      color: str(formData, `scheduledSpace${i}Color`) || "#0ea5e9",
      slots,
      // No Operator concept in SingAdvisor today — always unassigned.
      operatorId: "",
      x: 0,
      y: 0,
      rotation: 0,
      isPlaced: false,
      venueConfigId: "",
    };
  }).filter((s) => s.name);

  const seatRowTemplateCount = num(formData, "seatRowTemplateCount", 0);
  const seatRowTemplates = Array.from({ length: seatRowTemplateCount }, (_, i) => ({
    id: str(formData, `seatRowTemplate${i}Id`) || `seat-row-${i + 1}`,
    name: str(formData, `seatRowTemplate${i}Name`),
    price: num(formData, `seatRowTemplate${i}Price`, 0),
    color: str(formData, `seatRowTemplate${i}Color`) || "#8b5cf6",
  })).filter((r) => r.name);

  let image: string;
  let gallery: string[];
  let sponsors: string[];
  let speakerProfiles: Awaited<ReturnType<typeof buildSpeakerProfile>>[];
  let workshopSessions: Awaited<ReturnType<typeof buildWorkshopSession>>[];
  let addOnItems: Awaited<ReturnType<typeof buildAddOnItem>>[];
  try {
    image = (await uploadEventImageIfPresent(formData, "imageFile")) ?? str(formData, "image");

    const galleryCount = num(formData, "galleryCount", 0);
    gallery = (
      await Promise.all(Array.from({ length: galleryCount }, (_, i) => buildIndexedImage(formData, "gallery", i)))
    ).filter(Boolean);

    const sponsorLogoCount = num(formData, "sponsorLogoCount", 0);
    sponsors = (
      await Promise.all(Array.from({ length: sponsorLogoCount }, (_, i) => buildIndexedImage(formData, "sponsorLogo", i)))
    ).filter(Boolean);

    const speakerCount = num(formData, "speakerCount", 0);
    speakerProfiles = (
      await Promise.all(Array.from({ length: speakerCount }, (_, i) => buildSpeakerProfile(formData, i)))
    ).filter((s) => s.name && s.topic); // DTO requires both — drop rows added but never filled in

    const workshopSessionCount = num(formData, "workshopSessionCount", 0);
    workshopSessions = (
      await Promise.all(Array.from({ length: workshopSessionCount }, (_, i) => buildWorkshopSession(formData, i)))
    ).filter((w) => w.name);

    const addOnItemCount = num(formData, "addOnItemCount", 0);
    addOnItems = (
      await Promise.all(Array.from({ length: addOnItemCount }, (_, i) => buildAddOnItem(formData, i)))
    ).filter((a) => a.name);
  } catch (err) {
    return eventsErrorState(err, formData);
  }

  // Space Layout (Phase 8g) — parse the JSON placements EventForm sent and
  // merge each placement with its full template (the canvas itself only ever
  // tracked position/size/rotation) to build the shapes eventsh's
  // venueTables/venueRoundTables/venueScheduledSpaces/venueSpeakerZones
  // actually expect.
  const VENUE_CONFIG_ID = "venueConfig1";
  // Open shape: fields this form does not manage ride along from the stored
  // config (see the merge below), so the type cannot be a closed literal.
  let venueConfig: Array<
    Record<string, unknown> & {
      venueConfigId: string;
      width: number;
      height: number;
      scale: number;
      gridSize: number;
      showGrid: boolean;
      hasMainStage: boolean;
    }
  > = [];
  const venueTables: PositionedTable[] = [];
  const venueRoundTables: PositionedRoundTable[] = [];
  const venueScheduledSpaces: PositionedScheduledSpace[] = [];
  const venueSpeakerZones: PositionedSpeakerZone[] = [];
  try {
    const rawConfig = JSON.parse(str(formData, "venueConfigJson") || "{}");
    // Merge onto what is already stored rather than rebuilding the object.
    // The Space Layout tab edits four fields; the venue config carries around
    // twenty, and the rest are set in eventsh's own venue designer — the crop
    // box (cropped/cropWidth/cropHeight), the main stage and its position,
    // doors, entrances and exits. Rebuilding from scratch silently deleted
    // every one of them on save, so a crop made in eventsh reverted the moment
    // the event was saved here. `hasMainStage` was the clearest case: it was
    // hardcoded false, so saving always removed the main stage.
    const baseConfig = JSON.parse(str(formData, "venueConfigBaseJson") || "{}") as Record<
      string,
      unknown
    >;
    venueConfig = [
      {
        ...baseConfig,
        venueConfigId: VENUE_CONFIG_ID,
        width: Number(rawConfig.width) || 800,
        height: Number(rawConfig.height) || 500,
        scale: 1,
        gridSize: Number(rawConfig.gridSize) || 50,
        showGrid: Boolean(rawConfig.showGrid),
        hasMainStage: Boolean(baseConfig.hasMainStage),
        // Crop is edited in the Space Layout tab now, so the form's values win
        // over whatever was stored — unlike the fields above it, which ride
        // along untouched from `baseConfig`.
        cropped: Boolean(rawConfig.cropped),
        cropWidth: Number(rawConfig.cropWidth) || 0,
        cropHeight: Number(rawConfig.cropHeight) || 0,
      },
    ];

    const placedItems: {
      positionId: string;
      templateId: string;
      kind: "table" | "roundTable" | "scheduledSpace" | "speakerZone";
      name: string;
      x: number;
      y: number;
      width: number;
      height: number;
      rotation: number;
      /** Serialised by the canvas along with the rest — a round space stores
       * its size as a diameter, a rectangular one as width/height. */
      isCircle: boolean;
    }[] = JSON.parse(str(formData, "placedItemsJson") || "[]");

    for (const item of placedItems) {
      const common = { positionId: item.positionId, x: item.x, y: item.y, rotation: item.rotation, isPlaced: true, venueConfigId: VENUE_CONFIG_ID };
      if (item.kind === "table") {
        const t = tableTemplates.find((x) => x.id === item.templateId);
        if (t) venueTables.push({ ...t, ...common, tableName: item.name, width: item.width, height: item.height });
      } else if (item.kind === "roundTable") {
        const t = roundTableTemplates.find((x) => x.id === item.templateId);
        // `tableDiameter` has to come from the PLACED item, not the template.
        // Spreading the template alone meant resizing one round table on the
        // canvas was thrown away on save and it snapped back to the template's
        // diameter on reload.
        if (t)
          venueRoundTables.push({
            ...t,
            ...common,
            templateId: t.id,
            tableDiameter: Math.round(item.width),
            bookedChairs: [],
            isFullyBooked: false,
          });
      } else if (item.kind === "scheduledSpace") {
        const t = scheduledSpaceTemplates.find((x) => x.id === item.templateId);
        // Same problem, one level subtler: the resize was only ever written to
        // displayWidth/displayHeight, but everything that READS a placed space
        // — the form rebuilding the canvas, the public venue map — reads
        // width/height (or diameter when it is round). So the space rendered
        // at its template size again the moment the page reloaded. Write the
        // real dimensions too; displayWidth/Height stay for eventsh's sake.
        if (t)
          venueScheduledSpaces.push({
            ...t,
            ...common,
            templateId: t.id,
            ...(item.isCircle
              ? { diameter: Math.round(item.width) }
              : { width: Math.round(item.width), height: Math.round(item.height) }),
            displayWidth: item.width,
            displayHeight: item.height,
          });
      } else if (item.kind === "speakerZone") {
        const t = speakerSlotTemplates.find((x) => x.id === item.templateId);
        if (t) {
          venueSpeakerZones.push({
            ...common,
            templateId: t.id,
            name: t.name,
            startTime: t.startTime,
            endTime: t.endTime,
            isMainStage: t.isMainStage,
            width: item.width,
            height: item.height,
            assignedSpeakerId: t.assignedSpeakerId,
            assignedSpeakerName: t.assignedSpeakerName,
          });
        }
      }
    }
  } catch {
    // Malformed/missing JSON (e.g. Space Layout tab never opened) — no
    // placements is a perfectly valid event, not an error.
  }

  // CAD annotations (Phase 8h) drawn on the same canvas — stored flat,
  // parsed separately from the placements block above so a malformed
  // annotations field never drops otherwise-valid placements (or vice
  // versa).
  let venueAnnotations: VenueAnnotation[] = [];
  try {
    venueAnnotations = JSON.parse(str(formData, "venueAnnotationsJson") || "[]");
  } catch {
    // No annotations is a perfectly valid event, not an error.
  }

  // Seating placements arrive in the wire PositionedSeat shape already
  // (EventForm's venueSeatsJson) — parsed separately so a malformed seats
  // field never drops otherwise-valid placements.
  let venueSeats: PositionedSeat[] = [];
  try {
    venueSeats = JSON.parse(str(formData, "venueSeatsJson") || "[]");
  } catch {
    // No seats is a perfectly valid event, not an error.
  }

  const input = {
    // Auto-generate from the title when left blank — matches the field's
    // own hint text and the same pattern trainings/careers/etc. use; the
    // old Next action had a live bug here (blank slug → slugless event →
    // broken public page) and this is the fix carried over.
    slug: slugify(str(formData, "slug") || title) || undefined,
    title,
    summary: str(formData, "summary"),
    description: str(formData, "description"),
    eventType: str(formData, "eventType"),
    category: str(formData, "category"),
    location: str(formData, "location"),
    venue: str(formData, "venue"),
    address: str(formData, "address"),
    startDate: startsAt.toISOString(),
    endDate: endsAt.toISOString(),
    visibility: (str(formData, "visibility") || "public") as "public" | "private" | "unlisted",
    tags,
    features,
    ageRestriction: str(formData, "ageRestriction"),
    ageRestrictions,
    dresscode: str(formData, "dresscode"),
    dressCodeTheme: str(formData, "dressCodeTheme"),
    adBar: {
      visible: bool(formData, "adBarVisible"),
      message: str(formData, "adBarMessage"),
      bgColor: str(formData, "adBarBgColor") || "#000000",
      textColor: str(formData, "adBarTextColor") || "#ffffff",
    },
    chatbot: {
      enabled: bool(formData, "chatbotEnabled"),
      name: str(formData, "chatbotName"),
      accentColor: str(formData, "chatbotAccentColor") || "#2563eb",
    },
    termsAndConditionsforStalls,
    specialInstructions: str(formData, "specialInstructions"),
    refundPolicy: str(formData, "refundPolicy"),
    termsAndConditions: str(formData, "termsAndConditions"),
    customSections,
    image,
    gallery,
    sponsors,
    showSponsorBar: bool(formData, "showSponsorBar"),
    reelLinks,
    socialMedia,
    status: (str(formData, "status") || "draft") as "draft" | "published" | "cancelled",
    speakerProfiles,
    published: bool(formData, "published"),
    featured: bool(formData, "featured"),
    visitorTypes: filledVisitorTypes,
    sponsorTypes,
    volunteers,
    speakerSlotTemplates,
    roundTableTemplates,
    workshopSessions,
    workshopPackages,
    workshopHostingOpen: bool(formData, "workshopHostingOpen"),
    tableTemplates,
    addOnItems,
    maxSpacesPerVendor: num(formData, "maxSpacesPerVendor", 1),
    autoGenerateVendorCoupon: bool(formData, "autoGenerateVendorCoupon"),
    showSpacePricesOnEventfront: bool(formData, "showSpacePricesOnEventfront"),
    scheduledSpaceTemplates,
    seatRowTemplates,
    venueSeats,
    venueConfig,
    venueTables,
    venueRoundTables,
    venueScheduledSpaces,
    venueSpeakerZones,
    venueAnnotations,
  };

  try {
    if (id) await updateEventBackend(id, input);
    else await createEventBackend(input);
  } catch (err) {
    return eventsErrorState(err, formData);
  }

  return { ok: true };
}

export async function deleteEvent(id: string): Promise<void> {
  await deleteEventBackend(id);
}

// ---- coupons (CouponsPanel) ------------------------------------------------

export async function saveCoupon(formData: FormData): Promise<FormState> {
  const id = str(formData, "id") || null;
  const code = str(formData, "code");
  if (!code)
    return { ok: false, errors: { code: "Code is required." }, values: collectValues(formData) };

  const input = {
    code,
    discountType: (str(formData, "discountType") || "PERCENTAGE") as "PERCENTAGE" | "FLAT",
    discountPercentage: str(formData, "discountPercentage") ? num(formData, "discountPercentage") : undefined,
    flatDiscountAmount: str(formData, "flatDiscountAmount") ? num(formData, "flatDiscountAmount") : undefined,
    minOrderAmount: str(formData, "minOrderAmount") ? num(formData, "minOrderAmount") : undefined,
    maxUsage: str(formData, "maxUsage") ? num(formData, "maxUsage") : undefined,
    expiryDate: str(formData, "expiryDate"),
    isActive: bool(formData, "isActive"),
    eventIds: formData.getAll("eventIds").map(String),
  };
  try {
    if (id) await updateCoupon(id, input);
    else await createCoupon(input);
    return { ok: true };
  } catch (err) {
    return eventsErrorState(err, formData);
  }
}

export async function deleteCouponAction(id: string): Promise<void> {
  await deleteCoupon(id);
}

export async function toggleCouponActive(formData: FormData): Promise<void> {
  const id = str(formData, "id");
  const active = str(formData, "active") === "true";
  if (id) await setCouponActive(id, active);
}

// ---- participants (ParticipantsTable) --------------------------------------

export async function markTicketAttendanceAction(ticketId: string): Promise<void> {
  await markTicketAttendanceAdmin(ticketId);
}

export async function resendTicketEmailAction(id: string): Promise<void> {
  await resendTicketEmailAdmin(id);
}

// ---- sponsors -----------------------------------------------------------------

export async function approveSponsorRequest(id: string): Promise<void> {
  await setSponsorRequestStatus(id, "Approved");
}

export async function rejectSponsorRequest(id: string): Promise<void> {
  await setSponsorRequestStatus(id, "Rejected");
}

export async function confirmSponsorPayment(id: string): Promise<void> {
  await verifySponsorPayment(id);
}

export { fetchTicketsAdmin };
