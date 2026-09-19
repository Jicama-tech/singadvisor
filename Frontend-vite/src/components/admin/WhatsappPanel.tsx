import { useCallback, useEffect, useState } from "react";
import { adminFetch } from "@/lib/adminFetch";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { PhoneField } from "@/components/ui/PhoneField";
import { useConfirm } from "@/components/ui/ConfirmDialog";

/** Mirrors WhatsappState in the Backend's whatsapp.service.ts. */
type WhatsappStatus = "off" | "disconnected" | "connecting" | "awaiting-scan" | "connected";

type WhatsappState = {
  enabled: boolean;
  status: WhatsappStatus;
  qr: string | null;
  qrExpiresAt: string | null;
  number: string | null;
  connectedAt: string | null;
  lastError: string | null;
};

const STATUS_LABEL: Record<WhatsappStatus, string> = {
  off: "Off",
  disconnected: "Not connected",
  connecting: "Connecting…",
  "awaiting-scan": "Waiting for you to scan",
  connected: "Connected",
};

const STATUS_TONE: Record<WhatsappStatus, BadgeTone> = {
  off: "neutral",
  disconnected: "neutral",
  connecting: "warn",
  "awaiting-scan": "warn",
  connected: "success",
};

/**
 * Pairing a phone, and watching the session.
 *
 * WhatsApp's QR is only valid for about twenty seconds. Baileys emits a fresh
 * one each time the old one lapses, so the page POLLS while a code is on
 * screen — a QR fetched once and left there stops scanning after twenty
 * seconds and looks broken with nothing to say why.
 *
 * Polling stops the moment it is not needed: once connected, once switched
 * off, or when this panel unmounts. A settings page left open on another tab
 * should not sit asking the server for a QR for the rest of the afternoon.
 */
