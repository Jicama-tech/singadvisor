import { useEffect, useRef, useState } from "react";

/**
 * Shared Google Identity Services plumbing.
 *
 * Extracted from BlogFeedback.tsx, which had all of this inline, once the
 * admin login needed the same thing. The script loader, the window typing and
 * the official "G" mark live here; each caller keeps its own state, since a
 * blog reader signing in to leave a rating and an operator signing in to the
 * dashboard do quite different things afterwards.
 */

const GSI_SRC = "https://accounts.google.com/gsi/client";

export type GoogleCredentialResponse = { credential: string };
export type GooglePromptNotification = {
  isNotDisplayed?: () => boolean;
  isSkippedMoment?: () => boolean;
};

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: GoogleCredentialResponse) => void;
          }) => void;
          prompt: (cb: (notification: GooglePromptNotification) => void) => void;
          renderButton: (
            el: HTMLElement,
            options: { theme: string; size: string; shape: string; text: string },
          ) => void;
        };
      };
    };
  }
}

/** Loads Google's script once per page, tolerating a concurrent caller that
 * already started the load. */
export function loadGoogleScript(): Promise<void> {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (document.querySelector(`script[src="${GSI_SRC}"]`)) {
    return new Promise((resolve) => {
      const check = setInterval(() => {
        if (window.google?.accounts?.id) {
          clearInterval(check);
          resolve();
        }
      }, 100);
    });
  }
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = GSI_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

/** True when a real OAuth client id was built into the bundle — the
 * placeholder in .env.example must not put a dead button on screen. */
export function googleSignInConfigured(clientId: string): boolean {
  return Boolean(clientId) && clientId !== "your-google-oauth-client-id";
}

// Google's official "G" mark — required by their branding guidelines on any
// custom-styled "Sign in with Google" button.
export function GoogleGIcon() {
  return (
    <svg viewBox="0 0 18 18" className="h-4 w-4" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.87 2.7-6.62z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.81.54-1.85.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.96v2.33A9 9 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.95 10.7A5.4 5.4 0 0 1 3.66 9c0-.59.1-1.17.29-1.7V4.97H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.03l2.99-2.33z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.97l2.99 2.33C4.66 5.17 6.65 3.58 9 3.58z"
      />
    </svg>
  );
}

/**
 * A styled "Continue with Google" button that hands the caller the ID token.
 *
 * Google's One Tap prompt is tried first; browsers that suppress it (third
 * party cookies blocked, or the user dismissed it recently) report that back,
 * and Google's own rendered button is shown instead — without it those users
 * would click a button that silently does nothing.
 *
 * Renders nothing at all when no client id is configured, so an unconfigured
 * deployment simply shows the password form.
 */
export function GoogleSignInButton({
  clientId,
  onCredential,
  onError,
  disabled = false,
  label = "Continue with Google",
}: {
  clientId: string;
  onCredential: (credential: string) => void;
  onError?: (message: string) => void;
  disabled?: boolean;
  label?: string;
}) {
  const [fallbackButton, setFallbackButton] = useState(false);
  const [ready, setReady] = useState(false);
  const fallbackRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);
  // Held in a ref so re-renders never re-run initialize() with a stale
  // callback — GSI keeps whichever one it was given first.
  const onCredentialRef = useRef(onCredential);
  onCredentialRef.current = onCredential;

  const configured = googleSignInConfigured(clientId);

  useEffect(() => {
    if (!configured) return;
    let cancelled = false;

    loadGoogleScript()
      .then(() => {
        if (cancelled) return;
        if (!initializedRef.current) {
          initializedRef.current = true;
          window.google!.accounts.id.initialize({
            client_id: clientId,
            callback: (response) => onCredentialRef.current(response.credential),
          });
        }
        setReady(true);
      })
      .catch(() => onError?.("Couldn't load Google Sign-In."));

    return () => {
      cancelled = true;
    };
  }, [configured, clientId, onError]);

  useEffect(() => {
    if (!fallbackButton || !fallbackRef.current || !window.google) return;
    window.google.accounts.id.renderButton(fallbackRef.current, {
      theme: "outline",
      size: "large",
      shape: "pill",
      text: "signin_with",
    });
  }, [fallbackButton]);

  if (!configured) return null;

  if (fallbackButton) {
    return <div ref={fallbackRef} className="flex justify-center" />;
  }

  return (
    <button
      type="button"
      disabled={disabled || !ready}
      onClick={() => {
        window.google?.accounts.id.prompt((notification) => {
          if (notification.isNotDisplayed?.() || notification.isSkippedMoment?.()) {
            setFallbackButton(true);
          }
        });
      }}
      className="inline-flex w-full items-center justify-center gap-2.5 rounded-full border border-[var(--border-strong)] surface-raised px-5 py-2.5 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-sunken)] disabled:opacity-60"
    >
      <GoogleGIcon />
      {label}
    </button>
  );
}
