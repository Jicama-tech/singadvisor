"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { collectValues, type FormState } from "@/lib/form-state";
import {
  authenticate,
  AuthServiceUnavailableError,
  clearSessionCookie,
  createSession,
  getSession,
  setSessionCookie,
} from "@/lib/auth";
import { db } from "@/lib/db";
import { fieldErrors, loginSchema } from "@/lib/validation";
import { linesToJson, slugify } from "@/lib/utils";
import { LANDING_VARIANTS, type LandingSectionKey, type LandingVariant } from "@/lib/landing-client";
import {
  LandingServiceError,
  patchLandingSectionContent,
  patchLandingSectionMove,
  patchLandingSectionVariant,
  patchLandingSectionVisibility,
  uploadLandingMedia,
} from "@/lib/landing-admin-client";
import {
  EventsServiceError,
  createEvent as createEventBackend,
  deleteEvent as deleteEventBackend,
  fetchEventAdmin,
  updateEvent as updateEventBackend,
  uploadEventImage,
  setSponsorRequestStatus,
  verifySponsorPayment,
  createCoupon as createCouponBackend,
  updateCoupon as updateCouponBackend,
  deleteCoupon as deleteCouponBackend,
  setCouponActive as setCouponActiveBackend,
  resendTicketEmailAdmin,
  markTicketAttendanceAdmin,
} from "@/lib/events-admin-client";

/**
 * Every mutation below calls this first. The middleware already redirects
 * unauthenticated navigation, but server actions are directly invocable
 * endpoints — they must not rely on the middleware having run.
 */
async function requireSession() {
  const session = await getSession();
  if (!session) throw new Error("Not authorised.");
  return session;
}

const str = (fd: FormData, key: string) => {
  const v = fd.get(key);
  return typeof v === "string" ? v.trim() : "";
};
const num = (fd: FormData, key: string, fallback = 0) => {
  const n = Number(str(fd, key));
  return Number.isFinite(n) ? n : fallback;
};
const bool = (fd: FormData, key: string) => fd.get(key) === "on";
const nullable = (fd: FormData, key: string) => str(fd, key) || null;

// ---------------------------------------------------------------------------
// Authentication
// ---------------------------------------------------------------------------

export async function login(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = loginSchema.safeParse({
    email: str(formData, "email"),
    password: str(formData, "password"),
  });
  if (!parsed.success) return {
      ok: false,
      errors: fieldErrors(parsed.error),
      values: collectValues(formData),
    };

  let user: Awaited<ReturnType<typeof authenticate>>;
  try {
    user = await authenticate(parsed.data.email, parsed.data.password);
  } catch (err) {
    if (err instanceof AuthServiceUnavailableError) {
      return {
        ok: false,
        message: "Sign-in is temporarily unavailable. Please try again shortly.",
        values: collectValues(formData),
      };
    }
    throw err;
  }
  // Deliberately generic — do not reveal whether the email exists.
  if (!user) return { ok: false, message: "Incorrect email or password.", values: collectValues(formData) };

  await setSessionCookie(await createSession(user));

  const next = str(formData, "next");
  // Only allow same-site relative redirects; `//evil.com` is a valid URL path
  // that would otherwise send the user off-site.
  const target =
    next.startsWith("/") && !next.startsWith("//") ? next : "/admin";
  redirect(target);
}

export async function logout() {
  await clearSessionCookie();
  redirect("/");
}

// ---------------------------------------------------------------------------
// Trainings
// ---------------------------------------------------------------------------

