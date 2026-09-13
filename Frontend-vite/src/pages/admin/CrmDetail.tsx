import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { FormSection } from "@/components/admin/AdminForm";
import { PageHeading, Panel } from "@/components/admin/AdminUI";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { PhoneField } from "@/components/ui/PhoneField";
import { Icon } from "@/components/ui/Icon";
import {
  addContactNote,
  deleteContact,
  deleteContactNote,
  fetchContact,
  CONTACT_ROLES,
  updateContact,
  type ContactDoc,
} from "@/lib/crmClient";
import { formatDate } from "@/lib/utils";

const SOURCE_LABELS: Record<string, string> = {
  registration: "Registration",
  enrolment: "Enrolment",
  enquiry: "Enquiry",
  application: "Application",
  message: "Message",
  subscriber: "Subscriber",
  ticket: "Ticket",
  sponsor: "Sponsor",
  feedback: "Feedback",
  "space-booking": "Space booking",
  manual: "Manual",
  import: "Imported",
};

/** Where each source type's real record lives, for the timeline's "view"
 * link. Sources with no dedicated admin list get no link: subscriber, manual
 * and import by design, sponsor because it has no admin screen yet, and
 * feedback because it is only reachable inside the post's own Blog editor
 * panel, not from a list. */
const SOURCE_ADMIN_HREF: Record<string, string> = {
  registration: "/admin/registrations",
  enquiry: "/admin/enquiries",
  application: "/admin/applications",
  message: "/admin/messages",
  ticket: "/admin/events/participants",
};

/** The three enrolment vocabularies, each straight off the Backend entity's
 * own docblock. Label and tone together because they are never wanted apart —
 * the same shape CourseContentList's curriculumStatus returns. */
type Vocab = Record<string, { label: string; tone: BadgeTone }>;

/** Enrolment.status. A confirmed seat carries the same accent weight as the
 * Role badge; a no-show is the only one that costs us a room and a trainer
 * day for nothing. */
const ENROLMENT_STATUS: Vocab = {
  invited: { label: "Invited", tone: "info" },
  confirmed: { label: "Confirmed", tone: "accent" },
  withdrawn: { label: "Withdrawn", tone: "neutral" },
  "no-show": { label: "No-show", tone: "danger" },
  completed: { label: "Completed", tone: "success" },
};

/** Enrolment.paymentStatus — money still owed is the only one worth warning
 * about; waived was a deliberate decision, not an outstanding balance. */
const PAYMENT_STATUS: Vocab = {
  unpaid: { label: "Unpaid", tone: "warn" },
  invoiced: { label: "Invoiced", tone: "info" },
  paid: { label: "Paid", tone: "success" },
  waived: { label: "Waived", tone: "neutral" },
};

/** Enrolment.assessmentOutcome. The vocabulary forks on the run's funding
 * scheme — internal courses are pass/fail, WSQ is Competent / Not Yet
 * Competent — so both halves are spelled out here: a WSQ outcome must never
 * be rendered with internal-course wording. */
const ASSESSMENT_OUTCOME: Vocab = {
  pending: { label: "Assessment pending", tone: "neutral" },
  pass: { label: "Passed", tone: "success" },
  fail: { label: "Failed", tone: "danger" },
  competent: { label: "Competent", tone: "success" },
  "not-yet-competent": { label: "Not yet competent", tone: "warn" },
};

/** Falls back to the raw value rather than dropping the badge: these lists
 * live on the Backend entity, and a value added there should show up here
 * unstyled rather than silently vanish from the record. */
function VocabBadge({ vocab, value }: { vocab: Vocab; value: string }) {
  const known = vocab[value];
  return <Badge tone={known?.tone ?? "neutral"}>{known?.label ?? value}</Badge>;
}

