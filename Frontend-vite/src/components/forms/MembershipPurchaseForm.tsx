import { useEffect, useState } from "react";
import {
  fetchMyMembership,
  purchaseMembership,
  type MembershipHeldView,
  type MembershipPaymentHandle,
} from "@/actions";
import { FormError, FormSuccess, SubmitButton, useClientAction } from "@/components/forms/FormShell";
import { MembershipAlreadyHeld } from "@/components/forms/MembershipAlreadyHeld";
import { MembershipPaymentStep } from "@/components/forms/MembershipPaymentStep";
import { Field, Input } from "@/components/ui/Field";
import {
  GoogleGIcon,
  GoogleSignInButton,
  googleSignInConfigured,
} from "@/components/ui/GoogleSignIn";
import { PhoneField } from "@/components/ui/PhoneField";
import type { FormState } from "@/lib/form-state";
import { readGoogleProfile } from "@/lib/googleProfile";

/**
 * Buying a membership.
 *
 * The Google step is not decoration here. A membership is attached to an
 * account, and that account is what opens every members-only article and
 * issue — so an address nobody proved they own would be a way to buy a
 * membership onto somebody else's account, or to read one. The Backend
 * enforces this — it reads the address off the verified token and ignores
 * `email` entirely wherever a client id is configured — and this form simply
 * matches the shape of that rule.
 *
 * The one deployment that still types an address is one with no
 * GOOGLE_CLIENT_ID built into the bundle, where <GoogleSignInButton> renders
 * nothing at all. Gating there would leave it unable to sell anything, so it
 * keeps the typed field, and every row it writes is marked by a null
 * `googleSub`. The fork is server config, which no request can influence.
 */
