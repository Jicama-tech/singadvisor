
import { useState } from "react";
import {
  registerForEvent,
  registerForTraining,
  type RegistrationPaymentHandle,
} from "@/app/actions";
import { FormError, FormSuccess, SubmitButton, useClientAction } from "@/components/forms/FormShell";
import { RegistrationPaymentStep } from "@/components/forms/RegistrationPaymentStep";
import { Field, Input, Textarea } from "@/components/ui/Field";
// Same Google plumbing the blog feedback form and the admin login use — the
// button, the One Tap/rendered-button fallback and the "is it even configured"
// check all live there.
import {
  GoogleGIcon,
  GoogleSignInButton,
  googleSignInConfigured,
} from "@/components/ui/GoogleSignIn";
import { PhoneField } from "@/components/ui/PhoneField";
import type { FormState } from "@/lib/form-state";

type Props =
  | { kind: "training"; id: string; title: string; maxSeats?: number }
  | { kind: "event"; id: string; title: string; maxSeats?: number };

/**
 * Pull the display fields out of a Google ID token, in the browser.
 *
 * This is cosmetic and nothing else: it prefills the name and shows whose
 * account the booking is going under. It reads the token's own claims without
 * checking a signature, so nothing here may be treated as proof of anything —
 * the Backend re-verifies the same token against Google's public keys and takes
 * the stored address from *that*, never from this form. A doctored or simply
 * unreadable token therefore costs an empty prefill and nothing more.
 *
 * The middle segment is base64url (`-`/`_`, no padding), which `atob` alone
 * rejects, and the name may be any UTF-8 — hence the two conversions rather
 * than the bare `atob(...)` a payload of pure ASCII would get away with.
 */
function readGoogleProfile(credential: string): { email: string; name: string } {
  try {
    const segment = credential.split(".")[1] ?? "";
    const base64 = segment.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    const json = decodeURIComponent(
      atob(padded)
        .split("")
        .map((char) => `%${char.charCodeAt(0).toString(16).padStart(2, "0")}`)
        .join(""),
    );
    const payload = JSON.parse(json) as { email?: unknown; name?: unknown };
    return {
      email: typeof payload.email === "string" ? payload.email : "",
      name: typeof payload.name === "string" ? payload.name : "",
    };
  } catch {
    return { email: "", name: "" };
  }
}

