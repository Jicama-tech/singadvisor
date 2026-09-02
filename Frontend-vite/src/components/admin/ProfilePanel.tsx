import { useCallback, useEffect, useState, type FormEvent } from "react";
import { adminFetch } from "@/lib/adminFetch";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { Panel } from "@/components/admin/AdminUI";
import { PhoneField } from "@/components/ui/PhoneField";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import { COUNTRIES } from "@/data/countries";

const ORGANIZER_ID = __EVENTSH_ORGANIZER_ID__;

/**
 * Settings → Profile. Two identities live here:
 * - "Organizer details" — the organizer doc ON eventsh (the same fields as
 *   eventsh's own organizer Settings → Profile), read/written through the
 *   Backend's /eventsh/* proxy. Includes a password hash in the GET
 *   response — that field is never read or rendered here.
 * - The logged-in user's own display name (works for admins AND
 *   operators — the backend dispatches by token role).
 *
 * Save-response gotcha: eventsh's profile PATCH swallows ALL errors and
 * returns HTTP 200 with an empty body on failure, so a response with no
 * `data` is treated as a failed save.
 */

type PhoneRow = { key: number; phone: string; label: string };
let phoneRowKey = 0;
const nextPhoneRowKey = () => ++phoneRowKey;

type OrganizerProfile = {
  ownerName: string;
  organizationName: string;
  email: string;
  businessEmail: string;
  whatsappNumber: string;
  phone: string;
  phoneRows: PhoneRow[];
  address: string;
  description: string;
  country: string;
  GSTNumber: string;
  UENNumber: string;
  taxPercentage: string;
  businessCategory: string;
  termsAndConditions: string;
};

function toProfile(d: Record<string, unknown>): OrganizerProfile {
  const phones = Array.isArray(d.contactPhones)
    ? (d.contactPhones as string[])
    : [];
  const names = Array.isArray(d.contactPhoneNames)
    ? (d.contactPhoneNames as string[])
    : [];
  return {
    ownerName: String(d.ownerName ?? d.name ?? ""),
    organizationName: String(d.organizationName ?? d.orgName ?? ""),
    email: String(d.email ?? ""),
    businessEmail: String(d.businessEmail ?? ""),
    whatsappNumber: String(d.whatsappNumber ?? ""),
    phone: String(d.phone ?? ""),
    phoneRows: phones.map((phone, i) => ({
      key: nextPhoneRowKey(),
      phone,
      label: names[i] ?? "",
    })),
    address: String(d.address ?? ""),
    description: String(d.description ?? d.bio ?? ""),
    country: String(d.country ?? "sg").toUpperCase(),
    GSTNumber: String(d.GSTNumber ?? ""),
    UENNumber: String(d.UENNumber ?? ""),
    taxPercentage: String(d.taxPercentage ?? ""),
    businessCategory: String(d.businessCategory ?? ""),
    termsAndConditions: String(d.termsAndConditions ?? ""),
  };
}

