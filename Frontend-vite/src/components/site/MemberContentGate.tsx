import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Icon } from "@/components/ui/Icon";
import {
  GoogleGIcon,
  GoogleSignInButton,
  googleSignInConfigured,
} from "@/components/ui/GoogleSignIn";
import {
  clearMemberCredential,
  loadMemberCredential,
  saveMemberCredential,
} from "@/lib/memberSession";

/**
 * What stands in for a members-only article until the reader proves they are a
 * member.
 *
 * This is a presentation of a decision already taken, NOT the decision itself.
 * The Backend withholds the body (see BlogService.view / NewsletterService
 * .present); by the time this renders, the content is genuinely not in the
 * browser. Nothing here can be clicked, inspected or disabled into revealing
 * it — which is the difference between a gate and a blur.
 *
 * Two steps, and the first exists because the second cannot be answered
 * without it: sign in, so the server can say whether this account is a member;
 * then either the article appears or this panel says it is for members and
 * points at the plans.
 *
 * The teaser — title and excerpt — is shown throughout. Sending somebody
 * straight to the pricing page from a link they followed tells them nothing
 * about what they nearly read, and a reader who cannot see what is behind the
 * lock has no reason to pay for it.
 */
export function MemberContentGate({
  title,
  teaser,
  kind,
  onCredential,
}: {
  title: string;
  teaser?: string;
  /** Only changes the wording. The gate itself is identical for both. */
  kind: "article" | "issue";
  /** Hands the verified credential up so the page can re-fetch as a member.
   * Returns whether the content actually unlocked, so this panel knows to stop
   * offering the sign-in it has already tried. */
  onCredential: (credential: string) => Promise<boolean>;
}) {
  const clientId = __GOOGLE_CLIENT_ID__;
  const canSignIn = googleSignInConfigured(clientId);

  /** True while a REMEMBERED credential is being tried, before anything is
   * drawn. Without it the panel flashes its sign-in button at a member who is
   * already signed in, for as long as the round trip takes. */
  const [resuming, setResuming] = useState(() => !!loadMemberCredential());
  const [checking, setChecking] = useState(false);
  const [signInError, setSignInError] = useState<string | null>(null);
  /** Set once a sign-in has happened and the server still withheld the body —
   * i.e. this account is genuinely not a member. Until then the panel invites a
   * sign-in rather than assuming the worst about the reader. */
  const [refused, setRefused] = useState(false);

  async function handleCredential(credential: string) {
    setChecking(true);
    setSignInError(null);
    try {
      const unlocked = await onCredential(credential);
      if (unlocked) {
        // Kept so the next members-only page opens without asking again.
        // Only on success: a credential that did not unlock anything is not
        // worth carrying to the next article.
        saveMemberCredential(credential);
      } else {
        // The page swaps this panel for the article when it unlocks, so the
        // only state worth recording here is the refusal.
        setRefused(true);
      }
    } finally {
      setChecking(false);
    }
  }

  /**
   * Try the remembered credential before asking for a new one.
   *
   * Runs once per mount — the ref guards React 18's double-invoke in strict
   * mode, which would otherwise fire two identical unlock requests.
   *
   * A stored credential that fails is DISCARDED rather than left to fail
   * again on every article: the common reason is that it expired, and the
   * right response to that is to offer a fresh sign-in, not to keep showing
   * somebody a refusal built on a dead token.
   */
  const resumed = useRef(false);
  useEffect(() => {
    if (resumed.current) return;
    resumed.current = true;

    const stored = loadMemberCredential();
    if (!stored) return;

    let cancelled = false;
    void (async () => {
      try {
        const unlocked = await onCredential(stored);
        if (cancelled) return;
        if (!unlocked) {
          clearMemberCredential();
          setRefused(true);
        }
      } finally {
        if (!cancelled) setResuming(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // onCredential is redefined every render by the page above; the ref is
    // what makes this run once, so it is deliberately not a dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const noun = kind === "article" ? "article" : "issue";

  if (resuming) {
    return (
      <div
        role="status"
        className="my-8 flex flex-col items-center gap-3 rounded-[var(--radius-card)] border border-[var(--accent)]/25 bg-[var(--accent-soft)] px-6 py-10 text-center"
      >
        <p className="text-sm text-[var(--text-secondary)]">Checking your membership…</p>
      </div>
    );
  }

  return (
    <div className="my-8 flex flex-col items-center gap-5 rounded-[var(--radius-card)] border border-[var(--accent)]/25 bg-[var(--accent-soft)] px-6 py-10 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-full bg-[var(--surface)] text-[var(--accent)] shadow-[var(--shadow-soft)]">
        <Icon name={refused ? "star" : "lock"} size={22} />
      </span>

      <div className="flex flex-col gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-[var(--accent)]">
          Members only
        </p>
        <p className="text-lg font-medium text-[var(--text-primary)]">
          {refused ? `This ${noun} is for members` : `Sign in to read this ${noun}`}
        </p>
        {teaser && (
          <p className="mx-auto max-w-md text-sm leading-relaxed text-[var(--text-secondary)]">
            {teaser}
          </p>
        )}
      </div>

      {refused || !canSignIn ? (
        <>
          <p className="max-w-sm text-sm text-[var(--text-secondary)]">
            {refused
              ? `Membership opens every members-only ${noun}, and the ones we write next reach you first.`
              : `Members-only ${noun}s open once membership is set up on this site.`}
          </p>
          <Link
            to="/membership"
            className="inline-flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-full bg-[var(--accent)] px-6 text-[0.9375rem] font-medium text-[var(--accent-foreground)] shadow-[var(--shadow-soft)] transition-all duration-200 hover:bg-[var(--accent-hover)] hover:shadow-[var(--shadow-lift)] active:scale-[0.98]"
          >
            See membership plans
            <Icon name="arrow-right" size={16} />
          </Link>
          {refused && (
            <button
              type="button"
              onClick={() => setRefused(false)}
              className="text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              Try a different Google account
            </button>
          )}
        </>
      ) : (
        <>
          <p className="max-w-sm text-sm text-[var(--text-secondary)]">
            Your membership is tied to your Google account, so signing in is how we recognise it.
          </p>
          <div className="w-full max-w-xs">
            {checking ? (
              <p className="text-sm text-[var(--text-secondary)]">Checking your membership…</p>
            ) : (
              <GoogleSignInButton
                clientId={clientId}
                onCredential={(credential) => void handleCredential(credential)}
                onError={setSignInError}
              />
            )}
          </div>
          {signInError && (
            <p role="alert" className="text-sm font-medium text-red-600 dark:text-red-400">
              {signInError}
            </p>
          )}
          <p className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
            <GoogleGIcon />
            We only read your name and email address.
          </p>
          <Link
            to="/membership"
            className="text-sm font-medium text-[var(--accent)] hover:underline"
          >
            Not a member yet? See the plans
          </Link>
        </>
      )}

      <span className="sr-only">{title}</span>
    </div>
  );
}
