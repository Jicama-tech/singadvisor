import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { adminFetch } from "@/lib/adminFetch";
import { PageHeading, Panel } from "@/components/admin/AdminUI";
import { Field, Input, Select } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";

/**
 * The single Settings tab (main sidebar). Three sections:
 * - Payments: PayNow identity (company name + UEN/mobile, preview QR) and
 *   Razorpay keys (secrets reveal-style, never echoed after save).
 * - Email: the per-organizer SMTP config on eventsh (ticket emails are
 *   generated and sent BY eventsh, so this config lives there) — managed
 *   through the Backend's /eventsh/* proxy.
 * - Billing: read-only events/tickets/revenue snapshot.
 */

type SettingsView = {
  companyName: string;
  companyUEN: string;
  payNowMobile: string;
  paynowEnabled: boolean;
  razorpayEnabled: boolean;
  razorpayKeyId: string;
  razorpayConfigured: boolean;
  paynowPayeeConfigured: boolean;
};

type EmailConfig = {
  enabled: boolean;
  fromName: string;
  fromEmail: string;
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUser: string;
  smtpPass: string;
  hasPassword?: boolean;
};

type OverviewStats = {
  events: number;
  ticketsSold: number;
  revenue: number;
  revenueCurrency: string;
};

const ORGANIZER_ID = __EVENTSH_ORGANIZER_ID__;