export async function saveTraining(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireSession();

  const id = str(formData, "id");
  const title = str(formData, "title");
  if (!title) return {
      ok: false,
      errors: { title: "Title is required." },
      values: collectValues(formData),
    };

  const slug = slugify(str(formData, "slug") || title);

  // Slugs are the public URL; a collision would silently break an existing page.
  const clash = await db.training.findFirst({
    where: { slug, ...(id ? { id: { not: id } } : {}) },
    select: { id: true },
  });
  if (clash)
    return {
      ok: false,
      errors: { slug: "That slug is already in use." },
      values: collectValues(formData),
    };

  const data = {
    slug,
    title,
    summary: str(formData, "summary"),
    description: str(formData, "description"),
    image: str(formData, "image") || "/Images/Trainingimgae/traing.jpg",
    category: str(formData, "category") || "Student",
    level: str(formData, "level") || "All levels",
    durationHrs: num(formData, "durationHrs", 2),
    format: str(formData, "format") || "In-person",
    priceCents: Math.round(num(formData, "price") * 100),
    outcomes: linesToJson(str(formData, "outcomes")),
    modules: linesToJson(str(formData, "modules")),
    published: bool(formData, "published"),
    featured: bool(formData, "featured"),
    sortOrder: num(formData, "sortOrder"),
    trainerId: nullable(formData, "trainerId"),
  };

  if (id) await db.training.update({ where: { id }, data });
  else await db.training.create({ data });

  revalidatePath("/admin/trainings");
  revalidatePath("/trainings");
  revalidatePath(`/trainings/${slug}`);
  revalidatePath("/");
  redirect("/admin/trainings");
}

