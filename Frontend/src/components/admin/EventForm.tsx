"use client";

import { useState, type ChangeEvent } from "react";
import Link from "next/link";
import { saveEvent } from "@/app/admin/actions";
import { AdminForm, FormSection, Toggle } from "@/components/admin/AdminForm";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { withEventshUrl } from "@/lib/media-url";
import type { EventRow, SpeakerProfile, SponsorType, VisitorFeatureAccess } from "@/lib/events-client";

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
  return {
    key: nextKey(),
    id: "",
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

const AGE_OPTIONS = ["All Ages", "13+", "16+", "18+", "21+"];

const FEATURE_FLAGS: { key: string; label: string }[] = [
  { key: "food", label: "Food provided" },
  { key: "parking", label: "Parking available" },
  { key: "wifi", label: "Wi-Fi" },
  { key: "photography", label: "Photography" },
  { key: "security", label: "Security on site" },
  { key: "accessibility", label: "Wheelchair accessible" },
];

/**
 * Every field eventsh-v1's own admin event form exposes, grouped into the
 * same tab-wise layout its own form uses (Basic Info / Media / Visitors /
 * Venue, ...) — the field set and organization are ported from there, but
 * every input here is SingAdvisor's own `FormSection`/`Field`/`Toggle`
 * design system, not eventsh's UI. Tabs eventsh-v1 has that depend on
 * domains not built yet in this port (Volunteers, Seating, Spaces,
 * Speakers-as-applications, Workshops, Round Tables, Sponsors, Schedule,
 * Space Layout — see the event-ops port plan's later phases) are
 * deliberately not reproduced: a tab with no working Backend behind it would
 * be worse than not showing it. "Programme" and "Policies & extras" are this
 * form's own grouping for fields the Backend already models (event.entity.ts)
 * that eventsh-v1 splits differently across its much larger Basic Info tab.
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

  const [tiers, setTiers] = useState<TierRow[]>(initialTiers);
  const [sections, setSections] = useState<SectionRow[]>(initialSections);
  const [ageRows, setAgeRows] = useState<AgeRow[]>(initialAgeRows);
  const [speakerRows, setSpeakerRows] = useState<SpeakerRow[]>(initialSpeakers);
  const [sponsorRows, setSponsorRows] = useState<SponsorRow[]>(initialSponsors);
  const [volunteerRows, setVolunteerRows] = useState<VolunteerRow[]>(initialVolunteers);
  const [speakerSlotRows, setSpeakerSlotRows] = useState<SpeakerSlotRow[]>(initialSpeakerSlots);
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
  const [hasVolunteers, setHasVolunteers] = useState(
    Boolean(event?.features?.hasVolunteers) || (event?.volunteers.length ?? 0) > 0,
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

  function updateSpeakerSlot(key: string, patch: Partial<SpeakerSlotRow>) {
    setSpeakerSlotRows((rows) => rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }
  function addSpeakerSlot() {
    setSpeakerSlotRows((rows) => [...rows, emptySpeakerSlotRow()]);
  }
  function removeSpeakerSlot(key: string) {
    setSpeakerSlotRows((rows) => rows.filter((r) => r.key !== key));
  }

  const agendaLines = (event?.agenda ?? []).map((a) => `${a.time} | ${a.title}`).join("\n");
  const speakersLines = (event?.speakers ?? []).join("\n");
  const tagsLine = (event?.tags ?? []).join(", ");
  const galleryLines = (event?.gallery ?? []).join("\n");
  const reelLines = (event?.reelLinks ?? []).join("\n");
  const social = event?.socialMedia ?? {};
  const features = event?.features ?? {};

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
            <input type="hidden" name="speakerSlotCount" value={speakerSlotRows.length} />

            <Tabs defaultValue="basic">
              <TabsList>
                <TabsTrigger value="basic">Basic Info</TabsTrigger>
                <TabsTrigger value="schedule">Schedule &amp; Venue</TabsTrigger>
                <TabsTrigger value="tickets">Tickets</TabsTrigger>
                <TabsTrigger value="media">Media</TabsTrigger>
                <TabsTrigger value="programme">Programme</TabsTrigger>
                {hasSpeakers && <TabsTrigger value="speakers">Speakers</TabsTrigger>}
                {hasSponsors && <TabsTrigger value="sponsors">Sponsors</TabsTrigger>}
                {hasVolunteers && <TabsTrigger value="volunteers">Volunteers</TabsTrigger>}
                <TabsTrigger value="policies">Policies &amp; extras</TabsTrigger>
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
                </div>
              </TabsContent>

              {/* ---- Schedule & Venue ------------------------------------------ */}
              <TabsContent value="schedule" className="mt-6">
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

                <FormSection
                  title="Event modules"
                  description="Turn on the extras this event actually uses — its tab appears once switched on. Off by default so the form doesn't show tabs with nothing in them."
                >
                  <input type="hidden" name="feature_hasSpeakers" value={hasSpeakers ? "on" : ""} />
                  <input type="hidden" name="feature_hasSponsors" value={hasSponsors ? "on" : ""} />
                  <input type="hidden" name="feature_hasVolunteers" value={hasVolunteers ? "on" : ""} />
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
                        checked={hasVolunteers}
                        onChange={(e) => setHasVolunteers(e.target.checked)}
                        className="mt-0.5 h-4 w-4 shrink-0 rounded border-[var(--border-strong)] accent-[var(--accent)]"
                      />
                      <span>
                        <span className="block text-sm font-medium text-[var(--text-primary)]">Volunteers</span>
                        <span className="block text-xs text-[var(--text-muted)]">
                          A contact list for door/scanner access — name, email, phone.
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
                  <Field label="Currency" htmlFor="e-currency" className="max-w-32">
                    <Select id="e-currency" name="currency" defaultValue={values.currency ?? event?.currency ?? "SGD"}>
                      <option value="SGD">SGD</option>
                      <option value="USD">USD</option>
                      <option value="INR">INR</option>
                    </Select>
                  </Field>

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
                          <div id={`tier${i}-features`} className="flex flex-wrap gap-x-5 gap-y-2">
                            {(
                              [
                                ["food", "Food"],
                                ["parking", "Parking"],
                                ["wifi", "Wi-Fi"],
                                ["photography", "Photography"],
                                ["security", "Security"],
                                ["accessibility", "Accessibility"],
                              ] as const
                            ).map(([key, label]) => (
                              <label key={key} className="flex items-center gap-2 text-sm">
                                <input
                                  type="checkbox"
                                  name={`tier${i}Feature_${key}`}
                                  checked={tier.featureAccess[key]}
                                  onChange={(e) =>
                                    updateTier(tier.key, {
                                      featureAccess: { ...tier.featureAccess, [key]: e.target.checked },
                                    })
                                  }
                                  className="h-4 w-4 rounded border-[var(--border-strong)] accent-[var(--accent)]"
                                />
                                {label}
                              </label>
                            ))}
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

                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Facebook" htmlFor="e-facebook">
                        <Input id="e-facebook" name="facebook" defaultValue={values.facebook ?? social.facebook} />
                      </Field>
                      <Field label="Instagram" htmlFor="e-instagram">
                        <Input id="e-instagram" name="instagram" defaultValue={values.instagram ?? social.instagram} />
                      </Field>
                      <Field label="Twitter / X" htmlFor="e-twitter">
                        <Input id="e-twitter" name="twitter" defaultValue={values.twitter ?? social.twitter} />
                      </Field>
                      <Field label="LinkedIn" htmlFor="e-linkedin">
                        <Input id="e-linkedin" name="linkedin" defaultValue={values.linkedin ?? social.linkedin} />
                      </Field>
                    </div>
                  </FormSection>
                </div>
              </TabsContent>

              {/* ---- Programme --------------------------------------------------- */}
              <TabsContent value="programme" className="mt-6">
                <FormSection title="Programme">
                  <Field label="Speakers" htmlFor="e-speakers" hint="One name per line." error={errors.speakers}>
                    <Textarea id="e-speakers" name="speakers" rows={4} defaultValue={values.speakers ?? speakersLines} />
                  </Field>
                  <Field
                    label="Agenda"
                    htmlFor="e-agenda"
                    hint="One row per line, formatted as: time | item"
                    error={errors.agenda}
                  >
                    <Textarea
                      id="e-agenda"
                      name="agenda"
                      rows={6}
                      defaultValue={values.agenda ?? agendaLines}
                      placeholder={"9:00 am | Registration\n9:30 am | Opening session"}
                    />
                  </Field>
                </FormSection>
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

              {/* ---- Policies & extras -------------------------------------------- */}
              <TabsContent value="policies" className="mt-6">
                <div className="flex flex-col gap-6">
                  <FormSection title="Attendee info">
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

                  <FormSection title="Amenities">
                    <div className="grid gap-3 sm:grid-cols-2">
                      {FEATURE_FLAGS.map((f) => (
                        <Toggle
                          key={f.key}
                          name={`feature_${f.key}`}
                          label={f.label}
                          defaultChecked={
                            submitted ? values[`feature_${f.key}`] === "on" : Boolean(features[f.key])
                          }
                        />
                      ))}
                    </div>
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
                </div>
              </TabsContent>
            </Tabs>
          </div>
        );
      }}
    </AdminForm>
  );
}
