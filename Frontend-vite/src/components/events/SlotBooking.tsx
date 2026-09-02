import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { PhoneField } from "@/components/ui/PhoneField";
import {
  confirmBooking,
  fetchBookableSpaces,
  quoteBooking,
  type BookableSpace,
  type Quote,
  type SelectedSlot,
} from "@/lib/space-booking-client";
import { formatDate, formatPrice } from "@/lib/utils";

/**
 * Books a court/facility by the time slot.
 *
 * The slots rendered by EventSpaces come off the event document, which has no
 * idea what has already been taken. This component asks the availability
 * endpoint instead, so a slot someone else booked shows as unavailable rather
 * than being offered and then rejected on submit.
 *
 * Renders nothing when the event has no bookable spaces, so an event that
 * sells nothing by the slot is unaffected.
 */
export function SlotBooking({ eventId, currency }: { eventId: string; currency: string }) {
  const [spaces, setSpaces] = useState<BookableSpace[] | null>(null);
  const [picked, setPicked] = useState<SelectedSlot[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [organization, setOrganization] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // The three states of the flow: choosing, paying (a quote is on screen with
  // its QR), then done.
  const [quote, setQuote] = useState<Quote | null>(null);
  const [transactionId, setTransactionId] = useState("");
  const [confirmed, setConfirmed] = useState<{ reference: string; total: number } | null>(null);

  const load = useMemo(
    () => () => {
      void fetchBookableSpaces(eventId).then(setSpaces);
    },
    [eventId],
  );
  useEffect(load, [load]);

  const isPicked = (positionId: string, slotId: string) =>
    picked.some((p) => p.positionId === positionId && p.slotId === slotId);

  function toggle(space: BookableSpace, slotId: string) {
    setPicked((prev) =>
      prev.some((p) => p.positionId === space.positionId && p.slotId === slotId)
        ? prev.filter((p) => !(p.positionId === space.positionId && p.slotId === slotId))
        : [...prev, { positionId: space.positionId, templateId: space.templateId, slotId }],
    );
  }

  const total = picked.reduce((sum, p) => {
    const space = spaces?.find((s) => s.positionId === p.positionId);
    return sum + (space?.price ?? 0);
  }, 0);

  /** Prices the selection and puts a PayNow QR on screen. Nothing is booked
   * yet — the slots are only held once payment is confirmed below. */
  async function requestQuote(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (picked.length === 0) {
      setError("Choose at least one slot.");
      return;
    }
    setSubmitting(true);
    try {
      const q = await quoteBooking(eventId, { name, email, phone, organization }, picked);
      setQuote(q);
      // A free selection has nothing to pay for, so it is booked immediately
      // rather than showing a QR for $0.
      if (!q.payment) {
        const done = await confirmBooking(q.reference);
        setConfirmed({ reference: done.reference, total: done.amount });
        setQuote(null);
        setPicked([]);
        load();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not price those slots.");
    } finally {
      setSubmitting(false);
    }
  }

  /** "I've paid" — PayNow returns nothing a server can verify, so this trusts
   * the payer exactly as the ticket PayNow flow does; the reference is what
   * the organizer reconciles against the bank statement. */
  async function confirmPaid() {
    if (!quote) return;
    setError(null);
    setSubmitting(true);
    try {
      const done = await confirmBooking(quote.reference, transactionId.trim() || undefined);
      setConfirmed({ reference: done.reference, total: done.amount });
      setQuote(null);
      setPicked([]);
      setTransactionId("");
      // Re-read availability so the slots just taken show as booked for
      // anyone still on the page.
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not confirm the booking.");
    } finally {
      setSubmitting(false);
    }
  }

  if (spaces === null) return null;
  const bookable = spaces.filter((s) => (s.slots ?? []).length > 0);
  if (bookable.length === 0) return null;

  if (confirmed) {
    return (
      <section>
        <h2 className="text-2xl">Book a slot</h2>
        <div className="mt-5 rounded-[var(--radius-card)] border border-[var(--border-subtle)] surface-sunken p-6">
          <div className="flex items-start gap-3">
            <Icon name="check" className="mt-0.5 shrink-0 text-[var(--accent)]" />
            <div>
              <p className="font-medium text-[var(--text-primary)]">Booking confirmed</p>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                {formatPrice(Math.round(confirmed.total * 100), currency)} — the organizer will
                be in touch about payment. Keep this reference:
              </p>
              <p className="mt-2 font-mono text-xs text-[var(--text-primary)]">
                {confirmed.reference}
              </p>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="mt-4"
                onClick={() => setConfirmed(null)}
              >
                Book another slot
              </Button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (quote?.payment) {
    return (
      <section>
        <h2 className="text-2xl">Pay to confirm</h2>
        <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
          Scan with your banking app. The amount and reference are already in the
          code — your slots are held once you confirm below.
        </p>

        <div className="mt-5 grid gap-6 rounded-[var(--radius-card)] border border-[var(--border-subtle)] surface-sunken p-6 sm:grid-cols-[auto_1fr]">
          {/* White plate behind the QR: scanners struggle with a dark
              background, and this page follows the viewer's theme. */}
          <div className="mx-auto rounded-xl bg-white p-3 shadow-[var(--shadow-soft)]">
            <img src={quote.payment.qr} alt="PayNow QR code" className="h-48 w-48" />
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

            <ul className="mt-1 flex flex-col gap-1.5 border-t border-[var(--border-subtle)] pt-3">
              {quote.slots.map((s) => (
                <li
                  key={`${s.positionId}-${s.slotId}`}
                  className="flex items-center justify-between gap-3 text-sm text-[var(--text-secondary)]"
                >
                  <span>
                    {s.spaceName} · {s.startTime}–{s.endTime}
                    {s.date && <span className="ml-2 text-xs">{formatDate(s.date)}</span>}
                  </span>
                  <span className="shrink-0 text-[var(--text-primary)]">
                    {formatPrice(Math.round(s.price * 100), quote.currency)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-4">
          <Field
            label="Transaction reference"
            htmlFor="sb-txn"
            hint="Optional — from your banking app, so the organizer can match your payment."
          >
            <Input
              id="sb-txn"
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
            <Button type="button" onClick={confirmPaid} disabled={submitting}>
              {submitting ? "Confirming…" : "I've paid — confirm my slots"}
            </Button>
            <button
              type="button"
              onClick={() => {
                setQuote(null);
                setError(null);
              }}
              className="text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              Back to slots
            </button>
          </div>
          <p className="text-xs text-[var(--text-muted)]">
            Slots are held when you confirm. If the payment does not arrive, the
            organizer will be in touch using the reference above.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section>
      <h2 className="text-2xl">Book a slot</h2>
      <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
        Pick the times you want, then leave your details. Slots already taken are
        shown greyed out.
      </p>

      <form onSubmit={requestQuote} className="mt-5 flex flex-col gap-6">
        {bookable.map((space) => (
          <div
            key={space.positionId}
            className="rounded-[var(--radius-card)] surface-sunken p-5"
          >
            <div className="flex items-baseline justify-between gap-3">
              <p className="font-medium text-[var(--text-primary)]">
                {space.name}
                {space.facilityType && (
                  <span className="ml-2 text-sm font-normal text-[var(--text-secondary)]">
                    {space.facilityType}
                  </span>
                )}
              </p>
              <p className="shrink-0 text-sm font-semibold text-[var(--accent)]">
                {formatPrice(Math.round((space.price ?? 0) * 100), currency)}
                <span className="font-normal text-[var(--text-muted)]"> / slot</span>
              </p>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {space.slots.map((slot) => {
                const taken = Boolean(slot.isBooked);
                const on = isPicked(space.positionId, slot.id);
                return (
                  <button
                    key={slot.id}
                    type="button"
                    disabled={taken}
                    aria-pressed={on}
                    onClick={() => toggle(space, slot.id)}
                    className={[
                      "rounded-full border px-4 py-2 text-sm transition-colors",
                      taken
                        ? "cursor-not-allowed border-[var(--border-subtle)] text-[var(--text-muted)] line-through opacity-60"
                        : on
                          ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-foreground)]"
                          : "border-[var(--border-strong)] text-[var(--text-primary)] hover:border-[var(--accent)]",
                    ].join(" ")}
                  >
                    {slot.startTime}–{slot.endTime}
                    {slot.date && (
                      <span className="ml-2 text-xs opacity-80">{formatDate(slot.date)}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {picked.length > 0 && (
          <div className="flex flex-wrap items-center gap-3 rounded-[var(--radius-card)] border border-[var(--border-subtle)] p-4">
            <Badge tone="accent">
              {picked.length} slot{picked.length === 1 ? "" : "s"} selected
            </Badge>
            <span className="text-sm font-semibold text-[var(--text-primary)]">
              {formatPrice(Math.round(total * 100), currency)}
            </span>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name" htmlFor="sb-name" required>
            <Input id="sb-name" required value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Email" htmlFor="sb-email" required>
            <Input
              id="sb-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
          <PhoneField name="phone" label="Contact number" value={phone} onChange={setPhone} />
          <Field label="Organization" htmlFor="sb-org" hint="Optional">
            <Input
              id="sb-org"
              value={organization}
              onChange={(e) => setOrganization(e.target.value)}
            />
          </Field>
        </div>

        {error && (
          <p role="alert" className="text-sm font-medium text-red-600 dark:text-red-400">
            {error}
          </p>
        )}

        <div>
          <Button type="submit" disabled={submitting || picked.length === 0}>
            {submitting ? "Working…" : "Continue to payment"}
          </Button>
        </div>
      </form>
    </section>
  );
}