export async function deleteTraining(formData: FormData) {
  await requireSession();
  const id = str(formData, "id");
  if (id) await db.training.delete({ where: { id } });
  revalidatePath("/admin/trainings");
  revalidatePath("/trainings");
  revalidatePath("/");
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

function eventsErrorState(err: unknown, formData: FormData): FormState {
  if (err instanceof EventsServiceError) {
    return {
      ok: false,
      message: err.fieldErrors?.length ? err.fieldErrors.join(" ") : err.message,
      values: collectValues(formData),
    };
  }
  throw err;
}

export async function saveEvent(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireSession();

  const id = str(formData, "id");
  const title = str(formData, "title");
  if (!title) return {
      ok: false,
      errors: { title: "Title is required." },
      values: collectValues(formData),
    };

  const startsAt = new Date(str(formData, "startsAt"));
  const endsAt = new Date(str(formData, "endsAt"));
  if (Number.isNaN(startsAt.getTime()))
    return {
      ok: false,
      errors: { startsAt: "Enter a valid start date." },
      values: collectValues(formData),
    };
  if (Number.isNaN(endsAt.getTime()))
    return {
      ok: false,
      errors: { endsAt: "Enter a valid end date." },
      values: collectValues(formData),
    };
  if (endsAt <= startsAt)
    return {
      ok: false,
      errors: { endsAt: "The end must be after the start." },
      values: collectValues(formData),
    };

  // Agenda rows arrive as "9:00 am | Registration" one per line.
  const agenda = str(formData, "agenda")
    .split("\n")
    .map((line) => {
      const [time, ...rest] = line.split("|");
      return { time: time?.trim() ?? "", title: rest.join("|").trim() };
    })
    .filter((row) => row.time && row.title);

  const speakers = str(formData, "speakers")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

  const tags = str(formData, "tags")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const gallery = str(formData, "gallery")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

  const reelLinks = str(formData, "reelLinks")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

  const socialMedia = Object.fromEntries(
    (["facebook", "instagram", "twitter", "linkedin"] as const)
      .map((k) => [k, str(formData, k)])
      .filter(([, v]) => v),
  );

  const features = Object.fromEntries(
    [
      "food",
      "parking",
      "wifi",
      "photography",
      "security",
      "accessibility",
      // Module toggles — mirrors eventsh-v1's Venue-tab "Event Sections"
      // switches, gating which of this form's own tabs are shown.
      "hasSpeakers",
      "hasSponsors",
      "hasVolunteers",
      "hasRoundTables",
      "hasWorkshops",
      "hasSpaces",
    ]
      .filter((k) => bool(formData, `feature_${k}`))
      .map((k) => [k, true]),
  );

  // Existing tiers keyed by id, so an edited tier's `soldCount` survives —
  // the Backend's update wholesale-replaces `visitorTypes`, it doesn't
  // merge, so anything not carried forward here would silently reset to 0.
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
    return {
      id: tierId,
      name: str(formData, `tier${i}Name`) || "General Admission",
      price: num(formData, `tier${i}Price`),
      maxCount: num(formData, `tier${i}MaxCount`, 0),
      soldCount: existingTiersById.get(tierId) ?? 0,
      description: str(formData, `tier${i}Description`),
      featureAccess: {
        food: bool(formData, `tier${i}Feature_food`),
        parking: bool(formData, `tier${i}Feature_parking`),
        wifi: bool(formData, `tier${i}Feature_wifi`),
        photography: bool(formData, `tier${i}Feature_photography`),
        security: bool(formData, `tier${i}Feature_security`),
        accessibility: bool(formData, `tier${i}Feature_accessibility`),
      },
      isActive: bool(formData, `tier${i}Active`),
    };
  });
  if (visitorTypes.length === 0) {
    return {
      ok: false,
      message: "Add at least one ticket tier.",
      values: collectValues(formData),
    };
  }

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
    customOptions: str(formData, `sponsor${i}CustomOptions`)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    description: str(formData, `sponsor${i}Description`),
  })).filter((s) => s.name);

  const ageRowCount = num(formData, "ageRowCount", 0);
  const ageRestrictions = Array.from({ length: ageRowCount }, (_, i) => ({
    heading: str(formData, `ageRow${i}Heading`),
    age: str(formData, `ageRow${i}Age`) || "All Ages",
  })).filter((a) => a.heading);

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

  let image: string;
  let speakerProfiles: Awaited<ReturnType<typeof buildSpeakerProfile>>[];
  let workshopSessions: Awaited<ReturnType<typeof buildWorkshopSession>>[];
  let addOnItems: Awaited<ReturnType<typeof buildAddOnItem>>[];
  try {
    image = (await uploadEventImageIfPresent(formData, "imageFile")) ?? str(formData, "image");
    const speakerCount = num(formData, "speakerCount", 0);
    speakerProfiles = (
      await Promise.all(
        Array.from({ length: speakerCount }, (_, i) => buildSpeakerProfile(formData, i)),
      )
    ).filter((s) => s.name && s.topic); // DTO requires both — drop rows added but never filled in

    const workshopSessionCount = num(formData, "workshopSessionCount", 0);
    workshopSessions = (
      await Promise.all(
        Array.from({ length: workshopSessionCount }, (_, i) => buildWorkshopSession(formData, i)),
      )
    ).filter((w) => w.name);

    const addOnItemCount = num(formData, "addOnItemCount", 0);
    addOnItems = (
      await Promise.all(Array.from({ length: addOnItemCount }, (_, i) => buildAddOnItem(formData, i)))
    ).filter((a) => a.name);
  } catch (err) {
    return eventsErrorState(err, formData);
  }

  const input = {
    slug: str(formData, "slug") || undefined,
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
    specialInstructions: str(formData, "specialInstructions"),
    refundPolicy: str(formData, "refundPolicy"),
    termsAndConditions: str(formData, "termsAndConditions"),
    customSections,
    image,
    gallery,
    reelLinks,
    socialMedia,
    status: (str(formData, "status") || "draft") as "draft" | "published" | "cancelled",
    speakers,
    speakerProfiles,
    agenda,
    currency: str(formData, "currency") || "SGD",
    published: bool(formData, "published"),
    featured: bool(formData, "featured"),
    visitorTypes,
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
  };

  let slug: string;
  try {
    const saved = id ? await updateEventBackend(id, input) : await createEventBackend(input);
    slug = saved.slug;
  } catch (err) {
    return eventsErrorState(err, formData);
  }

  revalidatePath("/admin/events");
  revalidatePath("/events");
  revalidatePath(`/events/${slug}`);
  revalidatePath("/");
  redirect("/admin/events");
}

export async function deleteEvent(formData: FormData) {
  await requireSession();
  const id = str(formData, "id");
  if (id) await deleteEventBackend(id);
  revalidatePath("/admin/events");
  revalidatePath("/events");
  revalidatePath("/");
}

// ---------------------------------------------------------------------------
// Sponsor requests (review workflow — Sponsors tab in EventForm)
// ---------------------------------------------------------------------------

