import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { FormError } from "@/components/forms/FormShell";
import { GoogleSignInButton, googleSignInConfigured } from "@/components/ui/GoogleSignIn";
import type { FormState } from "@/lib/form-state";

/**
 * The dashboard's only sign-in.
 *
 * Passwords were removed from the product entirely — there is no password
 * field here, no POST /auth/login behind it, and no hash stored for anyone.
 * Google proves who someone is; the Backend decides whether that address is
 * allowed in, by looking for an existing admin or an active operator. Adding
 * someone is an admin action in Settings -> Operators, never something this
 * page can do.
 */
export function LoginForm({ next }: { next?: string }) {
  const { loginWithToken } = useAuth();
  const navigate = useNavigate();
  const [state, setState] = useState<FormState>({ ok: false });
  const [pending, setPending] = useState(false);

  const clientId = __GOOGLE_CLIENT_ID__;
  const configured = googleSignInConfigured(clientId);

  /** Rejects an absolute or protocol-relative `next` so the login page can't
   * be used to bounce someone to another site after signing in. */
  const goToTarget = useCallback(() => {
    const target = next && next.startsWith("/") && !next.startsWith("//") ? next : "/admin";
    navigate(target, { replace: true });
  }, [next, navigate]);

  const onCredential = useCallback(
    async (credential: string) => {
      setPending(true);
      setState({ ok: false });
      try {
        const res = await fetch(`${__API_URL__}/auth/google`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ credential }),
        });
        const data = (await res.json().catch(() => null)) as
          | { token?: string; message?: string | string[] }
          | null;
        if (!res.ok || !data?.token) {
          const m = data?.message;
          throw new Error((Array.isArray(m) ? m.join(" ") : m) || "Google sign-in failed.");
        }
        loginWithToken(data.token);
        goToTarget();
      } catch (err) {
        setState({
          ok: false,
          message: err instanceof Error ? err.message : "Google sign-in failed.",
        });
      } finally {
        setPending(false);
      }
    },
    [loginWithToken, goToTarget],
  );

  const onGoogleError = useCallback((message: string) => {
    setState({ ok: false, message });
  }, []);

  // With no password fallback left, an unconfigured OAuth client means nobody
  // can sign in at all — so say that plainly instead of rendering a blank card
  // that looks broken.
  if (!configured) {
    return (
      <div className="flex flex-col gap-3 text-center">
        <p className="text-sm font-medium text-[var(--text-primary)]">
          Sign-in is not configured
        </p>
        <p className="text-sm text-[var(--text-secondary)]">
          This site uses Google sign-in only, and no Google client ID was built
          into it. Set <code className="font-mono text-xs">VITE_GOOGLE_CLIENT_ID</code> and
          rebuild, and <code className="font-mono text-xs">GOOGLE_CLIENT_ID</code> on the
          Backend.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <FormError state={state} />

      <GoogleSignInButton
        clientId={clientId}
        onCredential={onCredential}
        onError={onGoogleError}
        disabled={pending}
        label={pending ? "Signing in…" : "Sign in with Google"}
      />

      <p className="text-center text-xs text-[var(--text-secondary)]">
        Use the Google account an admin has given dashboard access to.
      </p>
    </div>
  );
}