export function WhatsappPanel() {
  const { confirm, confirmDialog } = useConfirm();

  const [state, setState] = useState<WhatsappState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testTo, setTestTo] = useState("");
  const [testMessage, setTestMessage] = useState("A test from SingAdvisor.");
  const [testResult, setTestResult] = useState<string | null>(null);

  /** Set when the FIRST status read fails. A later poll failing is ignored —
   * the next one is seconds away and the state on screen is still the best
   * thing to show — but the first one failing means there is nothing to show
   * at all, and returning early there left the panel on "Loading…" for ever. */
  const [unavailable, setUnavailable] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await adminFetch(`${__API_URL__}/whatsapp/status`);
      if (!res.ok) {
        // 403 is the ordinary case, not an edge one: an operator may hold the
        // Settings tab without the WhatsApp tab, and TabsGuard refuses them.
        setUnavailable(
          res.status === 403
            ? 'Your account does not have access to WhatsApp messaging.'
            : 'WhatsApp messaging could not be reached.',
        );
        return;
      }
      setUnavailable(null);
      setState((await res.json()) as WhatsappState);
    } catch {
      setUnavailable((current) => current ?? 'WhatsApp messaging could not be reached.');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  /**
   * Two speeds, because there are two different questions.
   *
   * While a QR is up the answer changes every few seconds and somebody is
   * watching it, so poll fast. Once connected nothing on screen changes for
   * hours — but the session can still drop, or be unlinked from the phone
   * itself, and polling only during pairing meant the panel went on claiming
   * "Connected" until the page was reloaded. Somebody would write a campaign
   * against a session that was not there.
   *
   * Thirty seconds is slow enough to be free and fast enough that nobody
   * composes a whole campaign against a dead session. `off` is the one state
   * that cannot change behind our back — nothing reconnects a disabled
   * feature — so it stops entirely.
   */
  const pollStatus = state?.status;
  useEffect(() => {
    if (!pollStatus || pollStatus === "off") return;
    const fast = pollStatus === "awaiting-scan" || pollStatus === "connecting";
    const id = setInterval(() => {
      void load();
    }, fast ? 2000 : 30000);
    return () => clearInterval(id);
  }, [pollStatus, load]);

  async function act(path: string, options?: { confirmFirst?: Parameters<typeof confirm>[0] }) {
    if (options?.confirmFirst) {
      const agreed = await confirm(options.confirmFirst);
      if (!agreed) return;
    }
    setBusy(true);
    setError(null);
    setTestResult(null);
    try {
      const res = await adminFetch(`${__API_URL__}/whatsapp/${path}`, { method: "POST" });
      const data = (await res.json().catch(() => null)) as (WhatsappState & { message?: string }) | null;
      if (!res.ok) {
        setError(data?.message ?? "That did not work.");
        return;
      }
      if (data) setState((current) => ({ ...(current ?? ({} as WhatsappState)), ...data }));
      // The state returned is the state at that instant; a QR usually arrives
      // a beat later, and the poll above picks it up.
      void load();
    } catch {
      setError("Could not reach the server.");
    } finally {
      setBusy(false);
    }
  }

  async function sendTest() {
    setBusy(true);
    setError(null);
    setTestResult(null);
    try {
      const res = await adminFetch(`${__API_URL__}/whatsapp/send`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ phone: testTo, message: testMessage }),
      });
      const data = (await res.json().catch(() => null)) as { message?: string } | null;
      setTestResult(res.ok ? `Sent to ${testTo}.` : (data?.message ?? "It did not send."));
    } catch {
      setTestResult("Could not reach the server.");
    } finally {
      setBusy(false);
    }
  }

  if (!state) {
    if (unavailable) {
      return (
        <p className="mt-4 text-sm text-[var(--text-secondary)]" role="status">
          {unavailable}
        </p>
      );
    }
    return <p className="mt-4 text-sm text-[var(--text-muted)]">Loading…</p>;
  }

  const { enabled, status } = state;

  return (
    <div className="mt-5 flex flex-col gap-6">
      {/* The switch itself. */}
      <div className="flex flex-col gap-3">
        <label className="flex cursor-pointer items-start gap-3 text-sm">
          <input
            type="checkbox"
            checked={enabled}
            disabled={busy}
            onChange={(e) =>
              void act(e.target.checked ? "enable" : "disable")
            }
            className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--accent)]"
          />
          <span>
            <span className="font-medium text-[var(--text-primary)]">
              Send messages from WhatsApp
            </span>
            <span className="block text-xs text-[var(--text-muted)]">
              Links this site to a WhatsApp account as a device, the same way WhatsApp Web does.
              Messages go out from that number, and replies arrive on that phone.
            </span>
          </span>
        </label>

        {enabled && (
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={STATUS_TONE[status]}>{STATUS_LABEL[status]}</Badge>
            {state.number && (
              <span className="text-sm text-[var(--text-secondary)]">
                Sending as <span className="font-medium">+{state.number}</span>
              </span>
            )}
          </div>
        )}
      </div>

      {error && (
        <p role="alert" className="text-sm font-medium text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
      {state.lastError && status !== "connected" && (
        <p className="text-sm text-[var(--text-secondary)]">{state.lastError}</p>
      )}

      {/* Pairing. */}
      {enabled && status === "awaiting-scan" && state.qr && (
        <div className="flex flex-col items-start gap-4 rounded-[var(--radius-card)] border border-[var(--border-subtle)] surface-sunken p-5 sm:flex-row sm:gap-6">
          <img
            src={state.qr}
            alt="WhatsApp pairing QR code"
            width={200}
            height={200}
            className="h-[200px] w-[200px] shrink-0 rounded-lg bg-white p-2"
          />
          <div className="min-w-0 text-sm">
            <p className="font-medium text-[var(--text-primary)]">Scan this with the phone you want to send from</p>
            <ol className="mt-2 flex list-decimal flex-col gap-1 pl-4 text-[var(--text-secondary)]">
              <li>Open WhatsApp on that phone</li>
              <li>Settings → Linked devices → Link a device</li>
              <li>Point it at this code</li>
            </ol>
            <p className="mt-3 text-xs text-[var(--text-muted)]">
              The code refreshes every few seconds on its own — if you miss one, wait for the next.
            </p>
          </div>
        </div>
      )}

      {enabled && status === "connecting" && (
        <div className="flex items-center gap-3 rounded-[var(--radius-card)] border border-[var(--border-subtle)] surface-sunken px-5 py-6">
          <span
            aria-hidden="true"
            className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--border-strong)] border-t-[var(--accent)]"
          />
          <p className="text-sm text-[var(--text-secondary)]">Opening the connection…</p>
        </div>
      )}

      {enabled && status === "disconnected" && (
        <div className="flex flex-col items-start gap-3 rounded-[var(--radius-card)] border border-[var(--border-subtle)] surface-sunken px-5 py-6">
          <p className="text-sm text-[var(--text-secondary)]">
            No phone is linked. Ask for a code and scan it.
          </p>
          <Button variant="secondary" size="sm" disabled={busy} onClick={() => void act("connect")}>
            Show the pairing code
          </Button>
        </div>
      )}

      {/* Connected: prove it works, then get out of the way. */}
      {enabled && status === "connected" && (
        <div className="flex flex-col gap-4 rounded-[var(--radius-card)] border border-[var(--border-subtle)] surface-sunken p-5">
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-56 flex-1">
              <PhoneField
                name="wa-test-to"
                label="Send a test to"
                hint="Include the country code."
                value={testTo}
                onChange={setTestTo}
              />
            </div>
            <Field label="Message" htmlFor="wa-test-msg" className="min-w-64 flex-[2]">
              <Input
                id="wa-test-msg"
                value={testMessage}
                onChange={(e) => setTestMessage(e.target.value)}
              />
            </Field>
            <Button
              variant="secondary"
              disabled={busy || !testTo || !testMessage}
              onClick={() => void sendTest()}
            >
              Send test
            </Button>
          </div>
          {testResult && <p className="text-sm text-[var(--text-secondary)]">{testResult}</p>}

          <div className="flex flex-wrap items-center gap-2 border-t border-[var(--border-subtle)] pt-4">
            <Button
              variant="secondary"
              size="sm"
              disabled={busy}
              onClick={() =>
                void act("disconnect", {
                  confirmFirst: {
                    title: "Unlink this phone?",
                    message: "The site stops being able to send on WhatsApp until a phone is scanned again.",
                    detail:
                      "Switching the feature off instead keeps the pairing, so turning it back on needs no scan.",
                    confirmLabel: "Unlink",
                    tone: "danger",
                  },
                })
              }
            >
              <Icon name="x" size={15} />
              Unlink this phone
            </Button>
            <span className="text-xs text-[var(--text-muted)]">
              Turning the switch off above keeps the pairing.
            </span>
          </div>
        </div>
      )}

      {confirmDialog}
    </div>
  );
}