export async function approveSponsorRequest(formData: FormData) {
  await requireSession();
  const id = str(formData, "id");
  const eventId = str(formData, "eventId");
  if (id) await setSponsorRequestStatus(id, "Approved");
  revalidatePath(`/admin/events/${eventId}/sponsors`);
}

export async function rejectSponsorRequest(formData: FormData) {
  await requireSession();
  const id = str(formData, "id");
  const eventId = str(formData, "eventId");
  if (id) await setSponsorRequestStatus(id, "Rejected");
  revalidatePath(`/admin/events/${eventId}/sponsors`);
}

export async function confirmSponsorPayment(formData: FormData) {
  await requireSession();
  const id = str(formData, "id");
  const eventId = str(formData, "eventId");
  if (id) await verifySponsorPayment(id);
  revalidatePath(`/admin/events/${eventId}/sponsors`);
}

// ---------------------------------------------------------------------------
// Coupons (Events/Coupons tab — Phase 6c)
// ---------------------------------------------------------------------------

function couponsErrorState(err: unknown, formData: FormData): FormState {
  if (err instanceof EventsServiceError) {
    return {
      ok: false,
      message: err.fieldErrors?.length ? err.fieldErrors.join(" ") : err.message,
      values: collectValues(formData),
    };
  }
  throw err;
}

/** Unlike saveEvent, this never redirects — CouponsPanel.tsx renders the
 * form inline on the same page and closes it itself once `ok` comes back
 * true, so the only job here is validate -> call eventsh -> revalidate. */
export async function saveCoupon(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireSession();

  const id = str(formData, "id");
  const code = str(formData, "code");
  if (!id && !code) {
    return {
      ok: false,
      errors: { code: "Code is required." },
      values: collectValues(formData),
    };
  }

  const discountType: "PERCENTAGE" | "FLAT" =
    str(formData, "discountType") === "FLAT" ? "FLAT" : "PERCENTAGE";

  const expiryDateRaw = str(formData, "expiryDate");
  const expiryDate = expiryDateRaw ? new Date(expiryDateRaw) : null;
  if (!expiryDate || Number.isNaN(expiryDate.getTime())) {
    return {
      ok: false,
      errors: { expiryDate: "Enter a valid expiry date." },
      values: collectValues(formData),
    };
  }

  const eventIds = formData.getAll("eventIds").map(String).filter(Boolean);

  // Code is a disabled input once editing (CouponsPanel.tsx), so it never
  // submits on update — `code` above is "" in that case. Omit it from the
  // update payload entirely rather than sending an empty string, which
  // would otherwise blank out the coupon's code (eventsh's PATCH replaces
  // whatever fields are present in the body).
  const fields = {
    discountType,
    discountPercentage:
      discountType === "PERCENTAGE" ? num(formData, "discountPercentage") : undefined,
    flatDiscountAmount: discountType === "FLAT" ? num(formData, "flatDiscountAmount") : undefined,
    minOrderAmount: str(formData, "minOrderAmount") ? num(formData, "minOrderAmount") : undefined,
    maxUsage: str(formData, "maxUsage") ? num(formData, "maxUsage") : undefined,
    expiryDate: expiryDate.toISOString(),
    isActive: true,
    eventIds,
  };

  try {
    if (id) await updateCouponBackend(id, fields);
    else await createCouponBackend({ ...fields, code });
  } catch (err) {
    return couponsErrorState(err, formData);
  }

  revalidatePath("/admin/events");
  return { ok: true };
}

export async function deleteCouponAction(formData: FormData) {
  await requireSession();
  const id = str(formData, "id");
  if (id) await deleteCouponBackend(id);
  revalidatePath("/admin/events");
}

export async function toggleCouponActive(formData: FormData) {
  await requireSession();
  const id = str(formData, "id");
  const isActive = str(formData, "isActive") === "true";
  if (id) await setCouponActiveBackend(id, isActive);
  revalidatePath("/admin/events");
}

// ---------------------------------------------------------------------------
// Participants tab (Phase 6d) — ticket admin actions
// ---------------------------------------------------------------------------

export async function resendTicketEmailAction(formData: FormData) {
  await requireSession();
  const id = str(formData, "id");
  if (id) await resendTicketEmailAdmin(id);
  revalidatePath("/admin/events/participants");
}

