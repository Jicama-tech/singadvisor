
import { useState } from "react";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { formatPrice } from "@/lib/utils";
import type { SponsorType } from "@/lib/events-client";

const BACKEND_URL = __API_URL__;

type Status = "idle" | "submitting" | "success" | "error";

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
      setStatus("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div className="rounded-[var(--radius-card)] surface-sunken p-5 text-center">
        <p className="font-medium text-[var(--text-primary)]">Application received!</p>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          {tier?.collectPayment
            ? "We'll review it and email you payment details once approved."
            : "We'll review it and be in touch."}
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

      <Field label="Phone" htmlFor="sf-phone" hint="Optional">
        <Input id="sf-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
      </Field>

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
