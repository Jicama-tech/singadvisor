import { useEffect, useState } from "react";
import { Field, Input, Select } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { formatPrice } from "@/lib/utils";
import type { VisitorType } from "@/lib/events-client";

const BACKEND_URL = __API_URL__;

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

/** Loads Razorpay's Checkout.js exactly once, however many times this is called. */
let checkoutScriptPromise: Promise<void> | null = null;
function loadRazorpayCheckout(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  if (!checkoutScriptPromise) {
    checkoutScriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Could not load the payment form. Check your connection and try again."));
      document.body.appendChild(script);
    });
  }
  return checkoutScriptPromise;
}

/** Buyer-facing payment-method availability (GET /settings/public). */
type PayMethods = {
  paynowEnabled: boolean;
  paynowPayeeId: string;
  paynowPayeeName: string;
  razorpayEnabled: boolean;
};

type PaynowOrder = {
  orderId: string;
  paynowRef: string;
  amount: number; // minor units
  amountMajor: number;
  currency: string;
  qrDataUrl: string;
};

type Status = "idle" | "submitting" | "success" | "error";

export function TicketPurchaseForm({
  eventId,
  eventTitle,
  visitorTypes,
  currency,
}: {
  eventId: string;
  eventTitle: string;
  visitorTypes: VisitorType[];
  currency: string;
}) {
  const activeTiers = visitorTypes.filter((t) => t.isActive && t.maxCount - t.soldCount > 0);
  const [tierId, setTierId] = useState(activeTiers[0]?.id ?? "");
  const [quantity, setQuantity] = useState(1);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const [ticketId, setTicketId] = useState("");
  const [payMethods, setPayMethods] = useState<PayMethods | null>(null);
  const [method, setMethod] = useState<"razorpay" | "paynow" | null>(null);
  const [paynowOrder, setPaynowOrder] = useState<PaynowOrder | null>(null);
  const [paynowConfirming, setPaynowConfirming] = useState(false);

  const tier = activeTiers.find((t) => t.id === tierId);
  const remaining = tier ? tier.maxCount - tier.soldCount : 0;
  const isFree = (tier?.price ?? 0) <= 0;

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/settings/public`);
        if (res.ok && !cancelled) setPayMethods((await res.json()) as PayMethods);
      } catch {
        /* no methods — the form shows the "being set up" notice */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Which methods are actually usable for this (paid) purchase.
  const enabledMethods: ("razorpay" | "paynow")[] =
    !payMethods || isFree
      ? []
      : [
          ...(payMethods.razorpayEnabled ? (["razorpay"] as const) : []),
          ...(payMethods.paynowEnabled ? (["paynow"] as const) : []),
        ];

  // The explicit pick wins; with only one enabled method the chooser is
  // not shown, so fall back to that single method.
  const effectiveMethod = method ?? enabledMethods[0] ?? null;

  async function postJson(path: string, body: unknown) {
    const response = await fetch(`${BACKEND_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      const message =
        data && typeof data === "object" && "message" in data && typeof data.message === "string"
          ? data.message
          : `Request failed (${response.status})`;
      throw new Error(message);
    }
    return data;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!tier) return;
    setStatus("submitting");
    setError("");

    const base = { eventId, tierId: tier.id, quantity, customerName: name, customerEmail: email, customerPhone: phone };

    try {
      if (isFree) {
        const ticket = (await postJson("/tickets/free", base)) as { ticketId: string };
        setTicketId(ticket.ticketId);
        setStatus("success");
        return;
      }

      if (effectiveMethod === "paynow") {
        // Step 1 — server generates the dynamic QR (amount embedded).
        const order = (await postJson("/tickets/checkout/paynow", base)) as PaynowOrder;
        setPaynowOrder(order);
        setStatus("idle");
        return;
      }

      await loadRazorpayCheckout();
      const order = (await postJson("/tickets/checkout/order", base)) as {
        orderId: string;
        amount: number;
        currency: string;
        keyId: string;
      };

      const razorpay = new window.Razorpay!({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        order_id: order.orderId,
        name: "SingAdvisor",
        description: eventTitle,
        prefill: { name, email, contact: phone },
        handler: async (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
          try {
            const ticket = (await postJson("/tickets", {
              ...base,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            })) as { ticketId: string };
            setTicketId(ticket.ticketId);
            setStatus("success");
          } catch (err) {
            setError(err instanceof Error ? err.message : "Payment succeeded but the ticket could not be confirmed — contact us with your payment reference.");
            setStatus("error");
          }
        },
        modal: {
          ondismiss: () => setStatus("idle"),
        },
      });
      razorpay.open();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setStatus("error");
    }
  }

  async function confirmPaynow() {
    if (!paynowOrder) return;
    setPaynowConfirming(true);
    setError("");
    try {
      const ticket = (await postJson("/tickets/paynow-confirm", {
        orderId: paynowOrder.orderId,
      })) as { ticketId: string };
      setTicketId(ticket.ticketId);
      setStatus("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "We could not confirm the payment — contact us with your payment reference.");
    } finally {
      setPaynowConfirming(false);
    }
  }

  if (status === "success") {
    return (
      <div className="rounded-[var(--radius-card)] surface-sunken p-5 text-center">
        <p className="font-medium text-[var(--text-primary)]">You&apos;re confirmed!</p>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Ticket <span className="font-mono">{ticketId}</span> — check your email for the QR code.
        </p>
      </div>
    );
  }

  // PayNow step 2 — the QR screen (eventsh's ticketPaymentPage pattern).
  if (paynowOrder && effectiveMethod === "paynow") {
    return (
      <div className="flex flex-col items-center gap-4 rounded-[var(--radius-card)] surface-sunken p-5 text-center">
        <p className="font-medium text-[var(--text-primary)]">Scan with any PayNow app</p>
        <img
          src={paynowOrder.qrDataUrl}
          alt={`PayNow QR for ${formatPrice(paynowOrder.amount, paynowOrder.currency)}`}
          className="h-52 w-52 rounded-lg bg-white p-2"
        />
        <p className="text-sm text-[var(--text-secondary)]">
          Paying <span className="font-semibold">{payMethods?.paynowPayeeName}</span>{" "}
          ({payMethods?.paynowPayeeId}) —{" "}
          <span className="font-semibold text-[var(--text-primary)]">
            {formatPrice(paynowOrder.amount, paynowOrder.currency)}
          </span>
        </p>
        <p className="text-xs text-[var(--text-muted)]">
          Reference: <span className="font-mono">{paynowOrder.paynowRef}</span>
        </p>
        <Button onClick={confirmPaynow} disabled={paynowConfirming}>
          {paynowConfirming ? "Confirming…" : "I have paid"}
        </Button>
        <button
          type="button"
          onClick={() => setPaynowOrder(null)}
          className="text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          Back
        </button>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    );
  }

  if (activeTiers.length === 0) {
    return (
      <p className="text-sm text-[var(--text-secondary)]">
        Every ticket tier is sold out.
      </p>
    );
  }

  const noMethodAvailable = !!(payMethods && !isFree && enabledMethods.length === 0);
  const chosenMethod = effectiveMethod;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {activeTiers.length > 1 && (
        <Field label="Ticket type" htmlFor="tp-tier">
          <Select id="tp-tier" value={tierId} onChange={(e) => setTierId(e.target.value)}>
            {activeTiers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} — {formatPrice(Math.round(t.price * 100), currency)}
              </option>
            ))}
          </Select>
        </Field>
      )}

      {!isFree && enabledMethods.length > 1 && (
        <fieldset className="flex flex-col gap-1.5">
          <legend className="text-sm font-medium text-[var(--text-primary)]">Pay with</legend>
          <div className="flex gap-2">
            {enabledMethods.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMethod(m)}
                className={
                  "flex-1 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors " +
                  (chosenMethod === m
                    ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-on-soft)]"
                    : "border-[var(--border-strong)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]")
                }
              >
                {m === "paynow" ? "PayNow" : "Card / UPI"}
              </button>
            ))}
          </div>
        </fieldset>
      )}

      <Field label="Quantity" htmlFor="tp-quantity" hint={`${remaining} left`}>
        <Input
          id="tp-quantity"
          type="number"
          min={1}
          max={Math.max(1, remaining)}
          value={quantity}
          onChange={(e) => setQuantity(Math.max(1, Math.min(remaining, Number(e.target.value) || 1)))}
        />
      </Field>

      <Field label="Name" htmlFor="tp-name" required>
        <Input id="tp-name" required value={name} onChange={(e) => setName(e.target.value)} />
      </Field>

      <Field label="Email" htmlFor="tp-email" required>
        <Input id="tp-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </Field>

      <Field label="Phone" htmlFor="tp-phone" hint="Optional">
        <Input id="tp-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
      </Field>

      {tier && (
        <p className="text-sm font-medium text-[var(--text-primary)]">
          Total: {formatPrice(Math.round(tier.price * quantity * 100), currency)}
        </p>
      )}

      {noMethodAvailable && (
        <p className="flex items-center gap-2 rounded-xl bg-[var(--accent-soft)] px-3 py-2 text-sm text-[var(--accent-on-soft)]">
          <Icon name="alert" size={15} />
          Online payment options are being set up — check back soon.
        </p>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <Button type="submit" disabled={status === "submitting" || noMethodAvailable}>
        {status === "submitting"
          ? "Processing…"
          : isFree
            ? "Get free ticket"
            : chosenMethod === "paynow"
              ? "Get PayNow QR"
              : "Pay and get ticket"}
      </Button>
    </form>
  );
}
