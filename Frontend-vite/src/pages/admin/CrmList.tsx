import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { adminFetch } from "@/lib/adminFetch";
import { AdminEmpty, PageHeading, Panel, TableWrap, Td, Th } from "@/components/admin/AdminUI";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { StatusSelect } from "@/components/admin/StatusSelect";
import { Badge } from "@/components/ui/Badge";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Input } from "@/components/ui/Field";
import {
  LEAD_STATUSES,
  crmExportPath,
  deleteContact,
  fetchContacts,
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
  manual: "Manual",
};

export default function CrmList() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const q = searchParams.get("q") ?? "";
  const leadStatus = searchParams.get("leadStatus") ?? "";
  const source = searchParams.get("source") ?? "";

  const [contacts, setContacts] = useState<ContactDoc[] | null>(null);
  const [backfilling, setBackfilling] = useState(false);
  const [backfillMsg, setBackfillMsg] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async () => {
    const data = await fetchContacts({ q, leadStatus, source }).catch(() => []);
    setContacts(data);
  }, [q, leadStatus, source]);

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
      const res = await adminFetch(`${__API_URL__}${crmExportPath({ q, leadStatus, source })}`);
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
          <Input id="crm-search" name="q" type="search" defaultValue={q} placeholder="Search name, email, company…" />
          <Button type="submit" variant="secondary" aria-label="Search">
            <Icon name="search" size={16} />
          </Button>
        </form>

        <div className="flex flex-wrap gap-2">
          <Chip active={!source} onClick={() => setFilter("source", "")}>
            All sources
          </Chip>
          {Object.entries(SOURCE_LABELS).map(([key, label]) => (
            <Chip key={key} active={source === key} onClick={() => setFilter("source", key)}>
              {label}
            </Chip>
          ))}
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
