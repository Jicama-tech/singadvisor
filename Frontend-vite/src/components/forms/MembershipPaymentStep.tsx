import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  claimMembershipPayment,
  fetchMembershipPayment,
  type MembershipPaymentHandle,
  type MembershipPaymentView,
} from "@/actions";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { formatPrice } from "@/lib/utils";

/**
 * What a paid membership sees instead of the plain success message: the PayNow
 * QR for the amount it was bought at, and a button to say the transfer is done.
 *
 * A sibling of RegistrationPaymentStep rather than a generalisation of it. The
 * machinery is the same because the Backend's two payment flows are the same
 * flow, but the copy is not interchangeable: an enrolment is holding a place
 * that already exists, while a membership does not start at all until somebody
 * finds the transfer. Folding both into one component would mean a prop for
 * every sentence, and that file's own note — that its layout is deliberately
 * local, not vocabulary for other forms to borrow — is the author's answer to
 * exactly this question.
 *
 * As there, the amount and the reference are the Backend's. This component is
 * given an id and asks for the QR; it knows no price and can influence none.
 */
export function MembershipPaymentStep({
  payment,
}: {
  payment: MembershipPaymentHandle;
}) {
  const [view, setView] = useState<MembershipPaymentView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [payerReference, setPayerReference] = useState("");
  const [claiming, setClaiming] = useState(false);
  const [deferred, setDeferred] = useState(false);

  const { membershipId } = payment;

  const loadQr = useCallback(async () => {
    setError(null);
    try {
      setView(await fetchMembershipPayment(membershipId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "We could not load your payment details.");
    }
  }, [membershipId]);

  useEffect(() => {
    void loadQr();
  }, [loadQr]);

  async function claim() {
    setClaiming(true);
    setError(null);
    try {
      setView(await claimMembershipPayment(membershipId, payerReference));
    } catch (err) {
      setError(err instanceof Error ? err.message : "We could not record your payment.");
    } finally {
      setClaiming(false);
    }
  }

  // Somebody got to the bank statement first. Verifying the payment is also
  // what starts the membership, so this state can say it is running.
  if (view?.paymentStatus === "paid") {
    return (
      <StepPanel tone="accent">
        <StepIcon name="check" />
        <p className="font-medium text-[var(--text-primary)]">Payment received</p>
        <p className="max-w-sm text-sm text-[var(--text-secondary)]">
          {view.status === "active"
            ? `Your ${view.planName} membership is active${
                view.endDate
                  ? ` until ${new Date(view.endDate).toLocaleDateString("en-SG", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}`
                  : ""
              }. Nothing further is needed.`
            : `We have your ${formatPrice(view.amountCents, view.currency)} against reference ${view.reference}, and we'll be in touch.`}
        </p>
      </StepPanel>
    );
  }

  // The claim landed. Deliberately does not say the membership has started:
  // somebody still has to find the transfer, and until they do this is a
  // membership bought and a payment nobody has seen.
  if (view?.paymentStatus === "claimed") {
    return (
      <StepPanel tone="accent">
        <StepIcon name="clock" />
        <p className="font-medium text-[var(--text-primary)]">Thanks — we&apos;ll check for it</p>
        <p className="max-w-sm text-sm text-[var(--text-secondary)]">
          We match every transfer by hand against reference{" "}
          <span className="font-mono">{view.reference}</span>, so your membership hasn&apos;t
          started just yet. We&apos;ll email you within one working day to say it has.
        </p>
        <p className="text-xs text-[var(--text-muted)]">
          Hasn&apos;t the money left your account? Nothing is lost — pay when you can, quoting the
          same reference.
        </p>
      </StepPanel>
    );
  }

  // Chose to pay later. Unlike an enrolment there is no place being held, so
  // this says plainly that nothing starts until the payment arrives.
  if (deferred && view) {
    return (
      <StepPanel tone="sunken">
        <StepIcon name="clock" />
        <p className="font-medium text-[var(--text-primary)]">Waiting on your payment</p>
        <p className="max-w-sm text-sm text-[var(--text-secondary)]">
          {formatPrice(view.amountCents, view.currency)} is due for the {view.planName} membership,
          which starts once we&apos;ve matched it. Quote reference{" "}
          <span className="font-mono">{view.reference}</span> when you pay.
        </p>
        <Button type="button" variant="secondary" size="sm" onClick={() => setDeferred(false)}>
          Show the QR again
        </Button>
      </StepPanel>
    );
  }

  /* The membership row exists regardless — it was created before this panel
     ever ran. PayNow being unconfigured surfaces as the Backend's own words,
     which is the message that actually gets the deployment fixed. */
  if (error && !view) {
    return (
      <StepPanel tone="sunken">
        <StepIcon name="alert" />
        <p className="font-medium text-[var(--text-primary)]">We have your details</p>
        <p className="max-w-sm text-sm text-[var(--text-secondary)]">
          We couldn&apos;t put a payment code on screen just now, but the{" "}
          {formatPrice(payment.amountCents, payment.currency)} is still due — we&apos;ll email you
          how to pay it, and your membership starts as soon as it arrives.
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
          Pay to start your membership
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
            <p className="text-xs text-[var(--text-muted)]">{view.planName} membership</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-[var(--text-muted)]">Pay to</p>
            <p className="text-sm font-medium text-[var(--text-primary)]">
              {view.payment.payeeName}
            </p>
            <p className="font-mono text-xs text-[var(--text-secondary)]">{view.payment.payeeId}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-[var(--text-muted)]">Reference</p>
            <p className="font-mono text-sm text-[var(--text-primary)]">{view.reference}</p>
          </div>
        </div>
      </div>

      <Field
        label="Your bank's reference"
        htmlFor="mem-payer-ref"
        hint="Optional — the transaction id your app shows, which helps us find your transfer faster."
      >
        <Input
          id="mem-payer-ref"
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
        We confirm every transfer by hand, so pressing the button tells us to go looking — your
        membership starts when we&apos;ve found it.
      </p>
    </div>
  );
}

/** This component's own layout for its one-message states. Local on purpose,
 * for the reason given at the top of the file. */
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