export function MembershipPurchaseForm({
  planId,
  planName,
  onCancel,
}: {
  planId: string;
  planName: string;
  onCancel?: () => void;
}) {
  /** Set only where the Backend says this membership owes money. A free plan
   * sends no handle, which is what leaves its success path a plain message. */
  const [payment, setPayment] = useState<MembershipPaymentHandle | null>(null);

  /** useClientAction is FormState in, FormState out, and a payment handle is no
   * part of that shape — so the extra key is peeled off here rather than pushed
   * onto the type every form in the app shares. */
  async function submit(formData: FormData): Promise<FormState> {
    const { payment: handle, ...result } = await purchaseMembership(formData);
    setPayment(handle ?? null);
    return result;
  }

  const { state, pending, onSubmit } = useClientAction(submit);

  const clientId = __GOOGLE_CLIENT_ID__;
  const gated = googleSignInConfigured(clientId);

  const [credential, setCredential] = useState<string | null>(null);
  const [signInError, setSignInError] = useState<string | null>(null);

  /**
   * What this Google account already holds, asked as soon as it is known.
   *
   * `undefined` means the question has not been answered yet, `null` means it
   * was and the answer is nothing. The two have to be distinguishable: treating
   * "not asked yet" as "holds nothing" would flash the form up and then replace
   * it, which is worse than a moment of waiting.
   */
  const [held, setHeld] = useState<MembershipHeldView | null | undefined>(undefined);

  /** Set when somebody whose membership has ENDED chooses to buy again. It is
   * never offered for an active one — the Backend refuses that outright, so an
   * override here would only walk them into the error this screen exists to
   * replace. */
  const [renewing, setRenewing] = useState(false);

  useEffect(() => {
    if (!credential) {
      setHeld(undefined);
      setRenewing(false);
      return;
    }
    let cancelled = false;
    setHeld(undefined);
    void (async () => {
      const existing = await fetchMyMembership(credential);
      if (!cancelled) setHeld(existing);
    })();
    return () => {
      cancelled = true;
    };
  }, [credential]);

  /** Back to the sign-in step, and nothing carried over. */
  const useAnotherAccount = () => {
    setCredential(null);
    setSignInError(null);
    setHeld(undefined);
    setRenewing(false);
  };

  // A paid plan's success state IS the payment step. A free one keeps the
  // message, because `payment` stays null for it.
  if (state.ok && payment) return <MembershipPaymentStep payment={payment} />;
  if (state.ok && state.message) return <FormSuccess message={state.message} />;

  const profile = credential ? readGoogleProfile(credential) : null;

  // Step one. Asking for a name and a number and then throwing up a sign-in
  // wall would make people fill the form twice, and the name field wants the
  // Google name to start from anyway.
  if (gated && !credential) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-[var(--radius-card)] border border-[var(--border-subtle)] surface-sunken px-5 py-8 text-center">
        <span className="grid h-11 w-11 place-items-center rounded-full bg-[var(--surface)] shadow-[var(--shadow-soft)]">
          <GoogleGIcon />
        </span>
        <p className="max-w-xs text-sm text-[var(--text-secondary)]">
          Start by signing in with Google. Your membership is tied to that account, and it is how
          members-only articles and issues open for you.
        </p>
        <div className="w-full max-w-xs">
          <GoogleSignInButton
            clientId={clientId}
            onCredential={setCredential}
            onError={setSignInError}
          />
        </div>
        {signInError && (
          <p role="alert" className="text-sm font-medium text-red-600 dark:text-red-400">
            {signInError}
          </p>
        )}
        <p className="text-xs text-[var(--text-muted)]">We only read your name and email address.</p>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            Choose a different plan
          </button>
        )}
      </div>
    );
  }

  // Signed in, and the answer to "do you already have one" is still in flight.
  // The form is deliberately not shown yet — see `held`.
  if (gated && credential && held === undefined) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-[var(--radius-card)] border border-[var(--border-subtle)] surface-sunken px-5 py-10 text-center">
        <span
          aria-hidden="true"
          className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--border-strong)] border-t-[var(--accent)]"
        />
        <p className="text-sm text-[var(--text-secondary)]">Checking your membership…</p>
      </div>
    );
  }

  // This account already has one. An ACTIVE membership is a wall, because the
  // Backend will refuse the purchase anyway; a finished one is only a warning,
  // with the offer to take out a new one.
  if (gated && held && !renewing) {
    const finished = held.status === "expired" || held.status === "cancelled";
    return (
      <div className="flex flex-col gap-4">
        <MembershipAlreadyHeld
          membership={held}
          email={profile?.email}
          onUseAnotherAccount={useAnotherAccount}
          onContinueAnyway={finished ? () => setRenewing(true) : undefined}
        />
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="self-center text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            Back to the plans
          </button>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      <input type="hidden" name="planId" value={planId} />
      {credential && <input type="hidden" name="credential" value={credential} />}

      <FormError state={state} />

      {profile && (
        /* Read-only and visibly Google's. Deliberately not a form field: it
           carries no `name`, so FormData never includes an email at all and
           there is nothing for a hand-rolled request to overwrite. */
        <div className="rounded-xl border border-[var(--border-subtle)] surface-sunken px-4 py-3">
          <p className="text-xs text-[var(--text-muted)]">Email, from your Google account</p>
          <p className="mt-1.5 flex items-center gap-2 text-sm font-medium text-[var(--text-primary)]">
            <GoogleGIcon />
            <span className="min-w-0 truncate">{profile.email || "Signed in with Google"}</span>
          </p>
          <button
            type="button"
            onClick={useAnotherAccount}
            className="mt-2 text-xs font-medium text-[var(--accent)] hover:underline"
          >
            Use a different Google account
          </button>
        </div>
      )}

      <Field label="Full name" htmlFor="mem-name" required error={state.errors?.name}>
        <Input
          id="mem-name"
          // Google's name is the starting point, not the answer: whatever is in
          // the box when it is submitted wins.
          defaultValue={state.values?.name ?? profile?.name}
          name="name"
          required
          autoComplete="name"
          placeholder="Jane Tan"
          aria-invalid={!!state.errors?.name}
        />
      </Field>

      {!gated && (
        <Field label="Email" htmlFor="mem-email" required error={state.errors?.email}>
          <Input
            id="mem-email"
            defaultValue={state.values?.email}
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="jane@company.com"
            aria-invalid={!!state.errors?.email}
          />
        </Field>
      )}

      <PhoneField
        name="phone"
        label="Contact number"
        hint="How we reach you about your membership."
        required
        defaultValue={state.values?.phone}
        error={state.errors?.phone}
      />

      <Field label="Organisation" htmlFor="mem-company" hint="Optional" error={state.errors?.company}>
        <Input
          id="mem-company"
          defaultValue={state.values?.company}
          name="company"
          autoComplete="organization"
          placeholder="Acme Pte Ltd"
        />
      </Field>

      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton pending={pending}>Join {planName}</SubmitButton>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            Choose a different plan
          </button>
        )}
      </div>
    </form>
  );
}
