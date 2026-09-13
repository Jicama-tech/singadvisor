import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { adminFetch } from "@/lib/adminFetch";
import { AdminEmpty, PageHeading, Panel, TableWrap, Td, Th } from "@/components/admin/AdminUI";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { Badge } from "@/components/ui/Badge";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Input, Select } from "@/components/ui/Field";
import {
  CONTACT_ROLES,
  crmExportPath,
  deleteContact,
  fetchContacts,
  importContacts,
  runCrmBackfill,
  updateContact,
  type ContactListItem,
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

/** The /trainings/admin payload, narrowed to what the programme filter needs
 * — same narrowing CourseContentList applies to the same endpoint. */
type AdminTraining = { _id: string; title: string };

export default function CrmList() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const q = searchParams.get("q") ?? "";
  const source = searchParams.get("source") ?? "";
  const role = searchParams.get("role") ?? "";
  const training = searchParams.get("training") ?? "";

  const [contacts, setContacts] = useState<ContactListItem[] | null>(null);
  const [trainings, setTrainings] = useState<AdminTraining[]>([]);
  const [backfilling, setBackfilling] = useState(false);
  const [backfillMsg, setBackfillMsg] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const data = await fetchContacts({ q, source, role, training }).catch(() => []);
    setContacts(data);
  }, [q, source, role, training]);

  // Loaded once from /trainings/admin, NOT derived from the contacts on
  // screen: filtering to a programme excludes everyone who does not have it,
  // so a derived list would drop its own selected option — the same trap the
  // roleOptions memo below works around.
  useEffect(() => {
    void (async () => {
      const res = await adminFetch(`${__API_URL__}/trainings/admin`);
      if (res.ok) setTrainings((await res.json()) as AdminTraining[]);
    })();
  }, []);

  // The presets plus whatever roles the data actually holds — imported
  // spreadsheets and hand-typed values are free-form, so the filter has to
  // offer roles nobody predicted. Deduped case-insensitively so "student"
  // from a spreadsheet does not sit next to the preset "Student".
  const roleOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const r of CONTACT_ROLES) seen.set(r.toLowerCase(), r);
    for (const c of contacts ?? []) {
      const r = c.role?.trim();
      if (r && !seen.has(r.toLowerCase())) seen.set(r.toLowerCase(), r);
    }
    // The current filter may name a role that no loaded contact has (the
    // filter itself excluded them), so keep it in the list or the Select
    // would silently fall back to "All roles".
    if (role && !seen.has(role.toLowerCase())) seen.set(role.toLowerCase(), role);
    return [...seen.values()].sort((a, b) => a.localeCompare(b));
  }, [contacts, role]);

  // Alphabetical, not the /trainings/admin order (updatedAt descending) — a
  // filter is scanned by name, not by when someone last edited the brochure.
  // A selected programme that has since been deleted is appended for the same
  // reason roleOptions keeps its own: otherwise the Select falls back to "All
  // programmes" while the Backend carries on filtering by it.
  const trainingOptions = useMemo(() => {
    const options = [...trainings].sort((a, b) => a.title.localeCompare(b.title));
    if (training && !options.some((t) => t._id === training)) {
      const deleted = (contacts ?? [])
        .flatMap((c) => c.courses)
        .find((c) => c.trainingId === training);
      // The Backend keeps Registration's title snapshot for exactly this.
      options.push({ _id: training, title: deleted?.title ?? "Deleted programme" });
    }
    return options;
  }, [trainings, training, contacts]);

  useEffect(() => {
    void load();
  }, [load]);

  function setFilter(key: string, value: string) {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    setSearchParams(next);
  }

  async function remove(id: string) {
    await deleteContact(id);
    await load();
  }

  async function handleBackfill() {
    setBackfilling(true);
    setBackfillMsg(null);
    try {
      const { scanned } = await runCrmBackfill();
      setBackfillMsg(`Scanned ${scanned} existing record${scanned === 1 ? "" : "s"}.`);
      await load();
    } catch (err) {
      setBackfillMsg(err instanceof Error ? err.message : "Backfill failed.");
    } finally {
      setBackfilling(false);
    }
  }

  async function handleExport() {
    setExporting(true);
    try {
      const res = await adminFetch(
        `${__API_URL__}${crmExportPath({ q, source, role, training })}`,
      );
      if (!res.ok) {
        window.alert("Could not export contacts.");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const w = window.open(url, "_blank", "noopener,noreferrer");
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
      if (w) w.opener = null;
    } finally {
      setExporting(false);
    }
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setImporting(true);
    setImportMsg(null);
    try {
      const { imported, skipped, errors } = await importContacts(file);
      let msg = `Imported ${imported} contact${imported === 1 ? "" : "s"}.`;
      if (skipped) msg += ` Skipped ${skipped} row${skipped === 1 ? "" : "s"}.`;
      if (errors.length) msg += ` ${errors.slice(0, 3).join(" ")}${errors.length > 3 ? " …" : ""}`;
      setImportMsg(msg);
      await load();
    } catch (err) {
      setImportMsg(err instanceof Error ? err.message : "Import failed.");
    } finally {
      setImporting(false);
    }
  }

  if (!user) return null;

  return (
    <div className="flex flex-col gap-8">
      <PageHeading
        title="CRM"
        description={`${contacts?.length ?? "…"} contact${contacts?.length === 1 ? "" : "s"}`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" size="sm" onClick={handleBackfill} disabled={backfilling}>
              <Icon name="scan" size={15} />
              {backfilling ? "Scanning…" : "Backfill from existing data"}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => importInputRef.current?.click()}
              disabled={importing}
            >
              <Icon name="upload" size={15} />
              {importing ? "Importing…" : "Import CSV / Excel"}
            </Button>
            <input
              ref={importInputRef}
              type="file"
              accept=".csv,.xlsx,.xls,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              hidden
              onChange={handleImportFile}
            />
            <Button variant="secondary" size="sm" onClick={handleExport} disabled={exporting}>
              <Icon name="download" size={15} />
              {exporting ? "Exporting…" : "Export CSV"}
            </Button>
            <ButtonLink to="/admin/crm/new" size="sm">
              <Icon name="plus" size={16} />
              New contact
            </ButtonLink>
          </div>
        }
      />

      {backfillMsg && (
        <p role="status" className="text-sm text-[var(--text-secondary)]">
          {backfillMsg}
        </p>
      )}
      {importMsg && (
        <p role="status" className="text-sm text-[var(--text-secondary)]">
          {importMsg}
        </p>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <form
          className="flex gap-2 sm:w-80"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            setFilter("q", String(fd.get("q") ?? "").trim());
          }}
        >
          <label htmlFor="crm-search" className="sr-only">
            Search contacts
          </label>
          <Input id="crm-search" name="q" type="search" defaultValue={q} placeholder="Search name, email, phone…" />
          <Button type="submit" variant="secondary" aria-label="Search">
            <Icon name="search" size={16} />
          </Button>
        </form>

        {/* Wraps rather than overflowing — three selects no longer fit beside
            the search box on a laptop. */}
        <div className="flex flex-wrap gap-2">
          <label htmlFor="crm-role" className="sr-only">
            Filter by role
          </label>
          <Select
            id="crm-role"
            value={role}
            onChange={(e) => setFilter("role", e.target.value)}
            className="sm:w-44"
          >
            <option value="">All roles</option>
            {roleOptions.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </Select>

          <label htmlFor="crm-source" className="sr-only">
            Filter by source
          </label>
          <Select
            id="crm-source"
            value={source}
            onChange={(e) => setFilter("source", e.target.value)}
            className="sm:w-56"
          >
            <option value="">All sources</option>
            {Object.entries(SOURCE_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </Select>

          <label htmlFor="crm-training" className="sr-only">
            Filter by programme
          </label>
          {/* Resolved server-side across both registrations and enrolments, so
              it stays true as the list grows and the CSV export honours it. */}
          <Select
            id="crm-training"
            value={training}
            onChange={(e) => setFilter("training", e.target.value)}
            className="sm:w-56"
          >
            <option value="">All programmes</option>
            {trainingOptions.map((t) => (
              <option key={t._id} value={t._id}>
                {t.title}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <Panel>
        {contacts && contacts.length === 0 ? (
          <AdminEmpty message="No contacts yet — they'll appear automatically as people register, enquire, apply, message or subscribe, or run the backfill above to pull in what's already there." />
        ) : (
          <TableWrap>
            <thead>
              <tr>
                <Th>Contact</Th>
                <Th>Role</Th>
                <Th>Company</Th>
                {/* Courses (what they did with us) beside Sources (how they
                    got here); Actions stays last. */}
                <Th>Courses</Th>
                <Th>Sources</Th>
                <Th>Last activity</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {(contacts ?? []).map((c) => {
                const sourceTypes = [...new Set(c.sources.map((s) => s.type))];
                return (
                  <tr key={c._id} className="hover:bg-[var(--surface-sunken)]">
                    <Td>
                      <Link
                        to={`/admin/crm/${c._id}`}
                        className="font-medium text-[var(--text-primary)] hover:text-[var(--accent)]"
                      >
                        {c.name || c.email}
                      </Link>
                      {c.name && (
                        <span className="block text-xs text-[var(--text-muted)]">{c.email}</span>
                      )}
                      {(c.phone || c.whatsapp) && (
                        <span className="block text-xs text-[var(--text-muted)]">
                          {c.phone}
                          {c.phone && c.whatsapp && c.whatsapp !== c.phone && " · WA "}
                          {c.whatsapp !== c.phone ? c.whatsapp : ""}
                        </span>
                      )}
                    </Td>
                    <Td>
                      {c.role ? <Badge tone="accent">{c.role}</Badge> : <span className="text-[var(--text-muted)]">—</span>}
                    </Td>
                    <Td className="text-[var(--text-secondary)]">{c.company || "—"}</Td>
                    <Td>
                      {c.courses.length === 0 ? (
                        <span className="text-[var(--text-muted)]">—</span>
                      ) : (
                        // No flex-wrap and a hard cap per badge: a person with
                        // eight programmes must not make their row eight lines
                        // tall. The two shown are the two most recent — the
                        // Backend already sorts a contact's courses by lastAt
                        // descending — and the rest become a count.
                        <div className="flex items-center gap-1">
                          {c.courses.slice(0, 2).map((course) => (
                            <Badge
                              key={course.trainingId}
                              tone={course.enrolled ? "accent" : "neutral"}
                              className="max-w-[9rem]"
                            >
                              <span className="min-w-0 truncate">{course.title}</span>
                            </Badge>
                          ))}
                          {c.courses.length > 2 && (
                            <span className="shrink-0 text-xs text-[var(--text-muted)]">
                              +{c.courses.length - 2}
                            </span>
                          )}
                        </div>
                      )}
                    </Td>
                    <Td>
                      <div className="flex flex-wrap gap-1">
                        {sourceTypes.map((t) => (
                          <Badge key={t} tone="neutral">
                            {SOURCE_LABELS[t] ?? t}
                          </Badge>
                        ))}
                      </div>
                    </Td>
                    <Td className="text-[var(--text-secondary)]">
                      {formatDate(c.lastActivityAt)}
                    </Td>
                    <Td>
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          to={`/admin/crm/${c._id}`}
                          aria-label={`View ${c.name || c.email}`}
                          className="grid h-8 w-8 place-items-center rounded-lg text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-sunken)] hover:text-[var(--accent)]"
                        >
                          <Icon name="external" size={15} />
                        </Link>
                        <DeleteButton id={c._id} action={remove} label={c.name || c.email} />
                      </div>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </TableWrap>
        )}
      </Panel>
    </div>
  );
}
