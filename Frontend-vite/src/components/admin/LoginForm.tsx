import { useRef, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { FormError, SubmitButton } from "@/components/forms/FormShell";
import { Field, Input } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import type { FormState } from "@/lib/form-state";

export type DemoCredentials = { email: string; password: string };

/**
 * SPA login: calls POST /auth/login through useAuth().login(), then
 * navigates. React 18 has no useActionState, so this tracks its own state.
 */
export function LoginForm({
  next,
  demo,
}: {
  next?: string;
  demo?: DemoCredentials;
}) {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [state, setState] = useState<FormState>({ ok: false });
  const [pending, setPending] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const [filling, setFilling] = useState(false);

  /**
   * Fill both fields and submit in one click.
   *
   * The inputs are uncontrolled, so assigning `.value` directly is the right
   * way to populate them — but React does not observe a direct assignment, so
   * an `input` event is dispatched too. `requestSubmit()` rather than
   * `submit()` so the form's onSubmit still runs.
   */
  function signInAsDemo() {
    if (!demo || filling) return;
    setFilling(true);
    for (const [ref, value] of [
      [emailRef, demo.email],
      [passwordRef, demo.password],
    ] as const) {
      const el = ref.current;
      if (!el) continue;
      el.value = value;
      el.dispatchEvent(new Event("input", { bubbles: true }));
    }
    formRef.current?.requestSubmit();
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");
    if (!email || !password) {
      setState({ ok: false, errors: { email: "Please enter your email and password." } });
      return;
    }
    setPending(true);
    setState({ ok: false });
    try {
      await login(email, password);
      const target = next && next.startsWith("/") && !next.startsWith("//")
        ? next
        : "/admin";
      navigate(target, { replace: true });
    } catch (err) {
      setState({
        ok: false,
        message: err instanceof Error ? err.message : "Sign-in failed.",
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {demo && (
        <section
          aria-labelledby="demo-heading"
          className="rounded-xl border border-dashed border-[var(--accent)]/40 bg-[var(--accent-soft)] p-4"
        >
          <div className="flex items-center gap-2">
            <Icon name="sparkles" size={15} className="text-[var(--accent-on-soft)]" />
            <h2
              id="demo-heading"
              className="text-xs font-semibold uppercase tracking-wider text-[var(--accent-on-soft)]"
            >
              Demo access
            </h2>
          </div>

          <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
            <dt className="text-[var(--accent-on-soft)]/70">Email</dt>
            <dd className="truncate font-mono text-[var(--accent-on-soft)]">
              {demo.email}
            </dd>
            <dt className="text-[var(--accent-on-soft)]/70">Password</dt>
            <dd className="truncate font-mono text-[var(--accent-on-soft)]">
              {demo.password}
            </dd>
          </dl>

          <button
            type="button"
            onClick={signInAsDemo}
            disabled={filling}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[var(--accent)] px-5 py-2.5 text-sm font-medium text-[var(--accent-foreground)] transition-all hover:bg-[var(--accent-hover)] active:scale-[0.98] disabled:opacity-60"
          >
            {filling ? "Signing in…" : "Sign in as demo admin"}
            {!filling && <Icon name="arrow-right" size={15} />}
          </button>
        </section>
      )}

      <form ref={formRef} onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        <FormError state={state} />

        <Field label="Email" htmlFor="login-email" required error={state.errors?.email}>
          <Input
            ref={emailRef}
            id="login-email"
            name="email"
            type="email"
            required
            autoComplete="username"
            autoFocus={!demo}
            placeholder="admin@singadvisor.com"
            aria-invalid={!!state.errors?.email}
          />
        </Field>

        <Field
          label="Password"
          htmlFor="login-password"
          required
          error={state.errors?.password}
        >
          <Input
            ref={passwordRef}
            id="login-password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            aria-invalid={!!state.errors?.password}
          />
        </Field>

        <SubmitButton pending={pending} pendingLabel="Signing in…" className="mt-2 w-full">
          Sign in
        </SubmitButton>
      </form>
    </div>
  );
}
