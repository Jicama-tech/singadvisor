/**
 * Admin-only client for the CRM module — unlike contentClient.ts (public
 * reads + adminActions.ts writes), every CRM route is Bearer-guarded, so
 * reads and writes both go through apiJson({ admin: true }).
 */
import { apiJson } from "@/lib/adminFetch";

export type ContactNote = {
  _id: string;
  text: string;
  authorName: string;
  createdAt: string;
};

/** registration | enrolment | enquiry | application | message | subscriber |
 * ticket | sponsor | feedback | space-booking | manual | import */
export type ContactSource = {
  type: string;
  refId: string | null;
  label: string;
  createdAt: string;
};

/**
 * One programme in this person's history. Derived on the Backend at read time
 * by grouping their registrations and enrolments by trainingId — never stored
 * on the contact, because an enrolment's status, payment and attendance all
 * change after the fact and no write path would keep a copy fresh.
 *
 * Two records make a course theirs and both count: a Registration (the
 * "I'm interested" form on the brochure page, where nearly all the real data
 * is) shows as Enquired, an Enrolment (a named seat on a dated run, the richer
 * record) as Enrolled. See the Backend's CrmService.ContactCourse.
 */
export type ContactCourse = {
  trainingId: string;
  title: string;
  /** null once the programme has been deleted — also the "is it linkable"
   * flag, since /admin/trainings/:trainingId is then a dead route. */
  slug: string | null;
  enquiryCount: number;
  /** 0 = enquired but never seated, the common case today. */
  enrolmentCount: number;
  /** Oldest first; empty when never enrolled. */
  runCodes: string[];
  /** The four below describe the most recent enrolment, and are all null
   * exactly when enrolmentCount is 0. */
  status: string | null;
  paymentStatus: string | null;
  attendancePct: number | null;
  assessmentOutcome: string | null;
  /** The span across both kinds of record. */
  firstAt: string;
  lastAt: string;
};

/** What GET /crm/contacts sends per row. The list is unpaginated, so it gets
 * titles and two flags rather than each course's full history. */
export type ContactCourseSummary = {
  trainingId: string;
  title: string;
  enquired: boolean;
  enrolled: boolean;
};

/** Suggested roles, not an allow-list — `Contact.role` is a free-form string
 * on the Backend so a new kind of person never needs a deploy. These are what
 * the form offers and what the filter seeds itself with; anything typed by
 * hand or arriving in a spreadsheet is kept as-is. */
export const CONTACT_ROLES = [
  "Student",
  "Customer",
  "Trainer",
  "Consultant",
  "Partner",
  "Vendor",
  "Staff",
  "Other",
] as const;

type ContactBase = {
  _id: string;
  email: string;
  name: string;
  phone: string;
  whatsapp: string;
  role: string;
  company: string;
  tags: string[];
  notes: ContactNote[];
  sources: ContactSource[];
  firstSeenAt: string;
  lastActivityAt: string;
  createdAt: string;
  updatedAt: string;
};

/** Every contact-returning route except the list — the detail read, the create,
 * the patch and both note writes all carry the full course history, because
 * CrmDetail replaces its whole contact state from each of them and a response
 * without `courses` would blank the panel. */
export type ContactDoc = ContactBase & { courses: ContactCourse[] };

/** GET /crm/contacts only — same contact, lighter courses. */
export type ContactListItem = ContactBase & { courses: ContactCourseSummary[] };

export type ContactFilters = {
  q?: string;
  tag?: string;
  source?: string;
  role?: string;
  /** A Training._id. Applied server-side across both registrations and
   * enrolments, so the CSV export honours it too. */
  training?: string;
};

function query(filters: ContactFilters): string {
  const sp = new URLSearchParams();
  if (filters.q) sp.set("q", filters.q);
  if (filters.tag) sp.set("tag", filters.tag);
  if (filters.source) sp.set("source", filters.source);
  if (filters.role) sp.set("role", filters.role);
  if (filters.training) sp.set("training", filters.training);
  const s = sp.toString();
  return s ? `?${s}` : "";
}

const json = { "Content-Type": "application/json" } as const;

export function fetchContacts(filters: ContactFilters = {}): Promise<ContactListItem[]> {
  return apiJson(`/crm/contacts${query(filters)}`, { admin: true });
}

export function fetchContact(id: string): Promise<ContactDoc> {
  return apiJson(`/crm/contacts/${id}`, { admin: true });
}

export function createContact(body: {
  email: string;
  name?: string;
  phone?: string;
  whatsapp?: string;
  role?: string;
  company?: string;
}): Promise<ContactDoc> {
  return apiJson(`/crm/contacts`, {
    admin: true,
    method: "POST",
    headers: json,
    body: JSON.stringify(body),
  });
}

export function updateContact(
  id: string,
  body: Partial<{
    name: string;
    phone: string;
    whatsapp: string;
    role: string;
    company: string;
    tags: string[];
    }>,
): Promise<ContactDoc> {
  return apiJson(`/crm/contacts/${id}`, {
    admin: true,
    method: "PATCH",
    headers: json,
    body: JSON.stringify(body),
  });
}

export function deleteContact(id: string): Promise<void> {
  return apiJson(`/crm/contacts/${id}`, { admin: true, method: "DELETE" });
}

export function addContactNote(id: string, text: string): Promise<ContactDoc> {
  return apiJson(`/crm/contacts/${id}/notes`, {
    admin: true,
    method: "POST",
    headers: json,
    body: JSON.stringify({ text }),
  });
}

export function deleteContactNote(id: string, noteId: string): Promise<ContactDoc> {
  return apiJson(`/crm/contacts/${id}/notes/${noteId}`, { admin: true, method: "DELETE" });
}

/** Re-runnable on purpose (see the Backend's CrmService.backfill docs) —
 * scans every existing registration/enquiry/application/message/subscriber
 * and upserts a Contact for each, backdated to that record's own
 * createdAt. */
export function runCrmBackfill(): Promise<{ scanned: number }> {
  return apiJson(`/crm/contacts/backfill`, { admin: true, method: "POST" });
}

export function crmExportPath(filters: ContactFilters = {}): string {
  return `/crm/contacts/export${query(filters)}`;
}

export type ImportResult = { imported: number; skipped: number; errors: string[] };

/** Multipart upload — deliberately not apiJson: a FormData body must not get
 * apiJson's would-be JSON Content-Type, the browser needs to set its own
 * multipart boundary (same rule uploadContentImage/uploadNewsletterImage
 * follow in adminActions.ts). */
export async function importContacts(file: File): Promise<ImportResult> {
  const token = sessionStorage.getItem("token");
  if (!token) throw new Error("Not authorised.");
  const body = new FormData();
  body.append("file", file);
  const response = await fetch(`${__API_URL__}/crm/contacts/import`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      data && typeof data === "object" && "message" in data
        ? Array.isArray((data as { message: unknown }).message)
          ? (data as { message: string[] }).message.join(" ")
          : String((data as { message: unknown }).message)
        : `Import failed (${response.status})`;
    throw new Error(message);
  }
  return data as ImportResult;
}