export default function CrmDetail() {
  const { user } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  const [contact, setContact] = useState<ContactDoc | null | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [role, setRole] = useState("");
  const [company, setCompany] = useState("");
  const [tagsText, setTagsText] = useState("");
  const [noteText, setNoteText] = useState("");
  const [noteSaving, setNoteSaving] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const doc = await fetchContact(id);
      setContact(doc);
      setName(doc.name);
      setPhone(doc.phone);
      setWhatsapp(doc.whatsapp);
      setRole(doc.role);
      setCompany(doc.company);
      setTagsText(doc.tags.join(", "));
    } catch {
      setContact(null);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!user) return null;

  if (contact === undefined) {
    return (
      <div className="h-6 w-1/3 animate-pulse rounded bg-[var(--surface-sunken)]" />
    );
  }

  if (contact === null || !id) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <h1 className="text-2xl">Contact not found</h1>
        <Link to="/admin/crm" className="text-sm font-medium text-[var(--accent)] hover:underline">
          Back to CRM
        </Link>
      </div>
    );
  }

  async function handleSave() {
    if (!id) return;
    setSaving(true);
    setError(null);
    try {
      const tags = tagsText
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      const updated = await updateContact(id, {
        name,
        phone,
        whatsapp,
        role,
        company,
        tags,
      });
      setContact(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  }

  async function handleAddNote() {
    if (!id || !noteText.trim()) return;
    setNoteSaving(true);
    try {
      const updated = await addContactNote(id, noteText.trim());
      setContact(updated);
      setNoteText("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add the note.");
    } finally {
      setNoteSaving(false);
    }
  }

  async function handleDeleteNote(noteId: string) {
    if (!id) return;
    const updated = await deleteContactNote(id, noteId);
    setContact(updated);
  }

  async function handleDeleteContact(contactId: string) {
    await deleteContact(contactId);
    navigate("/admin/crm");
  }

  const timeline = [...contact.sources].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeading
        title={contact.name || contact.email}
        description={contact.email}
        action={<DeleteButton id={contact._id} action={handleDeleteContact} label={contact.name || contact.email} />}
      />

      {error && (
        <p role="alert" className="text-sm font-medium text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <FormSection title="Details">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Name" htmlFor="c-name">
                <Input id="c-name" value={name} onChange={(e) => setName(e.target.value)} />
              </Field>
              <Field label="Role" htmlFor="c-role" hint="Student, Customer, Trainer… or your own.">
                {/* Free-text with suggestions — see CONTACT_ROLES. */}
                <Input
                  id="c-role"
                  list="crm-role-options"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                />
                <datalist id="crm-role-options">
                  {CONTACT_ROLES.map((r) => (
                    <option key={r} value={r} />
                  ))}
                </datalist>
              </Field>
              {/* PhoneField, not a bare Input — see CrmNew. */}
              <PhoneField
                name="phone"
                label="Contact number"
                value={phone}
                onChange={setPhone}
              />
              <PhoneField
                name="whatsapp"
                label="WhatsApp number"
                value={whatsapp}
                onChange={setWhatsapp}
              />
              <Field label="Company" htmlFor="c-company">
                <Input id="c-company" value={company} onChange={(e) => setCompany(e.target.value)} />
              </Field>
            </div>
            <Field label="Tags" htmlFor="c-tags" hint="Comma-separated.">
              <Input
                id="c-tags"
                value={tagsText}
                onChange={(e) => setTagsText(e.target.value)}
                placeholder="vip, repeat-customer"
              />
            </Field>
            <div>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Saving…" : "Save changes"}
              </Button>
            </div>
          </FormSection>

          {/* The structured roster, deliberately in the main column rather than
              beside Activity: Activity is the raw sources[] log of everything
              this person has ever done, this is the answer to "what have they
              taken with us", and an admin should have it before writing a note
              about it. */}
          <FormSection
            title="Courses"
            description="Every programme this person has enquired about or taken a seat on."
          >
            <div className="flex flex-col gap-3">
              {contact.courses.length === 0 && (
                <p className="text-sm text-[var(--text-muted)]">No courses yet.</p>
              )}
              {contact.courses.map((course) => {
                // Both stamps through formatDate before comparing: two records
                // hours apart are one day to the reader, and "12 Sep 2026 –
                // 12 Sep 2026" is not a span.
                const first = formatDate(course.firstAt);
                const last = formatDate(course.lastAt);
                return (
                  <div
                    key={course.trainingId}
                    className="rounded-xl border border-[var(--border-subtle)] p-3"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      {/* A null slug means the programme has been deleted —
                          TrainingsService.remove leaves its registrations and
                          enrolments pointing at nothing, so there is no editor
                          page left to link to. */}
                      {course.slug ? (
                        <Link
                          to={`/admin/trainings/${course.trainingId}`}
                          className="text-sm font-medium text-[var(--text-primary)] hover:text-[var(--accent)]"
                        >
                          {course.title}
                        </Link>
                      ) : (
                        <span className="text-sm font-medium text-[var(--text-primary)]">
                          {course.title}
                        </span>
                      )}
                      <div className="flex flex-wrap gap-1">
                        {course.enquiryCount > 0 && (
                          <Badge tone="neutral">
                            Enquired
                            {course.enquiryCount > 1 && ` ×${course.enquiryCount}`}
                          </Badge>
                        )}
                        {course.enrolmentCount > 0 && (
                          <Badge tone="accent">
                            Enrolled
                            {course.enrolmentCount > 1 && ` ×${course.enrolmentCount}`}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* The seat's own state, and only when there is a seat —
                        the four fields are null together. */}
                    {course.enrolmentCount > 0 && (
                      <div className="mt-2 flex flex-wrap items-center gap-1">
                        {course.status && (
                          <VocabBadge vocab={ENROLMENT_STATUS} value={course.status} />
                        )}
                        {course.paymentStatus && (
                          <VocabBadge vocab={PAYMENT_STATUS} value={course.paymentStatus} />
                        )}
                        {course.assessmentOutcome && (
                          <VocabBadge
                            vocab={ASSESSMENT_OUTCOME}
                            value={course.assessmentOutcome}
                          />
                        )}
                        {/* attendancePct defaults to 0 and stays there until
                            the run has actually happened — "0% attended" on a
                            confirmed future seat is noise, not information. */}
                        {course.attendancePct !== null && course.attendancePct > 0 && (
                          <span className="text-xs text-[var(--text-muted)]">
                            {course.attendancePct}% attended
                          </span>
                        )}
                      </div>
                    )}

                    <p className="mt-2 text-xs text-[var(--text-muted)]">
                      {course.runCodes.length > 0 && <>{course.runCodes.join(", ")} · </>}
                      {first}
                      {last !== first && <> – {last}</>}
                    </p>
                  </div>
                );
              })}
            </div>
          </FormSection>

          <FormSection title="Notes">
            <div className="flex flex-col gap-3">
              {contact.notes.length === 0 && (
                <p className="text-sm text-[var(--text-muted)]">No notes yet.</p>
              )}
              {[...contact.notes]
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .map((n) => (
                  <div
                    key={n._id}
                    className="rounded-xl border border-[var(--border-subtle)] p-3"
                  >
                    <p className="text-sm text-[var(--text-primary)]">{n.text}</p>
                    <div className="mt-2 flex items-center justify-between text-xs text-[var(--text-muted)]">
                      <span>
                        {n.authorName} · {formatDate(n.createdAt)}
                      </span>
                      <button
                        type="button"
                        onClick={() => void handleDeleteNote(n._id)}
                        className="text-[var(--text-muted)] hover:text-red-600 dark:hover:text-red-400"
                      >
                        <Icon name="trash" size={13} />
                      </button>
                    </div>
                  </div>
                ))}
            </div>
            <Textarea
              rows={3}
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Add a note…"
            />
            <div>
              <Button variant="secondary" size="sm" onClick={handleAddNote} disabled={noteSaving || !noteText.trim()}>
                {noteSaving ? "Adding…" : "Add note"}
              </Button>
            </div>
          </FormSection>
        </div>

        <div className="flex flex-col gap-6">
          <FormSection title="Activity">
            <div className="flex flex-col gap-3">
              {timeline.map((s, i) => {
                const href = SOURCE_ADMIN_HREF[s.type];
                return (
                  <div key={i} className="flex flex-col gap-1 border-l-2 border-[var(--border-subtle)] pl-3">
                    <div className="flex items-center gap-2">
                      <Badge tone="neutral">{SOURCE_LABELS[s.type] ?? s.type}</Badge>
                      <span className="text-xs text-[var(--text-muted)]">{formatDate(s.createdAt)}</span>
                    </div>
                    {href ? (
                      <Link
                        to={href}
                        className="text-sm text-[var(--text-primary)] hover:text-[var(--accent)]"
                      >
                        {s.label}
                      </Link>
                    ) : (
                      <span className="text-sm text-[var(--text-primary)]">{s.label}</span>
                    )}
                  </div>
                );
              })}
            </div>
          </FormSection>

          <Panel className="p-5 text-sm text-[var(--text-secondary)]">
            <p>First seen: {formatDate(contact.firstSeenAt)}</p>
            <p className="mt-1">Last activity: {formatDate(contact.lastActivityAt)}</p>
          </Panel>
        </div>
      </div>
    </div>
  );
}