export async function markTicketAttendanceAction(formData: FormData) {
  await requireSession();
  const ticketId = str(formData, "ticketId");
  if (ticketId) await markTicketAttendanceAdmin(ticketId);
  revalidatePath("/admin/events/participants");
}

// ---------------------------------------------------------------------------
// Consultancy services
// ---------------------------------------------------------------------------

export async function saveService(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireSession();

  const id = str(formData, "id");
  const title = str(formData, "title");
  if (!title) return {
      ok: false,
      errors: { title: "Title is required." },
      values: collectValues(formData),
    };

  const slug = slugify(str(formData, "slug") || title);
  const clash = await db.consultancyService.findFirst({
    where: { slug, ...(id ? { id: { not: id } } : {}) },
    select: { id: true },
  });
  if (clash)
    return {
      ok: false,
      errors: { slug: "That slug is already in use." },
      values: collectValues(formData),
    };

  const data = {
    slug,
    title,
    summary: str(formData, "summary"),
    description: str(formData, "description"),
    image: str(formData, "image") || "/Images/Trainingimgae/consultancy.jpg",
    icon: str(formData, "icon") || "compass",
    engagement: str(formData, "engagement") || "Project-based",
    deliverables: linesToJson(str(formData, "deliverables")),
    idealFor: linesToJson(str(formData, "idealFor")),
    published: bool(formData, "published"),
    sortOrder: num(formData, "sortOrder"),
  };

  if (id) await db.consultancyService.update({ where: { id }, data });
  else await db.consultancyService.create({ data });

  revalidatePath("/admin/consultancy");
  revalidatePath("/consultancy");
  revalidatePath(`/consultancy/${slug}`);
  revalidatePath("/");
  redirect("/admin/consultancy");
}

export async function deleteService(formData: FormData) {
  await requireSession();
  const id = str(formData, "id");
  if (id) await db.consultancyService.delete({ where: { id } });
  revalidatePath("/admin/consultancy");
  revalidatePath("/consultancy");
  revalidatePath("/");
}

// ---------------------------------------------------------------------------
// Job postings
// ---------------------------------------------------------------------------

export async function saveJob(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireSession();

  const id = str(formData, "id");
  const title = str(formData, "title");
  if (!title) return {
      ok: false,
      errors: { title: "Title is required." },
      values: collectValues(formData),
    };

  const slug = slugify(str(formData, "slug") || title);
  const clash = await db.jobPosting.findFirst({
    where: { slug, ...(id ? { id: { not: id } } : {}) },
    select: { id: true },
  });
  if (clash)
    return {
      ok: false,
      errors: { slug: "That slug is already in use." },
      values: collectValues(formData),
    };

  const closesRaw = str(formData, "closesAt");
  const closesAt = closesRaw ? new Date(closesRaw) : null;
  if (closesAt && Number.isNaN(closesAt.getTime()))
    return {
      ok: false,
      errors: { closesAt: "Enter a valid closing date." },
      values: collectValues(formData),
    };

  const salaryMin = str(formData, "salaryMin") ? num(formData, "salaryMin") : null;
  const salaryMax = str(formData, "salaryMax") ? num(formData, "salaryMax") : null;
  if (salaryMin != null && salaryMax != null && salaryMax < salaryMin)
    return {
      ok: false,
      errors: { salaryMax: "The maximum must be at least the minimum." },
      values: collectValues(formData),
    };

  const data = {
    slug,
    title,
    department: str(formData, "department") || "General",
    location: str(formData, "location") || "Singapore",
    employment: str(formData, "employment") || "Full-time",
    workMode: str(formData, "workMode") || "On-site",
    experience: str(formData, "experience") || "2-4 years",
    salaryMin,
    salaryMax,
    summary: str(formData, "summary"),
    description: str(formData, "description"),
    requirements: linesToJson(str(formData, "requirements")),
    benefits: linesToJson(str(formData, "benefits")),
    published: bool(formData, "published"),
    closesAt,
  };

  if (id) await db.jobPosting.update({ where: { id }, data });
  else await db.jobPosting.create({ data });

  revalidatePath("/admin/careers");
  revalidatePath("/careers");
  revalidatePath(`/careers/${slug}`);
  revalidatePath("/");
  redirect("/admin/careers");
}