export function RegistrationForm(props: Props) {
  /** Set only where the Backend says this booking owes money — see `submit`. */
  const [payment, setPayment] = useState<RegistrationPaymentHandle | null>(null);

  /**
   * `useClientAction` is FormState in, FormState out, and a payment handle is
   * no part of that shape — so the training action's extra key is peeled off
   * here on the way through rather than pushed onto the type every form in the
   * app shares. A free programme sends none, which is precisely what leaves its
   * success path untouched.
   */
  async function submit(formData: FormData): Promise<FormState> {
    if (props.kind !== "training") return registerForEvent(formData);
    const { payment: handle, ...result } = await registerForTraining(formData);
    setPayment(handle ?? null);
    return result;
  }

  const { state, pending, onSubmit } = useClientAction(submit);

  /**
   * Whether this form asks for a Google sign-in before anything else.
   *
   * Two conditions, both deliberate. Trainings only: legacy event RSVPs were
   * superseded by eventsh's ticket flow, `registerForEvent` is a stub that says
   * so, and putting a sign-in step in front of a path that no longer books
   * anything would be all risk and no gain. And only where a real client id was
   * built into the bundle: `<GoogleSignInButton>` renders nothing at all
   * otherwise, so gating an unconfigured deployment would leave it unable to
   * take a single booking. That deployment keeps the typed email field it always
   * had, and the Backend accepts a typed address in exactly that case and no
   * other — the fork is server config, which no request can influence.
   */
  const clientId = __GOOGLE_CLIENT_ID__;
  const gated = props.kind === "training" && googleSignInConfigured(clientId);

  const [credential, setCredential] = useState<string | null>(null);
  const [signInError, setSignInError] = useState<string | null>(null);

  // A paid programme's success state *is* the payment step — the QR, the
  // amount and the "I have paid" button. A free one keeps the message it has
  // always shown, because `payment` stays null for it.
  if (state.ok && payment) return <RegistrationPaymentStep payment={payment} />;
  if (state.ok && state.message) return <FormSuccess message={state.message} />;

  const idField = props.kind === "training" ? "trainingId" : "eventId";
  const verb = props.kind === "training" ? "Reserve my place" : "Register";
  const profile = credential ? readGoogleProfile(credential) : null;

  // Step one. Nothing else is on screen yet: asking for a name and a phone
  // number and then throwing up a sign-in wall would make people fill the form
  // twice, and the name field wants the Google name to start from anyway.
  if (gated && !credential) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-[var(--radius-card)] border border-[var(--border-subtle)] surface-sunken px-5 py-8 text-center">
        <span className="grid h-11 w-11 place-items-center rounded-full bg-[var(--surface)] shadow-[var(--shadow-soft)]">
          <GoogleGIcon />
        </span>
        <p className="max-w-xs text-sm text-[var(--text-secondary)]">
          Start by signing in with Google, so we can confirm your place and email
          you the details.
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
        <p className="text-xs text-[var(--text-muted)]">
          We only read your name and email address.
        </p>
      </div>
    );
  }

  // Step two: everything else. Reached straight away on the ungated paths.
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      <input type="hidden" name={idField} value={props.id} />
      {credential && <input type="hidden" name="credential" value={credential} />}

      <FormError state={state} />

      {profile && (
        /* The address, read-only and visibly Google's. Deliberately not a form
           field: it carries no `name`, so FormData never includes an email at
           all and there is nothing for a hand-rolled request to overwrite. The
           server reads it off the token it verified. */
        <div className="rounded-xl border border-[var(--border-subtle)] surface-sunken px-4 py-3">
          <p className="text-xs text-[var(--text-muted)]">Email, from your Google account</p>
          <p className="mt-1.5 flex items-center gap-2 text-sm font-medium text-[var(--text-primary)]">
            <GoogleGIcon />
            <span className="min-w-0 truncate">{profile.email || "Signed in with Google"}</span>
          </p>
          <button
            type="button"
            onClick={() => {
              setCredential(null);
              setSignInError(null);
            }}
            className="mt-2 text-xs font-medium text-[var(--accent)] hover:underline"
          >
            Use a different Google account
          </button>
        </div>
      )}

      <Field label="Full name" htmlFor="reg-name" required error={state.errors?.name}>
        <Input
          id="reg-name"
          // Google's name is the starting point, not the answer: whatever is in
          // the box when it is submitted wins. (`state.values` first so a failed
          // submit does not throw away a correction.)
          defaultValue={state.values?.name ?? profile?.name}
          name="name"
          required
          autoComplete="name"
          placeholder="Jane Tan"
          aria-invalid={!!state.errors?.name}
        />
      </Field>

      {!gated && (
        <Field label="Email" htmlFor="reg-email" required error={state.errors?.email}>
          <Input
            id="reg-email"
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

      {/* The contact number gets its own full-width row and a size up on every
          control in it — it used to be one half of a two-column grid, which put
          a long international number into the narrowest box on the form. Sized
          from the outside, the way RichTextEditor styles Quill, because
          PhoneField takes no className and a dozen other screens share it. */}
      <div className="[&_label]:text-base [&_input]:py-4 [&_input]:text-lg [&_select]:py-4 [&_select]:text-base">
        <PhoneField
          name="phone"
          label="Contact number"
          hint="The fastest way to reach you if anything about the session changes."
          required
          defaultValue={state.values?.phone}
          error={state.errors?.phone}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Organisation"
          htmlFor="reg-company"
          hint="Optional"
          error={state.errors?.company}
        >
          <Input
            id="reg-company"
            defaultValue={state.values?.company}
            name="company"
            autoComplete="organization"
            placeholder="Acme Pte Ltd"
          />
        </Field>

        <Field
          label="Number of seats"
          htmlFor="reg-seats"
          hint={
            props.maxSeats
              ? `${props.maxSeats} seat${props.maxSeats === 1 ? "" : "s"} remaining`
              : "Booking for a group? Enter the total here."
          }
          error={state.errors?.seats}
        >
          <Input
            id="reg-seats"
            name="seats"
            type="number"
            min={1}
            max={props.maxSeats ?? 50}
            defaultValue={state.values?.seats ?? 1}
            className="max-w-32"
            aria-invalid={!!state.errors?.seats}
          />
        </Field>
      </div>

      <Field
        label="Anything we should know?"
        htmlFor="reg-message"
        hint="Dietary requirements, accessibility needs, or what you're hoping to get out of it."
        error={state.errors?.message}
      >
        <Textarea
          id="reg-message"
          name="message"
          rows={3}
          defaultValue={state.values?.message}
        />
      </Field>

      <SubmitButton pending={pending} pendingLabel="Submitting…" className="w-full sm:w-auto">
        {verb}
      </SubmitButton>

      <p className="text-xs text-[var(--text-muted)]">
        We use your details only to manage this booking. No marketing without
        your say-so.
      </p>
    </form>
  );
}
