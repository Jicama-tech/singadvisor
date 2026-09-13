import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  claimRegistrationPayment,
  fetchRegistrationPayment,
  type RegistrationPaymentHandle,
  type RegistrationPaymentView,
} from "@/app/actions";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { formatPrice } from "@/lib/utils";

/**
 * What a paid enrolment sees instead of the plain success message: the PayNow
 * QR for the amount this booking was taken at, and a button to say the
 * transfer has been made.
 *
 * That button is the whole reason this is a separate step rather than a line
 * of copy. Pressing it is a *claim* — PayNow hands back no callback anyone can
 * check a transfer against, so nothing here can confirm a place or record a
 * payment. It tells the office to go and look at the bank statement, and the
 * copy below never says more than that.
 *
 * The amount and the reference are both the Backend's: this component is given
 * a registration id and asks for the QR, it does not know a price and has no
 * way to influence one. The QR carries the amount with EMVCo's non-editable
 * flag set, which is why the panel can promise it cannot be altered in the
 * banking app.
 */
export function RegistrationPaymentStep({
  payment,
}: {
  payment: RegistrationPaymentHandle;
}) {
  const [view, setView] = useState<RegistrationPaymentView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [payerReference, setPayerReference] = useState("");
  const [claiming, setClaiming] = useState(false);
  const [deferred, setDeferred] = useState(false);

  const { registrationId } = payment;

  const loadQr = useCallback(async () => {
    setError(null);
    try {
      setView(await fetchRegistrationPayment(registrationId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "We could not load your payment details.");
    }
  }, [registrationId]);

  useEffect(() => {
    void loadQr();
  }, [loadQr]);

  async function claim() {
    setClaiming(true);
    setError(null);
    try {
      setView(await claimRegistrationPayment(registrationId, payerReference));
    } catch (err) {
      setError(err instanceof Error ? err.message : "We could not record your payment.");
    } finally {
      setClaiming(false);
    }
  }

  // An admin got to the bank statement first — between this page loading and
  // the button being pressed, or simply before either. Nothing is owed.
  if (view?.paymentStatus === "paid") {
    return (
      <StepPanel tone="accent">
        <StepIcon name="check" />
        <p className="font-medium text-[var(--text-primary)]">Payment received</p>
        <p className="max-w-sm text-sm text-[var(--text-secondary)]">
          {view.status === "confirmed"
            ? `Your place on ${view.trainingTitle} is confirmed. Nothing further is needed.`
            : `We have your ${formatPrice(view.amountCents, view.currency)} against reference ${view.reference}, and we'll be in touch about your place.`}
        </p>
      </StepPanel>
    );
  }

  // The claim landed. Deliberately does not say "confirmed": somebody still
  // has to find the transfer on the statement, and until they do this booking
  // is a place held and a payment nobody has seen.
  if (view?.paymentStatus === "claimed") {
    return (
      <StepPanel tone="accent">
        <StepIcon name="clock" />
        <p className="font-medium text-[var(--text-primary)]">Thanks — we&apos;ll check for it</p>
        <p className="max-w-sm text-sm text-[var(--text-secondary)]">
          We match every transfer by hand against reference{" "}
          <span className="font-mono">{view.reference}</span>, so your place isn&apos;t confirmed
          just yet. We&apos;ll email you within one working day to say it is.
        </p>
        <p className="text-xs text-[var(--text-muted)]">
          Hasn&apos;t the money left your account? Nothing is lost — pay when you can, quoting the
          same reference.
        </p>
      </StepPanel>
    );
  }

  // Chose to pay later. The place is held either way, so this is a real option
  // rather than an escape hatch — but they need the reference to quote.
  if (deferred && view) {
    return (
      <StepPanel tone="sunken">
        <StepIcon name="clock" />
        <p className="font-medium text-[var(--text-primary)]">Your place is reserved</p>
        <p className="max-w-sm text-sm text-[var(--text-secondary)]">
          {formatPrice(view.amountCents, view.currency)} is due for{" "}
          {view.trainingTitle}. When you pay, quote reference{" "}
          <span className="font-mono">{view.reference}</span> so we can match it to your booking.
        </p>
        <Button type="button" variant="secondary" size="sm" onClick={() => setDeferred(false)}>
          Show the QR again
        </Button>
      </StepPanel>
    );
  }

  /* The booking stands regardless — it was created before this panel ever ran,
     and a QR we could not produce is our problem, not the registrant's. PayNow
     being unconfigured surfaces here as the Backend's own words ("set the
     company UEN and name in Settings"), which is the message that actually
     gets the deployment fixed. */
  if (error && !view) {
    return (
      <StepPanel tone="sunken">
        <StepIcon name="alert" />
        <p className="font-medium text-[var(--text-primary)]">Your place is reserved</p>
        <p className="max-w-sm text-sm text-[var(--text-secondary)]">
          We couldn&apos;t put a payment code on screen just now, but the{" "}
          {formatPrice(payment.amountCents, payment.currency)} is still due — we&apos;ll email you
          how to pay it, and nothing else is needed from you.
        </p>
        <p className="max-w-sm text-xs text-[var(--text-muted)]">{error}</p>
        <Button type="button" variant="secondary" size="sm" onClick={() => void loadQr()}>
          Try again
        </Button>
      </StepPanel>
    );
  }

  if (!view?.payment) {
    return (
      <StepPanel tone="sunken">
        <p className="text-sm text-[var(--text-secondary)]">Preparing your payment code…</p>
      </StepPanel>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="font-medium text-[var(--text-primary)]">
          Your place is held — pay to confirm it
        </p>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Scan this with any Singapore banking app. The amount and the reference are already in the
          code, and the amount is locked — your bank won&apos;t let it be edited.
        </p>
      </div>

      <div className="grid gap-5 rounded-[var(--radius-card)] surface-sunken p-5 sm:grid-cols-[auto_1fr]">
        {/* White plate behind the QR: scanners struggle against a dark
            background, and this page follows the viewer's theme. */}
        <div className="mx-auto rounded-xl bg-white p-3 shadow-[var(--shadow-soft)]">
          <img
            src={view.payment.qr}
            alt={`PayNow QR for ${formatPrice(view.amountCents, view.currency)}`}
            className="h-52 w-52 max-w-full"
          />
        </div>
        <div className="flex flex-col gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-[var(--text-muted)]">Amount</p>
            <p className="text-2xl font-semibold text-[var(--text-primary)]">
              {formatPrice(view.amountCents, view.currency)}
            </p>
            <p className="text-xs text-[var(--text-muted)]">
              {view.seats} seat{view.seats === 1 ? "" : "s"} on {view.trainingTitle}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-[var(--text-muted)]">Pay to</p>
            <p className="text-sm font-medium text-[var(--text-primary)]">
              {view.payment.payeeName}
            </p>
            <p className="font-mono text-xs text-[var(--text-secondary)]">
              {view.payment.payeeId}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-[var(--text-muted)]">Reference</p>
            <p className="font-mono text-sm text-[var(--text-primary)]">{view.reference}</p>
          </div>
        </div>
      </div>

      <Field
        label="Your bank's reference"
        htmlFor="reg-payer-ref"
        hint="Optional — the transaction id your app shows, which helps us find your transfer faster."
      >
        <Input
          id="reg-payer-ref"
          value={payerReference}
          onChange={(e) => setPayerReference(e.target.value)}
          maxLength={120}
          className="max-w-xs"
        />
      </Field>

      {error && (
        <p role="alert" className="text-sm font-medium text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" onClick={() => void claim()} disabled={claiming}>
          {claiming ? "Recording…" : "I have paid"}
        </Button>
        <button
          type="button"
          onClick={() => setDeferred(true)}
          className="text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          I&apos;ll pay later
        </button>
      </div>

      <p className="text-xs text-[var(--text-muted)]">
        We confirm every transfer by hand, so pressing the button tells us to go looking — it
        doesn&apos;t confirm your place on its own.
      </p>
    </div>
  );
}

/** The step's one-message states all share this shape. Deliberately local: it
 * is this component's own layout, not a piece of vocabulary other forms should
 * start borrowing. */
function StepPanel({
  tone,
  children,
}: {
  tone: "accent" | "sunken";
  children: ReactNode;
}) {
  return (
    <div
      role="status"
      className={
        "flex flex-col items-center gap-3 rounded-[var(--radius-card)] px-6 py-10 text-center " +
        (tone === "accent"
          ? "border border-[var(--accent)]/25 bg-[var(--accent-soft)]"
          : "surface-sunken")
      }
    >
      {children}
    </div>
  );
}

function StepIcon({ name }: { name: "check" | "clock" | "alert" }) {
  return (
    <span className="grid h-12 w-12 place-items-center rounded-full bg-[var(--surface)] text-[var(--accent)] shadow-[var(--shadow-soft)]">
      <Icon name={name} size={22} />
    </span>
  );
}
