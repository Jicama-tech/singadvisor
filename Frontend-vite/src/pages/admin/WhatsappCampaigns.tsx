import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { adminFetch } from "@/lib/adminFetch";
import { AdminEmpty, PageHeading, Panel, TableWrap, Td, Th } from "@/components/admin/AdminUI";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { formatDateTime } from "@/lib/utils";

type BroadcastStatus = "queued" | "sending" | "sent" | "failed" | "cancelled";

type BroadcastRow = {
  _id: string;
  name: string;
  message: string;
  audience: "members" | "contacts" | "tag" | "manual";
  tag: string | null;
  status: BroadcastStatus;
  sentFrom: string | null;
  sentCount: number;
  failedCount: number;
  skippedCount: number;
  lastError: string | null;
  createdAt?: string;
  startedAt: string | null;
  finishedAt: string | null;
};

type Preview = {
  total: number;
  willSend: number;
  willSkip: number;
  sample: { name: string; phone: string; status: string; reason: string | null }[];
};

const STATUS_TONE: Record<BroadcastStatus, BadgeTone> = {
  queued: "neutral",
  sending: "warn",
  sent: "success",
  failed: "danger",
  cancelled: "neutral",
};

/**
 * WhatsApp campaigns.
 *
 * The shape of this page follows from one fact: a WhatsApp message cannot be
 * unsent, and it lands on somebody's personal phone. So the flow is
 * deliberately two-step — you ask who this would reach, see the count and a
 * sample, and only then send. There is no one-click send, and the confirm
 * names the number of people.
 *
 * A campaign is paced at roughly one message every few seconds, so a send is
 * a thing that runs for minutes. The list refreshes while one is in flight
 * rather than pretending it completed.
 */