export async function deleteJob(formData: FormData) {
  await requireSession();
  const id = str(formData, "id");
  if (id) await db.jobPosting.delete({ where: { id } });
  revalidatePath("/admin/careers");
  revalidatePath("/careers");
  revalidatePath("/");
}

// ---------------------------------------------------------------------------
// Blog posts
// ---------------------------------------------------------------------------

export async function savePost(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireSession();

  const id = str(formData, "id");
  const title = str(formData, "title");
  if (!title)
    return {
      ok: false,
      errors: { title: "Title is required." },
      values: collectValues(formData),
    };

  const content = str(formData, "content");
  if (!content)
    return {
      ok: false,
      errors: { content: "An article needs a body." },
      values: collectValues(formData),
    };

  const slug = slugify(str(formData, "slug") || title);
  const clash = await db.blogPost.findFirst({
    where: { slug, ...(id ? { id: { not: id } } : {}) },
    select: { id: true },
  });
  if (clash)
    return {
      ok: false,
      errors: { slug: "That slug is already in use." },
      values: collectValues(formData),
    };

  const published = bool(formData, "published");
  const existing = id
    ? await db.blogPost.findUnique({
        where: { id },
        select: { publishedAt: true },
      })
    : null;

  // Stamp publishedAt the first time a post goes live and keep it stable
  // afterwards, so editing an old article does not move it to the top.
  const publishedAtRaw = str(formData, "publishedAt");
  let publishedAt: Date | null = existing?.publishedAt ?? null;
  if (publishedAtRaw) {
    const parsed = new Date(publishedAtRaw);
    if (Number.isNaN(parsed.getTime()))
      return {
        ok: false,
        errors: { publishedAt: "Enter a valid date." },
        values: collectValues(formData),
      };
    publishedAt = parsed;
  } else if (published && !publishedAt) {
    publishedAt = new Date();
  }

  const data = {
    slug,
    title,
    excerpt: str(formData, "excerpt"),
    content,
    coverImage: str(formData, "coverImage") || "/Images/Trainingimgae/traing.jpg",
    category: str(formData, "category") || "Insights",
    tags: linesToJson(str(formData, "tags")),
    published,
    featured: bool(formData, "featured"),
    publishedAt,
    authorId: nullable(formData, "authorId"),
  };

  if (id) await db.blogPost.update({ where: { id }, data });
  else await db.blogPost.create({ data });

  revalidatePath("/admin/blog");
  revalidatePath("/blog");
  revalidatePath(`/blog/${slug}`);
  revalidatePath("/");
  redirect("/admin/blog");
}

export async function deletePost(formData: FormData) {
  await requireSession();
  const id = str(formData, "id");
  if (id) await db.blogPost.delete({ where: { id } });
  revalidatePath("/admin/blog");
  revalidatePath("/blog");
  revalidatePath("/");
}

// ---------------------------------------------------------------------------
// Submission status updates
// ---------------------------------------------------------------------------

export async function updateRegistrationStatus(formData: FormData) {
  await requireSession();
  const id = str(formData, "id");
  const status = str(formData, "status");
  if (id && status)
    await db.registration.update({ where: { id }, data: { status } });
  revalidatePath("/admin/registrations");
}

export async function updateEnquiryStatus(formData: FormData) {
  await requireSession();
  const id = str(formData, "id");
  const status = str(formData, "status");
  if (id && status)
    await db.consultancyEnquiry.update({ where: { id }, data: { status } });
  revalidatePath("/admin/enquiries");
}

export async function updateApplicationStatus(formData: FormData) {
  await requireSession();
  const id = str(formData, "id");
  const status = str(formData, "status");
  if (id && status)
    await db.jobApplication.update({ where: { id }, data: { status } });
  revalidatePath("/admin/applications");
}