export default function AdminSettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<SettingsView | null>(null);
  const [savingPayments, setSavingPayments] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [email, setEmail] = useState<EmailConfig | null>(null);
  const [emailUnavailable, setEmailUnavailable] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);
  const [testRecipient, setTestRecipient] = useState("");
  const [previewQr, setPreviewQr] = useState("");

  const [stats, setStats] = useState<OverviewStats | null>(null);

  const load = useCallback(async () => {
    try {
      const [sRes, eRes, oRes] = await Promise.all([
        adminFetch(`${__API_URL__}/settings`),
        adminFetch(`${__API_URL__}/eventsh/organizers/${ORGANIZER_ID}/email-config`),
        adminFetch(`${__API_URL__}/admin/overview-stats`),
      ]);
      if (sRes.ok) setSettings((await sRes.json()) as SettingsView);
      if (eRes.ok) {
        const body = (await eRes.json()) as { data?: EmailConfig } | EmailConfig;
        setEmail(((body as { data?: EmailConfig }).data ?? body) as EmailConfig);
      } else {
        setEmailUnavailable(true);
      }
      if (oRes.ok) {
        const o = (await oRes.json()) as OverviewStats & { revenue: number };
        setStats({ events: o.events, ticketsSold: o.ticketsSold, revenue: o.revenue, revenueCurrency: o.revenueCurrency });
      }
    } catch {
      /* sections render their own unavailable states */
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (!user) return null;

  async function savePayments(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const companyName = String(fd.get("companyName") ?? "");
    const companyUEN = String(fd.get("companyUEN") ?? "");
    const payNowMobile = String(fd.get("payNowMobile") ?? "");
    const paynowEnabled = fd.get("paynowEnabled") === "on";
    const razorpayEnabled = fd.get("razorpayEnabled") === "on";
    const razorpayKeyId = String(fd.get("razorpayKeyId") ?? "");
    const razorpayKeySecret = String(fd.get("razorpayKeySecret") ?? "");
    const razorpayWebhookSecret = String(fd.get("razorpayWebhookSecret") ?? "");

    setSavingPayments(true);
    setError("");
    setMessage("");
    try {
      const res = await adminFetch(`${__API_URL__}/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName,
          companyUEN,
          payNowMobile,
          paynowEnabled,
          razorpayEnabled,
          razorpayKeyId,
          ...(razorpayKeySecret ? { razorpayKeySecret } : {}),
          ...(razorpayWebhookSecret ? { razorpayWebhookSecret } : {}),
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        const m = body?.message;
        throw new Error(Array.isArray(m) ? m.join(" ") : m || "Could not save settings.");
      }
      setSettings((await res.json()) as SettingsView);
      setMessage("Payment settings saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save settings.");
    } finally {
      setSavingPayments(false);
    }
  }

  async function loadPreviewQr() {
    setError("");
    setPreviewQr("");
    try {
      const res = await adminFetch(`${__API_URL__}/paynow/preview-qr?amount=1`);
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message || "Could not generate the preview QR.");
      }
      const { qr } = (await res.json()) as { qr: string };
      setPreviewQr(qr);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not generate the preview QR.");
    }
  }

  async function saveEmail(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const body: Record<string, unknown> = {
      enabled: fd.get("enabled") === "on",
      fromName: String(fd.get("fromName") ?? ""),
      fromEmail: String(fd.get("fromEmail") ?? ""),
      smtpHost: String(fd.get("smtpHost") ?? ""),
      smtpPort: Number(fd.get("smtpPort") ?? 465),
      smtpSecure: fd.get("smtpSecure") === "on",
      smtpUser: String(fd.get("smtpUser") ?? ""),
    };
    const smtpPass = String(fd.get("smtpPass") ?? "");
    if (smtpPass) body.smtpPass = smtpPass; // blank = keep existing (eventsh convention)

    setSavingEmail(true);
    setError("");
    try {
      const res = await adminFetch(`${__API_URL__}/eventsh/organizers/${ORGANIZER_ID}/email-config`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const b = await res.json().catch(() => null);
        throw new Error(b?.message || "Could not save email settings.");
      }
      await load();
      setMessage("Email settings saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save email settings.");
    } finally {
      setSavingEmail(false);
    }
  }

  async function testEmail() {
    setTestingEmail(true);
    setError("");
    setMessage("");
    try {
      const res = await adminFetch(`${__API_URL__}/eventsh/organizers/${ORGANIZER_ID}/email-config/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: testRecipient }),
      });
      if (!res.ok) {
        const b = await res.json().catch(() => null);
        throw new Error(b?.message || "Test email failed.");
      }
      setMessage("Test email sent.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Test email failed.");
    } finally {
      setTestingEmail(false);
    }
  }

  const formatRevenue = (minor: number, currency: string) => {
    const amount = minor / 100;
    if (currency === "SGD") return `S$${amount.toLocaleString("en-SG", { minimumFractionDigits: 2 })}`;
    return `${currency} ${amount.toLocaleString()}`;
  };

  return (
    <div className="flex w-full flex-col gap-8">
      <PageHeading
        title="Settings"
        description="Payments, email, and what the platform can see."
      />

      {error && (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-200">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="rounded-xl bg-[var(--accent-soft)] px-4 py-3 text-sm text-[var(--accent-on-soft)]">
          {message}
        </p>
      )}

      {/* ---- Payments ------------------------------------------------------ */}
      <Panel className="p-6">
        <h2 className="text-lg">Payments</h2>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          The PayNow QR carries this company identity; buyers scan it with any Singapore banking app.
        </p>
        {!settings && (
          <p className="mt-4 text-sm text-[var(--text-muted)]">Loading…</p>
        )}
        {settings && <form onSubmit={savePayments} className="mt-5 flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Company name" htmlFor="s-company" hint="Shown as the payee on the QR">
              <Input id="s-company" name="companyName" defaultValue={settings?.companyName} />
            </Field>
            <Field label="Company UEN" htmlFor="s-uen" hint="e.g. 202012345K, 12345678A or T08LL1234K">
              <Input id="s-uen" name="companyUEN" defaultValue={settings?.companyUEN} placeholder="202012345K" />
            </Field>
            <Field label="PayNow mobile (fallback)" htmlFor="s-mobile" hint="Used only when no UEN is set">
              <Input id="s-mobile" name="payNowMobile" defaultValue={settings?.payNowMobile} placeholder="+65 9123 4567" />
            </Field>
            <div className="flex items-end gap-2">
              <Button type="button" variant="secondary" onClick={loadPreviewQr}>
                <Icon name="scan" size={15} />
                Preview QR
              </Button>
            </div>
          </div>

          {previewQr && (
            <div className="flex items-center gap-4 rounded-xl bg-[var(--surface-sunken)] p-4">
              <img src={previewQr} alt="PayNow preview" className="h-32 w-32 rounded-lg bg-white p-1" />
              <p className="text-sm text-[var(--text-secondary)]">
                Scan with your banking app — it should show the company name and S$1.00.
              </p>
            </div>
          )}

          <div className="flex flex-wrap gap-4">
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input type="checkbox" name="paynowEnabled" defaultChecked={settings?.paynowEnabled} className="h-4 w-4 accent-[var(--accent)]" />
              Accept PayNow
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input type="checkbox" name="razorpayEnabled" defaultChecked={settings?.razorpayEnabled} className="h-4 w-4 accent-[var(--accent)]" />
              Accept card / UPI payments (Razorpay)
            </label>
          </div>

          <div className="rounded-xl border border-[var(--border-subtle)] p-4">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">Razorpay</h3>
              {settings?.razorpayConfigured ? (
                <Badge tone="success">Configured</Badge>
              ) : (
                <Badge tone="neutral">Not configured</Badge>
              )}
            </div>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              Keys come from dashboard.razorpay.com (test keys start with rzp_test_). Secrets are stored encrypted and never shown again after saving.
            </p>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <Field label="Key ID" htmlFor="s-rkid">
                <Input id="s-rkid" name="razorpayKeyId" defaultValue={settings?.razorpayKeyId} placeholder="rzp_live_…" />
              </Field>
              <Field label="Key secret" htmlFor="s-rks">
                <Input id="s-rks" name="razorpayKeySecret" type="password" autoComplete="new-password" placeholder={settings?.razorpayConfigured ? "•••••• (leave blank to keep)" : ""} />
              </Field>
              <Field label="Webhook secret" htmlFor="s-rkws">
                <Input id="s-rkws" name="razorpayWebhookSecret" type="password" autoComplete="new-password" placeholder={settings?.razorpayConfigured ? "•••••• (leave blank to keep)" : ""} />
              </Field>
            </div>
          </div>

          <div>
            <Button type="submit" disabled={savingPayments}>
              {savingPayments ? "Saving…" : "Save payment settings"}
            </Button>
          </div>
        </form>}
      </Panel>

      {/* ---- Email --------------------------------------------------------- */}
      <Panel className="p-6">
        <h2 className="text-lg">Email</h2>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Ticket emails (with the QR PDF) are generated and sent by the event platform — this SMTP config tells it who to send from. Leave disabled to use the platform default sender.
        </p>
        {emailUnavailable ? (
          <p className="mt-4 text-sm text-[var(--text-muted)]">Email settings are temporarily unavailable — please try again later.</p>
        ) : !email ? (
          <p className="mt-4 text-sm text-[var(--text-muted)]">Loading…</p>
        ) : (
          <form onSubmit={saveEmail} className="mt-5 flex flex-col gap-4">
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input type="checkbox" name="enabled" defaultChecked={email?.enabled} className="h-4 w-4 accent-[var(--accent)]" />
              Send from my own SMTP server
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="From name" htmlFor="e-fromname">
                <Input id="e-fromname" name="fromName" defaultValue={email?.fromName} />
              </Field>
              <Field label="From email" htmlFor="e-fromemail">
                <Input id="e-fromemail" name="fromEmail" type="email" defaultValue={email?.fromEmail} />
              </Field>
              <Field label="SMTP host" htmlFor="e-host">
                <Input id="e-host" name="smtpHost" defaultValue={email?.smtpHost} placeholder="smtp.gmail.com" />
              </Field>
              <Field label="SMTP port" htmlFor="e-port">
                <Input id="e-port" name="smtpPort" type="number" defaultValue={email?.smtpPort ?? 465} />
              </Field>
              <Field label="SMTP user" htmlFor="e-user">
                <Input id="e-user" name="smtpUser" defaultValue={email?.smtpUser} />
              </Field>
              <Field label="SMTP password" htmlFor="e-pass">
                <Input
                  id="e-pass"
                  name="smtpPass"
                  type="password"
                  autoComplete="new-password"
                  placeholder={email?.hasPassword ? "•••••• (leave blank to keep)" : ""}
                />
              </Field>
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input type="checkbox" name="smtpSecure" defaultChecked={email?.smtpSecure} className="h-4 w-4 accent-[var(--accent)]" />
              Use SSL (smtpSecure)
            </label>

            <div className="flex flex-wrap items-end gap-3">
              <Button type="submit" disabled={savingEmail}>
                {savingEmail ? "Saving…" : "Save email settings"}
              </Button>
              <Field label="Test recipient" htmlFor="e-testto" className="min-w-56 flex-1">
                <Input
                  id="e-testto"
                  type="email"
                  value={testRecipient}
                  onChange={(e) => setTestRecipient(e.target.value)}
                  placeholder="you@company.com"
                />
              </Field>
              <Button type="button" variant="secondary" onClick={testEmail} disabled={testingEmail || !testRecipient}>
                {testingEmail ? "Sending…" : "Send test"}
              </Button>
            </div>
          </form>
        )}
      </Panel>

      {/* ---- Billing ------------------------------------------------------- */}
      <Panel className="p-6">
        <h2 className="text-lg">Billing snapshot</h2>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          What the event platform reports about this account — the same figures its Super Admin sees.
        </p>
        <div className="mt-4 grid grid-cols-3 gap-4 text-center">
          <div className="rounded-xl bg-[var(--surface-sunken)] p-4">
            <p className="text-2xl font-semibold text-[var(--text-primary)]">{stats?.events ?? "—"}</p>
            <p className="mt-1 text-xs text-[var(--text-muted)]">Events</p>
          </div>
          <div className="rounded-xl bg-[var(--surface-sunken)] p-4">
            <p className="text-2xl font-semibold text-[var(--text-primary)]">{stats?.ticketsSold ?? "—"}</p>
            <p className="mt-1 text-xs text-[var(--text-muted)]">Tickets sold</p>
          </div>
          <div className="rounded-xl bg-[var(--surface-sunken)] p-4">
            <p className="text-2xl font-semibold text-[var(--text-primary)]">
              {stats ? formatRevenue(stats.revenue, stats.revenueCurrency) : "—"}
            </p>
            <p className="mt-1 text-xs text-[var(--text-muted)]">Ticket revenue</p>
          </div>
        </div>
      </Panel>
    </div>
  );
}
