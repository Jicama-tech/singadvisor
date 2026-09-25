import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { adminFetch } from "@/lib/adminFetch";
import { AdminEmpty, PageHeading, Panel, TableWrap, Td, Th } from "@/components/admin/AdminUI";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { WhatsappMessageEditor } from "@/components/admin/WhatsappMessageEditor";
import { WhatsappContactPicker } from "@/components/admin/WhatsappContactPicker";
import {
  STATUS_LABEL,
  STATUS_TONE,
  WhatsappCampaignRun,
  type BroadcastStatus,
} from "@/components/admin/WhatsappCampaignRun";
import { unknownPlaceholders } from "@/lib/campaignTemplate";
import { formatDateTime } from "@/lib/utils";

type Audience = "members" | "contacts" | "tag" | "selected" | "manual";

type BroadcastRow = {
  _id: string;
  name: string;
  message: string;
  audience: Audience;
  tag: string | null;
  status: BroadcastStatus;
  sentCount: number;
  failedCount: number;
  skippedCount: number;
  pendingCount?: number;
  lastError: string | null;
  createdAt?: string;
  startedAt: string | null;
};

/** POST /whatsapp/broadcasts/preview — the server's own rendering, so what is
 * shown is exactly what each person will receive. */
type Preview = {
  template: string;
  hasImage: boolean;
  total: number;
  willSend: number;
  willSkip: number;
  skipped: Record<string, number>;
  unknownPlaceholders: string[];
  warnings: string[];
  estimatedMinutes: number;
  dailyLimit: number;
  dailyRemaining: number;
  connected: boolean;
  samples: { name: string; phone: string; text: string }[];
};

const AUDIENCE_LABEL: Record<Audience, string> = {
  members: "Active members",
  contacts: "Everyone in the CRM",
  tag: "CRM contacts with a tag",
  selected: "Contacts I pick",
  manual: "A list I paste in",
};

/** The server's per-campaign ceiling. */
const MAX_RECIPIENTS = 500;

/**
 * WhatsApp campaigns, the way kioscart-v1 does them: write one message, and
 * each person gets their own copy — their name in it, a greeting picked for
 * them — sent slowly from the linked phone.
 *
 * The page follows from one fact: a WhatsApp message cannot be unsent, and it
 * lands on somebody's personal phone. So the preview is live and literal —
 * the real rendered message for each of the first twenty people, who will be
 * skipped and why, how long it takes and how much of today's allowance it
 * uses — and Send only works on a preview of exactly what is on screen.
 */