export default function WhatsappCampaigns() {
  const { user } = useAuth();
  const { confirm, confirmDialog } = useConfirm();

  const [rows, setRows] = useState<BroadcastRow[] | null>(null);
  const [connected, setConnected] = useState<boolean | null>(null);
  const [sendingFrom, setSendingFrom] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [audience, setAudience] = useState<BroadcastRow["audience"]>("members");
  const [tag, setTag] = useState("");
  const [numbers, setNumbers] = useState("");

  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [listRes, statusRes] = await Promise.all([
      adminFetch(`${__API_URL__}/whatsapp/broadcasts`),
      adminFetch(`${__API_URL__}/whatsapp/status`),
    ]);
    if (listRes.ok) setRows((await listRes.json()) as BroadcastRow[]);
    if (statusRes.ok) {
      const s = (await statusRes.json()) as { status: string; number: string | null };
      setConnected(s.status === "connected");
      setSendingFrom(s.number);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // A campaign in flight changes its counts every few seconds.
  const inFlight = (rows ?? []).some((r) => r.status === "sending" || r.status === "queued");
  useEffect(() => {
    if (!inFlight) return;
    const id = setInterval(() => void load(), 4000);
    return () => clearInterval(id);
  }, [inFlight, load]);

  /** The request body both preview and send use, so the two can never disagree
   * about who the audience is. */
  function body() {
    return {
      name: name.trim(),
      message,
      audience,
      ...(audience === "tag" ? { tag: tag.trim() } : {}),
      ...(audience === "manual"
        ? {
            numbers: numbers
              .split(/[\n,]/)
              .map((n) => n.trim())
              .filter(Boolean),
          }
        : {}),
    };
  }

  async function runPreview() {
    setBusy(true);
    setError(null);
    setPreview(null);
    try {
      const res = await adminFetch(`${__API_URL__}/whatsapp/broadcasts/preview`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body()),
      });
      const data = (await res.json().catch(() => null)) as (Preview & { message?: string }) | null;
      if (!res.ok) {
        setError(data?.message ?? "Could not work out who that would reach.");
        return;
      }
      setPreview(data);
    } finally {
      setBusy(false);
    }
  }

  async function send() {
    if (!preview) return;
    const agreed = await confirm({
      title: `Send to ${preview.willSend} ${preview.willSend === 1 ? "person" : "people"}?`,
      message: `This goes out on WhatsApp from ${sendingFrom ? `+${sendingFrom}` : "the linked phone"}, and cannot be unsent.`,
      detail:
        "Messages are spaced a few seconds apart, so this runs for a while. You can watch it in the list below.",
      confirmLabel: "Send now",
      tone: "danger",
    });
    if (!agreed) return;

    setBusy(true);
    setError(null);
    try {
      const res = await adminFetch(`${__API_URL__}/whatsapp/broadcasts`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body()),
      });
      const data = (await res.json().catch(() => null)) as { message?: string } | null;
      if (!res.ok) {
        setError(data?.message ?? "It did not start.");
        return;
      }
      setName("");
      setMessage("");
      setNumbers("");
      setPreview(null);
      await load();
    } finally {
      setBusy(false);
    }
  }

  if (!user) return null;

  const canCompose = name.trim().length > 0 && message.trim().length > 0;

  return (
    <div className="flex flex-col gap-8">
      <PageHeading
        title="WhatsApp campaigns"
        description={
          connected === false
            ? "No phone is linked — pair one under Settings → WhatsApp before sending."
            : sendingFrom
              ? `Sending from +${sendingFrom}`
              : "One message, to a chosen audience."
        }
      />

      {connected === false && (
        <Panel className="p-5">
          <p className="text-sm text-[var(--text-secondary)]">
            WhatsApp messaging is not connected. Open <span className="font-medium">Settings → WhatsApp</span>,
            switch it on and scan the code with the phone you want to send from.
          </p>
        </Panel>
      )}

      <Panel className="p-6">
        <h2 className="text-lg">New campaign</h2>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Check who it reaches before you send. A WhatsApp message lands on a personal phone and
          cannot be taken back.
        </p>

        <div className="mt-5 flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Campaign name" htmlFor="wc-name" hint="For your reference — never sent." required>
              <Input
                id="wc-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="March workshop reminder"
              />
            </Field>

            <Field label="Audience" htmlFor="wc-audience">
              <Select
                id="wc-audience"
                value={audience}
                onChange={(e) => {
                  setAudience(e.target.value as BroadcastRow["audience"]);
                  setPreview(null);
                }}
              >
                <option value="members">Active members</option>
                <option value="contacts">Everyone in the CRM</option>
                <option value="tag">CRM contacts with a tag</option>
                <option value="manual">A list I paste in</option>
              </Select>
            </Field>
          </div>

          {audience === "tag" && (
            <Field label="Tag" htmlFor="wc-tag" hint="Contacts carrying this tag." required>
              <Input
                id="wc-tag"
                value={tag}
                onChange={(e) => {
                  setTag(e.target.value);
                  setPreview(null);
                }}
                placeholder="workshop-2026"
                className="max-w-xs"
              />
            </Field>
          )}

          {audience === "manual" && (
            <Field
              label="Numbers"
              htmlFor="wc-numbers"
              hint="One per line, or comma separated. Include the country code."
              required
            >
              <Textarea
                id="wc-numbers"
                rows={4}
                value={numbers}
                onChange={(e) => {
                  setNumbers(e.target.value);
                  setPreview(null);
                }}
                placeholder={"+65 9123 4567\n+65 8765 4321"}
              />
            </Field>
          )}

          <Field
            label="Message"
            htmlFor="wc-message"
            hint="Plain text. WhatsApp's own *bold* and _italic_ markers work."
            required
          >
            <Textarea
              id="wc-message"
              rows={6}
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                setPreview(null);
              }}
              placeholder="Hi! Just a reminder that…"
            />
          </Field>

          {error && (
            <p role="alert" className="text-sm font-medium text-red-600 dark:text-red-400">
              {error}
            </p>
          )}

          {preview && (
            <div className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] surface-sunken p-4 text-sm">
              <p className="font-medium text-[var(--text-primary)]">
                {preview.willSend} will receive this
                {preview.willSkip > 0 && (
                  <span className="font-normal text-[var(--text-secondary)]">
                    {" "}· {preview.willSkip} skipped
                  </span>
                )}
              </p>
              {preview.sample.length > 0 && (
                <ul className="mt-2 flex flex-col gap-1 text-[var(--text-secondary)]">
                  {preview.sample.map((r, i) => (
                    <li key={`${r.phone}-${i}`} className="flex flex-wrap items-center gap-2">
                      <span>{r.name || "(no name)"}</span>
                      <span className="text-[var(--text-muted)]">{r.phone}</span>
                      {r.status === "skipped" && (
                        <Badge tone="neutral">{r.reason ?? "skipped"}</Badge>
                      )}
                    </li>
                  ))}
                  {preview.total > preview.sample.length && (
                    <li className="text-[var(--text-muted)]">
                      …and {preview.total - preview.sample.length} more
                    </li>
                  )}
                </ul>
              )}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" disabled={busy || !canCompose} onClick={() => void runPreview()}>
              Who will get this?
            </Button>
            <Button
              disabled={busy || !preview || preview.willSend === 0 || connected !== true}
              onClick={() => void send()}
            >
              <Icon name="whatsapp" size={16} />
              Send campaign
            </Button>
          </div>
        </div>
      </Panel>

      <Panel>
        {rows && rows.length === 0 ? (
          <AdminEmpty message="No campaigns yet." />
        ) : (
          <TableWrap>
            <thead>
              <tr>
                <Th>Campaign</Th>
                <Th>Audience</Th>
                <Th>Sent</Th>
                <Th>Status</Th>
                <Th>When</Th>
              </tr>
            </thead>
            <tbody>
              {(rows ?? []).map((r) => (
                <tr key={r._id} className="hover:bg-[var(--surface-sunken)]">
                  <Td>
                    <span className="font-medium text-[var(--text-primary)]">{r.name}</span>
                    <span className="block max-w-md truncate text-xs text-[var(--text-muted)]">
                      {r.message}
                    </span>
                  </Td>
                  <Td className="whitespace-nowrap text-[var(--text-secondary)]">
                    {r.audience === "tag" ? `Tag: ${r.tag ?? ""}` : r.audience}
                  </Td>
                  <Td className="whitespace-nowrap text-[var(--text-secondary)]">
                    {r.sentCount}
                    {r.failedCount > 0 && (
                      <span className="text-red-600 dark:text-red-400"> · {r.failedCount} failed</span>
                    )}
                    {r.skippedCount > 0 && (
                      <span className="text-[var(--text-muted)]"> · {r.skippedCount} skipped</span>
                    )}
                  </Td>
                  <Td>
                    <Badge tone={STATUS_TONE[r.status]}>{r.status}</Badge>
                    {r.lastError && (
                      <span className="block text-xs text-[var(--text-muted)]">{r.lastError}</span>
                    )}
                  </Td>
                  <Td className="whitespace-nowrap text-[var(--text-secondary)]">
                    {r.startedAt ? formatDateTime(r.startedAt) : "—"}
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        )}
      </Panel>

      {confirmDialog}
    </div>
  );
}
