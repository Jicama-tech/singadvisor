import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";
import { fetchPublicFeedback, submitFeedback, type PublicFeedbackDoc } from "@/lib/contentClient";

const GSI_SRC = "https://accounts.google.com/gsi/client";

type GoogleCredentialResponse = { credential: string };
type GooglePromptNotification = { isNotDisplayed?: () => boolean; isSkippedMoment?: () => boolean };

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

function loadGoogleScript(): Promise<void> {
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

// Google's official "G" mark — required by their branding guidelines on any
// custom-styled "Sign in with Google" button.
function GoogleGIcon() {
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

function StarRating({
  value,
  onChange,
  readOnly = false,
  size = 20,
}: {
  value: number;
  onChange?: (n: number) => void;
  readOnly?: boolean;
  size?: number;
}) {
  const [hover, setHover] = useState(0);
  const display = hover || value;
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={readOnly}
          onClick={() => onChange?.(n)}
          onMouseEnter={() => !readOnly && setHover(n)}
          onMouseLeave={() => !readOnly && setHover(0)}
          className={readOnly ? "cursor-default" : "cursor-pointer"}
          aria-label={`${n} star${n > 1 ? "s" : ""}`}
        >
          <Icon
            name="star"
            size={size}
            filled={n <= display}
            className={n <= display ? "text-[var(--accent)]" : "text-[var(--border-strong)]"}
          />
        </button>
      ))}
    </div>
  );
}

/**
 * Rating + feedback form for a public blog post — same flow as jicamaTech's
 * blog engine (Google sign-in, verified server-side, one entry per reader,
 * admin-curated before anything shows publicly), restyled to SingAdvisor's
 * own light admin theme instead of jicama's dark/purple one.
 */
export function BlogFeedback({ slug }: { slug: string }) {
  const clientId = __GOOGLE_CLIENT_ID__;
  const configured = Boolean(clientId) && clientId !== "your-google-oauth-client-id";

  const [credential, setCredential] = useState<string | null>(null);
  const [signedInEmail, setSignedInEmail] = useState<string | null>(null);
  const [rating, setRating] = useState(0);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [fallbackButton, setFallbackButton] = useState(false);
  const [featured, setFeatured] = useState<PublicFeedbackDoc[]>([]);

  const fallbackRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    void fetchPublicFeedback(slug).then(setFeatured);
  }, [slug]);

  useEffect(() => {
    if (!configured || credential) return;
    let cancelled = false;

    loadGoogleScript()
      .then(() => {
        if (cancelled || initializedRef.current) return;
        initializedRef.current = true;
        window.google!.accounts.id.initialize({
          client_id: clientId,
          callback: (response) => {
            setCredential(response.credential);
            try {
              const payload = JSON.parse(atob(response.credential.split(".")[1])) as { email?: string };
              setSignedInEmail(payload.email ?? null);
            } catch {
              setSignedInEmail(null);
            }
          },
        });
      })
      .catch(() => setError("Couldn't load Google Sign-In."));

    return () => {
      cancelled = true;
    };
  }, [configured, clientId, credential]);

  useEffect(() => {
    if (!fallbackButton || !fallbackRef.current || !window.google) return;
    window.google.accounts.id.renderButton(fallbackRef.current, {
      theme: "outline",
      size: "large",
      shape: "pill",
      text: "signin_with",
    });
  }, [fallbackButton]);

  function handleSignInClick() {
    if (!window.google?.accounts?.id) return;
    setError(null);
    window.google.accounts.id.prompt((notification) => {
      if (notification.isNotDisplayed?.() || notification.isSkippedMoment?.()) {
        setFallbackButton(true);
      }
    });
  }

  async function handleSubmit() {
    if (!credential) return;
    if (!rating) {
      setError("Please select a star rating.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await submitFeedback(slug, { credential, rating, message });
      setSuccess(true);
      void fetchPublicFeedback(slug).then(setFeatured);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit feedback.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="mt-14 border-t border-[var(--border-subtle)] pt-10">
      <div className="mb-6 flex items-center gap-3">
        <Icon name="message-circle" size={20} className="text-[var(--accent)]" />
        <h2 className="text-2xl text-[var(--text-primary)]">Feedback</h2>
      </div>

      {!configured ? (
        <p className="text-sm text-[var(--text-muted)]">Feedback isn&apos;t available right now.</p>
      ) : success ? (
        <p className="rounded-xl border border-[var(--accent)]/30 bg-[var(--accent-soft)] px-4 py-3 text-sm text-[var(--accent-on-soft)]">
          Thanks for your feedback!
        </p>
      ) : (
        <div className="rounded-2xl border border-[var(--border-subtle)] surface-raised p-5 shadow-[var(--shadow-lift)]">
          {!credential ? (
            <div className="flex flex-col items-center gap-3 text-center">
              <p className="text-sm text-[var(--text-secondary)]">Sign in with Google to rate this article.</p>
              {fallbackButton ? (
                <div ref={fallbackRef} />
              ) : (
                <button
                  type="button"
                  onClick={handleSignInClick}
                  className="flex items-center gap-2.5 rounded-full bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-[var(--accent-foreground)] shadow-[var(--shadow-lift)] transition-colors hover:bg-[var(--accent-hover)]"
                >
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white">
                    <GoogleGIcon />
                  </span>
                  Sign in with Google
                </button>
              )}
              {error && (
                <p role="alert" className="text-sm font-medium text-red-600 dark:text-red-400">
                  {error}
                </p>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <p className="text-xs text-[var(--text-muted)]">
                Signed in as <span className="text-[var(--text-secondary)]">{signedInEmail}</span>
              </p>
              <StarRating value={rating} onChange={setRating} />
              <textarea
                rows={3}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="What did you think? (optional)"
                className="w-full resize-none rounded-xl border border-[var(--border-strong)] bg-[var(--surface)] px-4 py-2.5 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/25"
              />
              {error && (
                <p role="alert" className="text-sm font-medium text-red-600 dark:text-red-400">
                  {error}
                </p>
              )}
              <Button type="button" onClick={handleSubmit} disabled={submitting} className="self-start">
                {submitting ? "Submitting…" : "Submit feedback"}
              </Button>
            </div>
          )}
        </div>
      )}

      {featured.length > 0 && (
        <div className="mt-8 flex flex-col gap-4">
          {featured.map((entry) => (
            <div key={entry._id} className="border-b border-[var(--border-subtle)] pb-4">
              <div className="mb-1 flex items-center gap-3">
                <StarRating value={entry.rating} readOnly size={14} />
                {entry.name && <span className="text-sm text-[var(--text-muted)]">{entry.name}</span>}
              </div>
              {entry.message && (
                <p className="text-sm text-[var(--text-secondary)]">{entry.message}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
