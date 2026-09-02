
import { useState } from "react";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { PhoneField } from "@/components/ui/PhoneField";
import { Button } from "@/components/ui/Button";
import { formatPrice } from "@/lib/utils";
import type { SponsorType } from "@/lib/events-client";

const BACKEND_URL = __API_URL__;

type Status = "idle" | "submitting" | "paying" | "success" | "error";

/** The PayNow QR for a cash sponsorship — amount and reference already
 * embedded, payee resolved from the UEN in Settings. */
type SponsorQuote = {
  reference: string;
  amount: number;
  currency: string;
  payment: { qr: string; payeeId: string; payeeName: string };
};

/**
 * The public "Become a sponsor" form — applies to one of the event's
 * `sponsorTypes` tiers. Creates a `SponsorRequest` in `Applied` status;
 * the admin then reviews/approves it and, for cash tiers, verifies the
 * manual bank/UPI transfer once the sponsor pays (same proof-of-transfer
 * model as eventsh-v1 — no payment gateway involved for sponsorship money).
 */
export function SponsorApplicationForm({
  eventId,
  sponsorTypes,
}: {
  eventId: string;
  sponsorTypes: SponsorType[];
}) {
  const [sponsorTypeId, setSponsorTypeId] = useState(sponsorTypes[0]?.id ?? "");
  const [companyName, setCompanyName] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [message, setMessage] = useState("");
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  // Set once the application exists and the tier actually costs money.
  const [requestId, setRequestId] = useState<string | null>(null);
  const [quote, setQuote] = useState<SponsorQuote | null>(null);
  const [transactionId, setTransactionId] = useState("");

  const tier = sponsorTypes.find((t) => t.id === sponsorTypeId);

  function toggleOption(opt: string) {
    setSelectedOptions((prev) => (prev.includes(opt) ? prev.filter((o) => o !== opt) : [...prev, opt]));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!tier) return;
    setStatus("submitting");
    setError("");

    try {
      const response = await fetch(`${BACKEND_URL}/sponsor-requests/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId,
          sponsorTypeId: tier.id,
          companyName,
          contactName,
          email,
          phone,
          website,
          message,
          selectedOptions: tier.collectPayment ? undefined : selectedOptions,
        }),
      });
      const data: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        const msg =
          data && typeof data === "object" && "message" in data && typeof data.message === "string"
            ? data.message
            : `Request failed (${response.status})`;
        throw new Error(msg);
      }
      // A cash tier goes to payment rather than straight to "received": the
      // sponsor can pay now instead of waiting for an email. Non-cash tiers
      // (in-kind partners) have nothing to charge, so they finish here.
      const created = (data as { _id?: string } | null) ?? null;
      const id = created?._id ?? null;
      if (tier.collectPayment && tier.price > 0 && id) {
        setRequestId(id);
        try {
          const qrRes = await fetch(`${BACKEND_URL}/sponsor-requests/${id}/paynow-qr`);
          if (qrRes.ok) {
            setQuote((await qrRes.json()) as SponsorQuote);
            setStatus("paying");
            return;
          }
        } catch {
          /* fall through — the application is saved either way */
        }
        // PayNow unconfigured or unreachable: the application still stands,
        // and the old "we'll email you payment details" path still applies.
      }
      setStatus("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setStatus("error");
    }
  }

  /** "I've paid" — records the reference against the application and moves it
   * to PaymentSubmitted for the organizer to verify against the bank. PayNow
   * gives nothing machine-verifiable, same trust model as tickets and slots. */
  async function confirmPaid() {
    if (!requestId) return;
    setError("");
    setStatus("submitting");
    try {
      const res = await fetch(`${BACKEND_URL}/sponsor-requests/${requestId}/payment-submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transactionId: transactionId.trim() || quote?.reference || "PAYNOW",
          paymentMethod: "paynow",
        }),
      });
      if (!res.ok) throw new Error("Could not record your payment.");
      setStatus("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not record your payment.");
      setStatus("paying");
    }
  }

  if (status === "paying" && quote) {
    return (
      <div className="flex flex-col gap-5">
        <div>
          <p className="font-medium text-[var(--text-primary)]">Application received — now pay</p>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Scan with your banking app. The amount and reference are already in
            the code.
          </p>
        </div>

        <div className="grid gap-5 rounded-[var(--radius-card)] surface-sunken p-5 sm:grid-cols-[auto_1fr]">
          {/* White plate behind the QR: scanners struggle with a dark
              background, and this page follows the viewer's theme. */}
          <div className="mx-auto rounded-xl bg-white p-3 shadow-[var(--shadow-soft)]">
            <img src={quote.payment.qr} alt="PayNow QR code" className="h-44 w-44" />
          </div>
          <div className="flex flex-col gap-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-[var(--text-muted)]">Amount</p>
              <p className="text-2xl font-semibold text-[var(--text-primary)]">
                {formatPrice(Math.round(quote.amount * 100), quote.currency)}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-[var(--text-muted)]">Pay to</p>
              <p className="text-sm font-medium text-[var(--text-primary)]">
                {quote.payment.payeeName}
              </p>
              <p className="font-mono text-xs text-[var(--text-secondary)]">
                {quote.payment.payeeId}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-[var(--text-muted)]">Reference</p>
              <p className="font-mono text-sm text-[var(--text-primary)]">{quote.reference}</p>
            </div>
          </div>
        </div>

        <Field
          label="Transaction reference"
          htmlFor="sp-txn"
          hint="Optional — from your banking app, so we can match your payment."
        >
          <Input
            id="sp-txn"
            value={transactionId}
            onChange={(e) => setTransactionId(e.target.value)}
            className="max-w-xs"
          />
        </Field>

        {error && (
          <p role="alert" className="text-sm font-medium text-red-600 dark:text-red-400">
            {error}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" onClick={confirmPaid}>
            I&apos;ve paid
          </Button>
          <button
            type="button"
            onClick={() => setStatus("success")}
            className="text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            I&apos;ll pay later
          </button>
        </div>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="rounded-[var(--radius-card)] surface-sunken p-5 text-center">
        <p className="font-medium text-[var(--text-primary)]">Application received!</p>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          {!tier?.collectPayment
            ? "We'll review it and be in touch."
            : quote
              ? `We'll verify your payment against reference ${quote.reference} and confirm by email.`
              : "We'll review it and email you payment details once approved."}
        </p>
      </div>
    );
  }

  if (sponsorTypes.length === 0) return null;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {sponsorTypes.length > 1 && (
        <Field label="Sponsorship tier" htmlFor="sf-tier">
          <Select
            id="sf-tier"
            value={sponsorTypeId}
            onChange={(e) => {
              setSponsorTypeId(e.target.value);
              setSelectedOptions([]);
            }}
          >
            {sponsorTypes.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} — {t.collectPayment ? formatPrice(Math.round(t.price * 100), "SGD") : "non-cash"}
              </option>
            ))}
          </Select>
        </Field>
      )}

      {tier?.description && <p className="text-sm text-[var(--text-secondary)]">{tier.description}</p>}

      {tier && !tier.collectPayment && tier.customOptions.length > 0 && (
        <Field label="What you can provide" htmlFor="sf-options" hint="Select what you'll contribute instead of paying.">
          <div className="flex flex-wrap gap-2">
            {tier.customOptions.map((opt) => (
              <label
                key={opt}
                className="flex cursor-pointer items-center gap-1.5 rounded-full border border-[var(--border-strong)] px-3 py-1.5 text-sm has-[:checked]:border-[var(--accent)] has-[:checked]:bg-[var(--accent-soft)]"
              >
                <input
                  type="checkbox"
                  checked={selectedOptions.includes(opt)}
                  onChange={() => toggleOption(opt)}
                  className="h-3.5 w-3.5 accent-[var(--accent)]"
                />
                {opt}
              </label>
            ))}
          </div>
        </Field>
      )}

      <Field label="Company name" htmlFor="sf-company" required>
        <Input id="sf-company" required value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
      </Field>

      <Field label="Contact name" htmlFor="sf-contact" required>
        <Input id="sf-contact" required value={contactName} onChange={(e) => setContactName(e.target.value)} />
      </Field>

      <Field label="Email" htmlFor="sf-email" required>
        <Input id="sf-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </Field>

      <PhoneField name="phone" label="Phone" hint="Optional" value={phone} onChange={setPhone} />

      <Field label="Website" htmlFor="sf-website" hint="Optional">
        <Input id="sf-website" value={website} onChange={(e) => setWebsite(e.target.value)} />
      </Field>

      <Field label="Message" htmlFor="sf-message" hint="Optional">
        <Textarea id="sf-message" rows={3} value={message} onChange={(e) => setMessage(e.target.value)} />
      </Field>

      {error && <p className="text-sm text-[var(--color-danger,#dc2626)]">{error}</p>}

      <Button type="submit" disabled={status === "submitting"}>
        {status === "submitting" ? "Submitting…" : "Apply to sponsor"}
      </Button>
    </form>
  );
}
