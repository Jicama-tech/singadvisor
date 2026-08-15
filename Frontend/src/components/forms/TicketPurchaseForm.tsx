"use client";

import { useState } from "react";
import { Field, Input, Select } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { formatPrice } from "@/lib/utils";
import type { VisitorType } from "@/lib/events-client";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? "";

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

  const tier = activeTiers.find((t) => t.id === tierId);
  const remaining = tier ? tier.maxCount - tier.soldCount : 0;
  const isFree = (tier?.price ?? 0) <= 0;

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

  if (activeTiers.length === 0) {
    return (
      <p className="text-sm text-[var(--text-secondary)]">
        Every ticket tier is sold out.
      </p>
    );
  }

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

      {error && <p className="text-sm text-[var(--color-danger,#dc2626)]">{error}</p>}

      <Button type="submit" disabled={status === "submitting"}>
        {status === "submitting" ? "Processing…" : isFree ? "Get free ticket" : "Pay and get ticket"}
      </Button>
    </form>
  );
}
