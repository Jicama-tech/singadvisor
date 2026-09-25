import { useCallback, useEffect, useState } from "react";
import { adminFetch } from "@/lib/adminFetch";
import { Panel } from "@/components/admin/AdminUI";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { formatDateTime } from "@/lib/utils";

export type BroadcastStatus = "queued" | "sending" | "paused" | "sent" | "failed" | "cancelled";

export const STATUS_LABEL: Record<BroadcastStatus, string> = {
  queued: "Starting",
  sending: "Sending",
  paused: "Paused",
  sent: "Finished",
  failed: "Failed",
  cancelled: "Stopped",
};

export const STATUS_TONE: Record<BroadcastStatus, BadgeTone> = {
  queued: "neutral",
  sending: "warn",
  paused: "info",
  sent: "success",
  failed: "danger",
  cancelled: "neutral",
};

type RecipientStatus = "pending" | "sent" | "failed" | "skipped";

type Detail = {
  _id: string;
  name: string;
  message: string;
  imageUrl: string | null;
  status: BroadcastStatus;
  sentFrom: string | null;
  sentCount: number;
  failedCount: number;
  skippedCount: number;
  pendingCount: number;
  lastError: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  recipients: {
    name: string;
    phone: string;
    status: RecipientStatus;
    reason: string | null;
    sentAt: string | null;
    text: string;
  }[];
};

const ROW_TONE: Record<RecipientStatus, BadgeTone> = {
  pending: "neutral",
  sent: "success",
  failed: "danger",
  skipped: "neutral",
};

const ROW_LABEL: Record<RecipientStatus, string> = {
  pending: "Waiting",
  sent: "Sent",
  failed: "Failed",
  skipped: "Skipped",
};

/**
 * One campaign, live — kioscart-v1's CampaignRunView. While it is sending the
 * page polls every three seconds, so the bar moves as messages go out. A
 * paused campaign (daily limit, dropped session, restart) says why and offers
 * Resume; an open one offers Stop.
 */