export default function WhatsappCampaigns() {
  const { user } = useAuth();
  const { confirm, confirmDialog } = useConfirm();

  const [rows, setRows] = useState<BroadcastRow[] | null>(null);
  const [connected, setConnected] = useState<boolean | null>(null);
  const [sendingFrom, setSendingFrom] = useState<string | null>(null);
  /** The campaign whose progress view is open, if any. */
  const [viewing, setViewing] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [messageHtml, setMessageHtml] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [audience, setAudience] = useState<Audience>("members");
  const [tag, setTag] = useState("");
  const [numbers, setNumbers] = useState("");
  const [contactIds, setContactIds] = useState<string[]>([]);

  const [preview, setPreview] = useState<Preview | null>(null);
  /** The request body the preview above was made from. */
  const [previewedFor, setPreviewedFor] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [sample, setSample] = useState(0);
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
  }, [load, viewing]);

  /** The campaign the banner is about: one going out, else one paused. */
  const sending = (rows ?? []).find((r) => r.status === "sending" || r.status === "queued");
  const active = sending ?? (rows ?? []).find((r) => r.status === "paused");
  const inFlight = !!sending;
  useEffect(() => {
    if (!inFlight || viewing) return;
    const t = setInterval(() => void load(), 5000);
    return () => clearInterval(t);
  }, [inFlight, viewing, load]);

  /** The request body both preview and send use, so the two can never
   * disagree about who the audience is or what the message says. The name
   * is added only when sending: it is never sent to anyone, and typing it
   * should not re-run the preview. */
  const body = useMemo(
    () => ({
      name: "preview",
      messageHtml,
      ...(imageUrl ? { imageUrl } : {}),
      audience,
      ...(audience === "tag" ? { tag: tag.trim() } : {}),
      ...(audience === "selected" ? { contactIds } : {}),
      ...(audience === "manual"
        ? {
            numbers: numbers
              .split(/[\n,]/)
              .map((n) => n.trim())
              .filter(Boolean),
          }
        : {}),
    }),
    [messageHtml, imageUrl, audience, tag, contactIds, numbers],
  );
  const bodyKey = JSON.stringify(body);

  // `<p><br></p>` is what an empty Quill editor emits.
  const plain = messageHtml.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").trim();
  const audienceReady =
    audience === "tag"
      ? tag.trim().length > 0
      : audience === "selected"
        ? contactIds.length > 0
        : audience === "manual"
          ? numbers.trim().length > 0
          : true;
  const canPreview = plain.length > 0 && audienceReady;

  const runPreview = useCallback(async () => {
    const key = bodyKey;
    setPreviewing(true);
    setError(null);
    try {
      const res = await adminFetch(`${__API_URL__}/whatsapp/broadcasts/preview`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: key,
      });
      const data = (await res.json().catch(() => null)) as (Preview & { message?: string | string[] }) | null;
      if (!res.ok) {
        const msg = data?.message;
        setError(Array.isArray(msg) ? msg.join(" ") : (msg ?? "Could not preview this campaign."));
        setPreview(null);
        setPreviewedFor(null);
        return;
      }
      setPreview(data);
      setPreviewedFor(key);
      setSample(0);
    } finally {
      setPreviewing(false);
    }
  }, [bodyKey]);

  // Live preview: re-asked a moment after the last edit, as kioscart-v1's
  // composer does, so the bubble keeps up with the typing.
  useEffect(() => {
    if (!canPreview || bodyKey === previewedFor) return;
    const t = setTimeout(() => void runPreview(), 800);
    return () => clearTimeout(t);
  }, [canPreview, bodyKey, previewedFor, runPreview]);

  const fresh = !!preview && previewedFor === bodyKey;
  const typedUnknown = unknownPlaceholders(plain);
  const canSend =
    fresh &&
    !busy &&
    connected === true &&
    name.trim().length > 0 &&
    // Only one campaign SENDS at a time (the server refuses a second with
    // 409). A paused one does not block: it may sit at the daily limit
    // until tomorrow.
    !inFlight &&
    preview.willSend > 0 &&
    preview.willSend <= MAX_RECIPIENTS &&
    preview.unknownPlaceholders.length === 0 &&
    typedUnknown.length === 0;

  async function send() {
    if (!preview) return;
    const n = preview.willSend;
    const overDaily = n > preview.dailyRemaining;
    const agreed = await confirm({
      title: `Send to ${n} ${n === 1 ? "person" : "people"}?`,
      message: `This goes out on WhatsApp from ${sendingFrom ? `+${sendingFrom}` : "the linked phone"}, and cannot be unsent.`,
      detail: overDaily
        ? `Only ${preview.dailyRemaining} more can go out in the next 24 hours, so it will pause at the daily limit and you can resume it tomorrow. Sending is spaced out to protect the number from a WhatsApp ban.`
        : `Takes about ${preview.estimatedMinutes} min — messages are spaced out to protect the number from a WhatsApp ban. You can stop it at any time.`,
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
        body: JSON.stringify({ ...body, name: name.trim() }),
      });
      const data = (await res.json().catch(() => null)) as { id?: string; message?: string } | null;
      if (!res.ok || !data?.id) {
        setError(data?.message ?? "It did not start.");
        return;
      }
      setName("");
      setMessageHtml("");
      setImageUrl(null);
      setNumbers("");
      setContactIds([]);
      setPreview(null);
      setPreviewedFor(null);
      setViewing(data.id);
    } finally {
      setBusy(false);
    }
  }

  if (!user) return null;

  if (viewing) {
    return (
      <div className="flex flex-col gap-8">
        <PageHeading title="WhatsApp campaigns" />
        <WhatsappCampaignRun id={viewing} onBack={() => setViewing(null)} />
      </div>
    );
  }

  const current = preview?.samples[sample];

  return (
    <div className="flex flex-col gap-8">
      <PageHeading
        title="WhatsApp campaigns"
        description={
          connected === false
            ? "No phone is linked — pair one under Settings → WhatsApp before sending."
            : sendingFrom
              ? `Sending from +${sendingFrom}`
              : "One message, personalised for each person."
        }
      />

      {connected === false && (
        <Panel className="p-5">
          <p className="text-sm text-[var(--text-secondary)]">
            WhatsApp messaging is not connected. Open <span className="font-medium">Settings → WhatsApp</span>,
            switch it on and scan the code with the phone you want to send from. You can still write and
            preview a campaign meanwhile.
          </p>
        </Panel>
      )}

      {active && (
        <Panel className="flex flex-wrap items-center gap-3 p-4">
          <Badge tone={STATUS_TONE[active.status]}>{STATUS_LABEL[active.status]}</Badge>
          <span className="text-sm text-[var(--text-primary)]">
            <span className="font-medium">{active.name}</span>
            {active.status === "paused"
              ? ` is paused${active.lastError ? ` — ${active.lastError}` : "."}`
              : ` is going out: ${active.sentCount} sent so far.`}
          </span>
          <Button size="sm" variant="secondary" className="ml-auto" onClick={() => setViewing(active._id)}>
            View progress
          </Button>
        </Panel>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <Panel className="p-6">
          <h2 className="text-lg">New campaign</h2>
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
              <Field label="Send to" htmlFor="wc-audience">
                <Select id="wc-audience" value={audience} onChange={(e) => setAudience(e.target.value as Audience)}>
                  {(Object.keys(AUDIENCE_LABEL) as Audience[]).map((a) => (
                    <option key={a} value={a}>
                      {AUDIENCE_LABEL[a]}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>

            {audience === "tag" && (
              <Field label="Tag" htmlFor="wc-tag" hint="Contacts carrying this tag." required>
                <Input
                  id="wc-tag"
                  value={tag}
                  onChange={(e) => setTag(e.target.value)}
                  placeholder="workshop-2026"
                  className="max-w-xs"
                />
              </Field>
            )}

            {audience === "selected" && <WhatsappContactPicker selected={contactIds} onChange={setContactIds} />}

            {audience === "manual" && (
              <Field
                label="Numbers"
                htmlFor="wc-numbers"
                hint="One per line, or comma separated. Include the country code. Names are not known, so {{name}} falls back."
                required
              >
                <Textarea
                  id="wc-numbers"
                  rows={4}
                  value={numbers}
                  onChange={(e) => setNumbers(e.target.value)}
                  placeholder={"+65 9123 4567\n+65 8765 4321"}
                />
              </Field>
            )}

            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-[var(--text-primary)]">
                Message <span className="text-red-600 dark:text-red-400">*</span>
              </span>
              <WhatsappMessageEditor
                value={messageHtml}
                onChange={setMessageHtml}
                imageUrl={imageUrl}
                onImageChange={setImageUrl}
              />
            </div>
          </div>
        </Panel>

        {/* The preview: sticky beside the form on wide screens, below it on
            narrow ones. */}
        <div className="flex flex-col gap-4 lg:sticky lg:top-6">
          <Panel className="p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-base">Preview</h2>
              <Button
                variant="ghost"
                size="sm"
                disabled={!canPreview || previewing}
                onClick={() => void runPreview()}
              >
                {previewing ? "Updating…" : "Refresh"}
              </Button>
            </div>

            {!canPreview ? (
              <p className="mt-3 text-sm text-[var(--text-muted)]">
                Write a message and choose who it goes to, and each person’s copy appears here.
              </p>
            ) : !preview ? (
              <p className="mt-3 text-sm text-[var(--text-muted)]">{previewing ? "Working it out…" : ""}</p>
            ) : (
              <div className={`mt-3 flex flex-col gap-4 ${fresh ? "" : "opacity-60"}`}>
                {current ? (
                  <div>
                    <div className="rounded-xl bg-[#e5ddd5] p-3 dark:bg-[#0b141a]">
                      <div className="ml-auto max-w-[95%] rounded-lg rounded-tr-none bg-[#d9fdd3] p-2 text-[0.875rem] text-[#111b21] shadow-sm dark:bg-[#005c4b] dark:text-[#e9edef]">
                        {imageUrl && preview.hasImage && (
                          <img
                            src={`${__API_URL__}${imageUrl}`}
                            alt=""
                            className="mb-1.5 max-h-48 w-full rounded-md object-cover"
                          />
                        )}
                        <p className="whitespace-pre-wrap break-words">{current.text}</p>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-xs text-[var(--text-secondary)]">
                      <button
                        type="button"
                        aria-label="Previous person"
                        disabled={sample === 0}
                        onClick={() => setSample((s) => s - 1)}
                        className="rounded-full p-1 hover:bg-[var(--surface-sunken)] disabled:opacity-30"
                      >
                        <Icon name="chevron-left" size={16} />
                      </button>
                      <span>
                        To <span className="font-medium text-[var(--text-primary)]">{current.name || "(no name)"}</span>{" "}
                        {current.phone} · {sample + 1} of {preview.samples.length}
                        {preview.willSend > preview.samples.length && ` (first ${preview.samples.length})`}
                      </span>
                      <button
                        type="button"
                        aria-label="Next person"
                        disabled={sample >= preview.samples.length - 1}
                        onClick={() => setSample((s) => s + 1)}
                        className="rounded-full p-1 hover:bg-[var(--surface-sunken)] disabled:opacity-30"
                      >
                        <Icon name="chevron-right" size={16} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-[var(--text-muted)]">Nobody in this audience can receive it.</p>
                )}

                <div className="text-sm">
                  <p className="font-medium text-[var(--text-primary)]">
                    {preview.willSend} will receive this
                  </p>
                  {preview.willSkip > 0 && (
                    <>
                      <p className="mt-1 text-[var(--text-secondary)]">{preview.willSkip} will be skipped:</p>
                      <ul className="mt-1 flex flex-col gap-0.5 text-[var(--text-secondary)]">
                        {Object.entries(preview.skipped).map(([reason, n]) => (
                          <li key={reason}>
                            · {reason} ({n})
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                  {preview.willSend > 0 && (
                    <p className="mt-2 text-[var(--text-secondary)]">
                      Takes about {preview.estimatedMinutes} min · {preview.dailyRemaining} of {preview.dailyLimit}{" "}
                      messages left today
                    </p>
                  )}
                  {preview.willSend > preview.dailyRemaining && (
                    <p className="mt-2 font-medium text-amber-700 dark:text-amber-400">
                      More than today’s allowance — it will pause at the daily limit and can be resumed
                      tomorrow.
                    </p>
                  )}
                  {preview.unknownPlaceholders.length > 0 && (
                    <p className="mt-2 font-medium text-red-600 dark:text-red-400">
                      Fix {preview.unknownPlaceholders.map((k) => `{{${k}}}`).join(", ")} before sending.
                    </p>
                  )}
                  {preview.warnings.map((w) => (
                    <p key={w} className="mt-2 font-medium text-red-600 dark:text-red-400">
                      {w}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {error && (
              <p role="alert" className="mt-3 text-sm font-medium text-red-600 dark:text-red-400">
                {error}
              </p>
            )}

            <Button className="mt-4 w-full" disabled={!canSend} onClick={() => void send()}>
              <Icon name="whatsapp" size={16} />
              {fresh && preview ? `Send to ${preview.willSend}` : "Send campaign"}
            </Button>
            {inFlight && (
              <p className="mt-2 text-xs text-[var(--text-muted)]">
                Another campaign is sending. Wait for it to finish, or stop it, first.
              </p>
            )}
            {!inFlight && fresh && name.trim().length === 0 && (
              <p className="mt-2 text-xs text-[var(--text-muted)]">Give the campaign a name to send it.</p>
            )}
          </Panel>
        </div>
      </div>

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
                <tr
                  key={r._id}
                  className="cursor-pointer hover:bg-[var(--surface-sunken)]"
                  onClick={() => setViewing(r._id)}
                >
                  <Td>
                    <span className="font-medium text-[var(--text-primary)]">{r.name}</span>
                    <span className="block max-w-md truncate text-xs text-[var(--text-muted)]">{r.message}</span>
                  </Td>
                  <Td className="whitespace-nowrap text-[var(--text-secondary)]">
                    {r.audience === "tag" ? `Tag: ${r.tag ?? ""}` : AUDIENCE_LABEL[r.audience]}
                  </Td>
                  <Td className="whitespace-nowrap text-[var(--text-secondary)]">
                    {r.sentCount}
                    {r.failedCount > 0 && (
                      <span className="text-red-600 dark:text-red-400"> · {r.failedCount} failed</span>
                    )}
                    {r.skippedCount > 0 && <span className="text-[var(--text-muted)]"> · {r.skippedCount} skipped</span>}
                  </Td>
                  <Td>
                    <Badge tone={STATUS_TONE[r.status]}>{STATUS_LABEL[r.status]}</Badge>
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