export function ProfilePanel({
  name,
  email,
  onMessage,
  onError,
}: {
  name: string;
  email: string;
  onMessage: (m: string) => void;
  onError: (m: string) => void;
}) {
  const [savingName, setSavingName] = useState(false);

  // ---- Organizer details (stored on eventsh) ----
  const [profile, setProfile] = useState<OrganizerProfile | null>(null);
  const [profileUnavailable, setProfileUnavailable] = useState(false);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [savingProfile, setSavingProfile] = useState(false);

  const loadProfile = useCallback(async () => {
    setProfileUnavailable(false);
    try {
      const res = await adminFetch(
        `${__API_URL__}/eventsh/organizers/profile-get/${ORGANIZER_ID}`
      );
      if (!res.ok) throw new Error("unavailable");
      const body = (await res.json()) as { data?: Record<string, unknown> };
      // NOTE: body.data contains the password hash — toProfile only copies
      // the whitelisted keys, so it never reaches component state.
      if (!body.data) throw new Error("unavailable");
      setProfile(toProfile(body.data));
    } catch {
      setProfileUnavailable(true);
    }
  }, []);

  useEffect(() => {
    void loadProfile();
    // Categories are a public route on eventsh — read-only here because
    // adding one requires a JWT the /eventsh proxy can't carry.
    adminFetch(`${__API_URL__}/eventsh/categories`)
      .then((res) => res.json())
      .then((body) => {
        const list = Array.isArray(body) ? body : body?.data;
        if (Array.isArray(list)) {
          setCategories(
            list.map((c) => ({ id: String(c._id ?? c.id), name: String(c.name ?? c.title ?? "") }))
          );
        }
      })
      .catch(() => {
        /* category dropdown simply stays empty */
      });
  }, [loadProfile]);

  function updateProfile(patch: Partial<OrganizerProfile>) {
    setProfile((p) => (p ? { ...p, ...patch } : p));
  }

  function updatePhoneRow(key: number, patch: Partial<PhoneRow>) {
    setProfile((p) =>
      p
        ? { ...p, phoneRows: p.phoneRows.map((r) => (r.key === key ? { ...r, ...patch } : r)) }
        : p
    );
  }

  async function saveProfile(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!profile) return;
    setSavingProfile(true);
    onError("");
    // These four are `required` in eventsh's organizer schema — clearing any
    // of them fails validation server-side and eventsh swallows the error
    // into an empty 200, so fail fast with a clear message instead.
    const requiredBlanks = (
      [
        ["Owner name", profile.ownerName],
        ["Primary email", profile.email],
        ["Business email", profile.businessEmail],
        ["WhatsApp number", profile.whatsappNumber],
      ] as const
    ).filter(([, v]) => !v.trim());
    if (requiredBlanks.length > 0) {
      setSavingProfile(false);
      onError(`${requiredBlanks.map(([label]) => label).join(", ")} cannot be empty.`);
      return;
    }
    // Schema-cased key: eventsh's organizer schema field is whatsAppNumber
    // (capital W). Its service accepts both casings, but only the
    // schema-cased one survives mongoose strict mode.
    const payload = {
      ownerName: profile.ownerName,
      organizationName: profile.organizationName,
      email: profile.email,
      businessEmail: profile.businessEmail,
      whatsAppNumber: profile.whatsappNumber,
      phone: profile.phone,
      contactPhones: profile.phoneRows.map((r) => r.phone),
      contactPhoneNames: profile.phoneRows.map((r) => r.label),
      address: profile.address,
      description: profile.description,
      country: profile.country,
      GSTNumber: profile.GSTNumber,
      UENNumber: profile.UENNumber,
      taxPercentage: Number(profile.taxPercentage) || 0,
      businessCategory: profile.businessCategory,
      termsAndConditions: profile.termsAndConditions,
    };
    try {
      const res = await adminFetch(
        `${__API_URL__}/eventsh/organizers/profile/${ORGANIZER_ID}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const body = await res.json().catch(() => null);
      // Empty 200 body = eventsh swallowed an error — treat as failed save.
      if (!res.ok || !(body as { data?: unknown })?.data) {
        throw new Error("The event platform could not save the profile.");
      }
      onMessage("Organizer details saved.");
      await loadProfile();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Could not save the profile.");
    } finally {
      setSavingProfile(false);
    }
  }

  // ---- Local account ----
  async function saveName(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const newName = String(fd.get("name") ?? "");
    setSavingName(true);
    onError("");
    try {
      const res = await adminFetch(`${__API_URL__}/auth/profile`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message || "Could not save your name.");
      }
      onMessage("Profile saved.");
      // The JWT still carries the old name until the next login — that only
      // affects the sidebar display name; refresh for consistency.
      window.location.reload();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Could not save your name.");
    } finally {
      setSavingName(false);
    }
  }

  const isIN = profile?.country === "IN";
  const isSG = profile?.country === "SG";

  return (
    <div className="flex flex-col gap-4">
      {/* ---- Organizer details (eventsh) ---------------------------------- */}
      <Panel className="p-6">
        <h2 className="text-lg">Organizer details</h2>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          The public identity shown on your event pages — stored on the event platform, the same fields as its organizer profile.
        </p>
        {profileUnavailable && (
          <p className="mt-4 text-sm text-[var(--text-muted)]">
            Organizer details are temporarily unavailable — please try again later.
          </p>
        )}
        {!profile && !profileUnavailable && (
          <p className="mt-4 text-sm text-[var(--text-muted)]">Loading…</p>
        )}
        {profile && (
          <form onSubmit={saveProfile} className="mt-5 flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Country" htmlFor="p-country" required>
                <Select
                  id="p-country"
                  value={profile.country.toLowerCase()}
                  onChange={(e) =>
                    // Like eventsh, switching country clears the GST/UEN
                    // fields since they only apply to their own country.
                    updateProfile({ country: e.target.value.toUpperCase(), GSTNumber: "", UENNumber: "" })
                  }
                >
                  {COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code.toLowerCase()}>
                      {c.name} ({c.dialCode})
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Tax %" htmlFor="p-tax" hint="Applied to your tickets at checkout">
                <Input
                  id="p-tax"
                  type="number"
                  min={0}
                  step="0.1"
                  value={profile.taxPercentage}
                  onChange={(e) => updateProfile({ taxPercentage: e.target.value })}
                  placeholder="0"
                />
              </Field>
              {isIN && (
                <Field label="GST number" htmlFor="p-gst" hint="Shown on Indian tax invoices">
                  <Input
                    id="p-gst"
                    value={profile.GSTNumber}
                    onChange={(e) => updateProfile({ GSTNumber: e.target.value })}
                    placeholder="22AAAAA0000A1Z5"
                  />
                </Field>
              )}
              {isSG && (
                <Field label="UEN number" htmlFor="p-uen" hint="e.g. 202012345K">
                  <Input
                    id="p-uen"
                    value={profile.UENNumber}
                    onChange={(e) => updateProfile({ UENNumber: e.target.value })}
                    placeholder="202012345K"
                  />
                </Field>
              )}
              <Field label="Owner name" htmlFor="p-owner" required>
                <Input
                  id="p-owner"
                  value={profile.ownerName}
                  onChange={(e) => updateProfile({ ownerName: e.target.value })}
                  required
                />
              </Field>
              <Field label="Organization name" htmlFor="p-org" required>
                <Input
                  id="p-org"
                  value={profile.organizationName}
                  onChange={(e) => updateProfile({ organizationName: e.target.value })}
                  required
                />
              </Field>
              <Field label="Primary email" htmlFor="p-primary-email" required>
                <Input
                  id="p-primary-email"
                  type="email"
                  value={profile.email}
                  onChange={(e) => updateProfile({ email: e.target.value })}
                  required
                />
              </Field>
              <Field label="Business email" htmlFor="p-biz-email" hint="Receipts and booking notifications go here" required>
                <Input
                  id="p-biz-email"
                  type="email"
                  value={profile.businessEmail}
                  onChange={(e) => updateProfile({ businessEmail: e.target.value })}
                  required
                />
              </Field>
              <PhoneField
                name="whatsappNumber"
                label="WhatsApp number"
                hint="WhatsApp OTP verification is managed in the main eventsh portal"
                required
                value={profile.whatsappNumber}
                onChange={(v) => updateProfile({ whatsappNumber: v })}
              />
              <PhoneField
                name="phone"
                label="Contact phone"
                value={profile.phone}
                onChange={(v) => updateProfile({ phone: v })}
              />
            </div>

            {/* ---- Contact phones (multi) ---------------------------------- */}
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium text-[var(--text-primary)]">Contact phones</p>
              {profile.phoneRows.length === 0 && (
                <p className="text-sm text-[var(--text-muted)]">No contact phones yet.</p>
              )}
              {profile.phoneRows.map((row) => (
                <div key={row.key} className="flex flex-wrap items-end gap-2">
                  <div className="min-w-56 flex-1">
                    <PhoneField
                      name={`contactPhone_${row.key}`}
                      label=""
                      placeholder="9123 4567"
                      value={row.phone}
                      onChange={(v) => updatePhoneRow(row.key, { phone: v })}
                    />
                  </div>
                  <div className="min-w-32 flex-1">
                    <Field label="" htmlFor={`contactPhoneLabel_${row.key}`}>
                      <Input
                        id={`contactPhoneLabel_${row.key}`}
                        value={row.label}
                        onChange={(e) => updatePhoneRow(row.key, { label: e.target.value })}
                        placeholder="Label, e.g. Sales"
                      />
                    </Field>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() =>
                      setProfile((p) =>
                        p ? { ...p, phoneRows: p.phoneRows.filter((r) => r.key !== row.key) } : p
                      )
                    }
                  >
                    Remove
                  </Button>
                </div>
              ))}
              <div>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() =>
                    setProfile((p) =>
                      p
                        ? { ...p, phoneRows: [...p.phoneRows, { key: nextPhoneRowKey(), phone: "", label: "" }] }
                        : p
                    )
                  }
                >
                  Add phone
                </Button>
              </div>
            </div>

            <Field label="Address" htmlFor="p-address">
              <Textarea
                id="p-address"
                rows={3}
                value={profile.address}
                onChange={(e) => updateProfile({ address: e.target.value })}
                placeholder="Street, city, postal code"
              />
            </Field>

            <Field
              label="Category"
              htmlFor="p-category"
              hint="Categories are managed by the platform admin — contact support to add one"
            >
              <Select id="p-category" value={profile.businessCategory} disabled>
                <option value="">Not set</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Description" htmlFor="p-description" hint="About your organization — shown on your event pages">
              <Textarea
                id="p-description"
                rows={4}
                value={profile.description}
                onChange={(e) => updateProfile({ description: e.target.value })}
                placeholder="What you do and why people attend your events…"
              />
            </Field>

            <Field label="Terms & conditions" htmlFor="p-terms" hint="Shown to buyers at checkout">
              <RichTextEditor
                value={profile.termsAndConditions}
                onChange={(html) => updateProfile({ termsAndConditions: html })}
                placeholder="Booking and refund policy…"
              />
            </Field>

            <div>
              <Button type="submit" disabled={savingProfile}>
                {savingProfile ? "Saving…" : "Save organizer details"}
              </Button>
            </div>
          </form>
        )}
      </Panel>

      {/* ---- Local account -------------------------------------------------- */}
      <Panel className="p-6">
        <h2 className="text-lg">Your account</h2>
        <form onSubmit={saveName} className="mt-4 flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name" htmlFor="p-name" required>
              <Input id="p-name" name="name" required defaultValue={name} />
            </Field>
            <Field label="Email (sign-in)" htmlFor="p-email">
              <Input id="p-email" value={email} disabled />
            </Field>
          </div>
          <div>
            <Button type="submit" disabled={savingName}>
              {savingName ? "Saving…" : "Save name"}
            </Button>
          </div>
        </form>
      </Panel>

    </div>
  );
}