export async function toggleMessageHandled(formData: FormData) {
  await requireSession();
  const id = str(formData, "id");
  if (!id) return;
  const current = await db.contactMessage.findUnique({
    where: { id },
    select: { handled: true },
  });
  if (current)
    await db.contactMessage.update({
      where: { id },
      data: { handled: !current.handled },
    });
  revalidatePath("/admin/messages");
}

// ---------------------------------------------------------------------------
// Landing page sections
// ---------------------------------------------------------------------------

/** "value | label" per line — same convention as EventForm's agenda field. */
function parsePairLines(text: string): { value: string; label: string }[] {
  return text
    .split("\n")
    .map((line) => {
      const [value, label] = line.split("|");
      return { value: (value ?? "").trim(), label: (label ?? "").trim() };
    })
    .filter((item) => item.value && item.label);
}

function landingErrorState(err: unknown, formData: FormData): FormState {
  if (err instanceof LandingServiceError) {
    return {
      ok: false,
      message: err.fieldErrors?.length ? err.fieldErrors.join(" ") : err.message,
      values: collectValues(formData),
    };
  }
  throw err;
}

function revalidateLanding() {
  revalidatePath("/");
  revalidatePath("/admin/landing");
}

function readVariant(formData: FormData): LandingVariant {
  const value = str(formData, "variant");
  return (LANDING_VARIANTS as readonly string[]).includes(value)
    ? (value as LandingVariant)
    : "modern";
}

/**
 * An untouched `<input type="file">` still submits an entry — an empty File
 * with no name and zero size — so "was anything actually chosen" has to be
 * checked explicitly, not just truthiness of the FormData entry.
 */
async function uploadIfPresent(formData: FormData, fieldName: string): Promise<string | null> {
  const file = formData.get(fieldName);
  if (!(file instanceof File) || file.size === 0) return null;
  const { url } = await uploadLandingMedia(file);
  return url;
}

/** Same "was anything actually chosen" check as `uploadIfPresent` above, but
 * against the events uploads endpoint (Backend/uploads/events/) instead of
 * landing's. */