export function WhatsappCampaignRun({ id, onBack }: { id: string; onBack: () => void }) {
  const { confirm, confirmDialog } = useConfirm();
  const [doc, setDoc] = useState<Detail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState<number | null>(null);

  const load = useCallback(async () => {
    const res = await adminFetch(`${__API_URL__}/whatsapp/broadcasts/${id}`);
    if (res.ok) setDoc((await res.json()) as Detail);
    else setError("Could not load this campaign.");
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const inFlight = doc?.status === "queued" || doc?.status === "sending";
  useEffect(() => {
    if (!inFlight) return;
    const t = setInterval(() => void load(), 3000);
    return () => clearInterval(t);
  }, [inFlight, load]);

  async function act(action: "cancel" | "resume") {
    if (action === "cancel") {
      const ok = await confirm({
        title: "Stop this campaign?",
        message: "Nobody else will be messaged. People who already got it keep it.",
        detail: "A stopped campaign cannot be resumed.",
        confirmLabel: "Stop campaign",
        tone: "danger",
      });
      if (!ok) return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await adminFetch(`${__API_URL__}/whatsapp/broadcasts/${id}/${action}`, { method: "POST" });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { message?: string } | null;
        setError(data?.message ?? "That did not work.");
      }
      await load();
    } finally {
      setBusy(false);
    }
  }

  if (!doc) {
    return (
      <Panel className="p-6">
        <p className="text-sm text-[var(--text-muted)]">{error ?? "Loading…"}</p>
      </Panel>
    );
  }

  const messaged = (doc.sentCount ?? 0) + (doc.failedCount ?? 0);
  const toMessage = messaged + (doc.pendingCount ?? 0);
  const pct = toMessage > 0 ? Math.round((messaged / toMessage) * 100) : 100;
  const canStop = doc.status === "queued" || doc.status === "sending" || doc.status === "paused";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Button variant="ghost" size="sm" onClick={onBack}>
          <Icon name="chevron-left" size={16} />
          All campaigns
        </Button>
      </div>

      <Panel className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg">{doc.name}</h2>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              {doc.sentFrom ? `From +${doc.sentFrom}` : "From the linked phone"}
              {doc.startedAt && ` · started ${formatDateTime(doc.startedAt)}`}
              {doc.finishedAt && ` · ended ${formatDateTime(doc.finishedAt)}`}
            </p>
          </div>
          <Badge tone={STATUS_TONE[doc.status]}>{STATUS_LABEL[doc.status]}</Badge>
        </div>

        <div className="mt-5">
          <div className="flex justify-between text-sm text-[var(--text-secondary)]">
            <span>
              {messaged} of {toMessage} messaged
            </span>
            <span>{pct}%</span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-[var(--surface-sunken)]">
            <div className="h-full rounded-full bg-[var(--accent)] transition-all" style={{ width: `${pct}%` }} />
          </div>
          <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
            <Count label="Sent" value={doc.sentCount} />
            <Count label="Failed" value={doc.failedCount} danger={doc.failedCount > 0} />
            <Count label="Skipped" value={doc.skippedCount} />
            <Count label="Waiting" value={doc.pendingCount} />
          </dl>
        </div>

        {doc.lastError && (
          <p className="mt-4 rounded-lg surface-sunken p-3 text-sm text-[var(--text-primary)]">
            {doc.lastError}
          </p>
        )}
        {error && (
          <p role="alert" className="mt-3 text-sm font-medium text-red-600 dark:text-red-400">
            {error}
          </p>
        )}

        {canStop && (
          <div className="mt-4 flex flex-wrap gap-2">
            {doc.status === "paused" && (
              <Button disabled={busy} onClick={() => void act("resume")}>
                <Icon name="play" size={15} />
                Resume
              </Button>
            )}
            <Button variant="secondary" disabled={busy} onClick={() => void act("cancel")}>
              Stop campaign
            </Button>
          </div>
        )}

        <details className="mt-5">
          <summary className="cursor-pointer text-sm font-medium text-[var(--text-secondary)]">
            Message template
          </summary>
          <pre className="mt-2 max-h-60 overflow-auto whitespace-pre-wrap break-words rounded-lg surface-sunken p-3 font-sans text-sm text-[var(--text-primary)]">
            {doc.message}
          </pre>
        </details>
      </Panel>

      <Panel>
        <h3 className="border-b border-[var(--border-subtle)] px-5 py-3 text-sm font-medium">
          Recipients ({doc.recipients.length})
        </h3>
        <ul className="divide-y divide-[var(--border-subtle)]">
          {doc.recipients.map((r, i) => (
            <li key={i} className="px-5 py-2.5 text-sm">
              <button
                type="button"
                className="flex w-full flex-wrap items-center gap-x-3 gap-y-1 text-left"
                onClick={() => setOpen(open === i ? null : i)}
                aria-expanded={open === i}
              >
                <span className="font-medium text-[var(--text-primary)]">{r.name || "(no name)"}</span>
                <span className="text-[var(--text-muted)]">{r.phone}</span>
                <Badge tone={ROW_TONE[r.status]}>{ROW_LABEL[r.status]}</Badge>
                {r.reason && <span className="text-xs text-[var(--text-muted)]">{r.reason}</span>}
                <span className="ml-auto text-xs text-[var(--text-muted)]">
                  {r.sentAt ? formatDateTime(r.sentAt) : ""}
                </span>
              </button>
              {open === i && r.text && (
                <pre className="mt-2 whitespace-pre-wrap break-words rounded-lg surface-sunken p-3 font-sans text-sm text-[var(--text-primary)]">
                  {r.text}
                </pre>
              )}
            </li>
          ))}
        </ul>
      </Panel>

      {confirmDialog}
    </div>
  );
}

function Count({ label, value, danger }: { label: string; value: number; danger?: boolean }) {
  return (
    <div className="flex gap-1.5">
      <dt className="text-[var(--text-muted)]">{label}</dt>
      <dd className={danger ? "font-medium text-red-600 dark:text-red-400" : "font-medium text-[var(--text-primary)]"}>
        {value}
      </dd>
    </div>
  );
}
