import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { adminFetch } from "@/lib/adminFetch";
import { AdminEmpty, PageHeading, Panel, TableWrap, Td, Th } from "@/components/admin/AdminUI";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { StatusSelect } from "@/components/admin/StatusSelect";
import { Badge } from "@/components/ui/Badge";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Input, Select } from "@/components/ui/Field";
import {
  CONTACT_ROLES,
  LEAD_STATUSES,
  crmExportPath,
  deleteContact,
  fetchContacts,
  importContacts,
  runCrmBackfill,
  updateContact,
  type ContactDoc,
} from "@/lib/crmClient";
import { cn, formatDate } from "@/lib/utils";

const SOURCE_LABELS: Record<string, string> = {
  registration: "Registration",
  enquiry: "Enquiry",
  application: "Application",
  message: "Message",
  subscriber: "Subscriber",
  ticket: "Ticket",
  sponsor: "Sponsor",
  feedback: "Feedback",
  manual: "Manual",
  import: "Imported",
};

export default function CrmList() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const q = searchParams.get("q") ?? "";
  const leadStatus = searchParams.get("leadStatus") ?? "";
  const source = searchParams.get("source") ?? "";
  const role = searchParams.get("role") ?? "";

  const [contacts, setContacts] = useState<ContactDoc[] | null>(null);
  const [backfilling, setBackfilling] = useState(false);
  const [backfillMsg, setBackfillMsg] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const data = await fetchContacts({ q, leadStatus, source, role }).catch(() => []);
    setContacts(data);
  }, [q, leadStatus, source, role]);

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

  async function setLeadStatus(id: string, status: string) {
    await updateContact(id, { leadStatus: status });
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
        `${__API_URL__}${crmExportPath({ q, leadStatus, source, role })}`,
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

        <div className="flex gap-2">
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
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Chip active={!leadStatus} onClick={() => setFilter("leadStatus", "")}>
          All statuses
        </Chip>
        {LEAD_STATUSES.map((s) => (
          <Chip key={s} active={leadStatus === s} onClick={() => setFilter("leadStatus", s)}>
            {s}
          </Chip>
        ))}
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
                <Th>Sources</Th>
                <Th>Lead status</Th>
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
                      <div className="flex flex-wrap gap-1">
                        {sourceTypes.map((t) => (
                          <Badge key={t} tone="neutral">
                            {SOURCE_LABELS[t] ?? t}
                          </Badge>
                        ))}
                      </div>
                    </Td>
                    <Td>
                      <StatusSelect
                        id={c._id}
                        value={c.leadStatus}
                        options={LEAD_STATUSES}
                        action={setLeadStatus}
                        label={`Lead status for ${c.name || c.email}`}
                      />
                    </Td>
                    <Td className="text-[var(--text-secondary)]">{formatDate(c.lastActivityAt)}</Td>
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

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "true" : undefined}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium capitalize transition-colors",
        active
          ? "bg-[var(--accent)] text-[var(--accent-foreground)]"
          : "surface-sunken text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
      )}
    >
      {children}
    </button>
  );
}