async function uploadEventImageIfPresent(formData: FormData, fieldName: string): Promise<string | null> {
  const file = formData.get(fieldName);
  if (!(file instanceof File) || file.size === 0) return null;
  const { url } = await uploadEventImage(file);
  return url;
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

/** Same pattern as buildSpeakerProfile above, for a Workshop Sessions row —
 * uploads the (already-cropped, per CroppedImageField) photo file if one was
 * chosen, else keeps whatever path was already there. */
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

export async function saveHeroSection(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireSession();
  const content = {
    eyebrow: str(formData, "eyebrow"),
    title: str(formData, "title"),
    titleAccent: str(formData, "titleAccent"),
    description: str(formData, "description"),
    primaryCtaLabel: str(formData, "primaryCtaLabel"),
    primaryCtaHref: str(formData, "primaryCtaHref"),
    secondaryCtaLabel: str(formData, "secondaryCtaLabel"),
    secondaryCtaHref: str(formData, "secondaryCtaHref"),
    videoSrc: str(formData, "videoSrc"),
    posterSrc: str(formData, "posterSrc"),
  };
  try {
    const [uploadedVideo, uploadedPoster] = await Promise.all([
      uploadIfPresent(formData, "videoFile"),
      uploadIfPresent(formData, "posterFile"),
    ]);
    if (uploadedVideo) content.videoSrc = uploadedVideo;
    if (uploadedPoster) content.posterSrc = uploadedPoster;

    await patchLandingSectionContent("hero", content);
    await patchLandingSectionVariant("hero", readVariant(formData));
  } catch (err) {
    return landingErrorState(err, formData);
  }
  revalidateLanding();
  redirect("/admin/landing");
}

export async function saveStatsSection(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireSession();
  const items = parsePairLines(str(formData, "items"));
  if (items.length === 0) {
    return {
      ok: false,
      errors: { items: "Add at least one stat, one per line as “value | label”." },
      values: collectValues(formData),
    };
  }
  try {
    await patchLandingSectionContent("stats", { items });
    await patchLandingSectionVariant("stats", readVariant(formData));
  } catch (err) {
    return landingErrorState(err, formData);
  }
  revalidateLanding();
  redirect("/admin/landing");
}

export async function savePillarsSection(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireSession();
  // Fixed 4 — positionally matched to Trainings/Events/Consultancy/Careers
  // (their icon and link stay hardcoded on the Frontend; only copy is here).
  const items = [0, 1, 2, 3].map((i) => ({
    title: str(formData, `pillar${i}Title`),
    description: str(formData, `pillar${i}Description`),
  }));
  try {
    await patchLandingSectionContent("pillars", { items });
    await patchLandingSectionVariant("pillars", readVariant(formData));
  } catch (err) {
    return landingErrorState(err, formData);
  }
  revalidateLanding();
  redirect("/admin/landing");
}

export async function saveConsultancySection(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireSession();
  const content = {
    eyebrow: str(formData, "eyebrow"),
    title: str(formData, "title"),
    description: str(formData, "description"),
    image: str(formData, "image"),
    ctaLabel: str(formData, "ctaLabel"),
    ctaHref: str(formData, "ctaHref"),
  };
  try {
    const uploadedImage = await uploadIfPresent(formData, "imageFile");
    if (uploadedImage) content.image = uploadedImage;

    await patchLandingSectionContent("consultancy", content);
    await patchLandingSectionVariant("consultancy", readVariant(formData));
  } catch (err) {
    return landingErrorState(err, formData);
  }
  revalidateLanding();
  redirect("/admin/landing");
}

export async function saveCtaSection(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireSession();
  const content = {
    title: str(formData, "title"),
    description: str(formData, "description"),
    primaryCtaLabel: str(formData, "primaryCtaLabel"),
    primaryCtaHref: str(formData, "primaryCtaHref"),
    secondaryCtaLabel: str(formData, "secondaryCtaLabel"),
    secondaryCtaHref: str(formData, "secondaryCtaHref"),
  };
  try {
    await patchLandingSectionContent("cta", content);
    await patchLandingSectionVariant("cta", readVariant(formData));
  } catch (err) {
    return landingErrorState(err, formData);
  }
  revalidateLanding();
  redirect("/admin/landing");
}

/** Shared by the four DB-driven sections — only the surrounding copy and
 * item count live here, never the items themselves (those stay exactly
 * where they are today: Training/Event/JobPosting/BlogPost). */
async function saveListSection(key: LandingSectionKey, formData: FormData): Promise<FormState> {
  const content = {
    eyebrow: str(formData, "eyebrow"),
    title: str(formData, "title"),
    description: str(formData, "description"),
    ctaLabel: str(formData, "ctaLabel"),
    ctaHref: str(formData, "ctaHref"),
    take: num(formData, "take", 3),
  };
  try {
    await patchLandingSectionContent(key, content);
    await patchLandingSectionVariant(key, readVariant(formData));
  } catch (err) {
    return landingErrorState(err, formData);
  }
  revalidateLanding();
  redirect("/admin/landing");
}

export async function saveTrainingsListSection(_prev: FormState, formData: FormData) {
  await requireSession();
  return saveListSection("trainings", formData);
}

export async function saveEventsListSection(_prev: FormState, formData: FormData) {
  await requireSession();
  return saveListSection("events", formData);
}

export async function saveCareersListSection(_prev: FormState, formData: FormData) {
  await requireSession();
  return saveListSection("careers", formData);
}

export async function saveBlogListSection(_prev: FormState, formData: FormData) {
  await requireSession();
  return saveListSection("blog", formData);
}

/** The list page submits the value it wants, not the current one — no
 * fetch-then-flip round trip needed. */
export async function setLandingSectionVisibility(formData: FormData) {
  await requireSession();
  const key = str(formData, "key") as LandingSectionKey;
  const visible = str(formData, "visible") === "true";
  await patchLandingSectionVisibility(key, visible);
  revalidateLanding();
}

export async function moveLandingSection(formData: FormData) {
  await requireSession();
  const key = str(formData, "key") as LandingSectionKey;
  const direction = str(formData, "direction") === "up" ? "up" : "down";
  await patchLandingSectionMove(key, direction);
  revalidateLanding();
}
