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

/** registration | enquiry | application | message | subscriber | manual */
export type ContactSource = {
  type: string;
  refId: string | null;
  label: string;
  createdAt: string;
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

export type ContactDoc = {
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

export type ContactFilters = { q?: string; tag?: string; source?: string; role?: string };

function query(filters: ContactFilters): string {
  const sp = new URLSearchParams();
  if (filters.q) sp.set("q", filters.q);
  if (filters.tag) sp.set("tag", filters.tag);
  if (filters.source) sp.set("source", filters.source);
  if (filters.role) sp.set("role", filters.role);
  const s = sp.toString();
  return s ? `?${s}` : "";
}

const json = { "Content-Type": "application/json" } as const;

export function fetchContacts(filters: ContactFilters = {}): Promise<ContactDoc[]> {
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
