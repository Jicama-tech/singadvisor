import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';

/** The only claims any caller takes out of a Google ID token. `sub` and
 * `email` are the identity — `name` is a display name and nothing more. */
export type GoogleIdentity = { sub: string; email: string; name: string };

/** What `.env.example` ships, and what Frontend-vite's `googleSignInConfigured`
 * treats as "no client id" — a deployment that never filled it in has to read
 * as unconfigured on both sides, not as a client id that fails every
 * verification. */
const PLACEHOLDER_CLIENT_ID = 'your-google-oauth-client-id';

/** This deployment's OAuth client id, or null when it has none. What "none"
 * means is each caller's own call: blog feedback refuses to proceed (it is
 * Google-only by design), training enrolment falls back to the typed address
 * it always accepted — see `RegistrationsService.identify`. */
export function googleClientId(configService: ConfigService): string | null {
  const clientId = configService.get<string>('GOOGLE_CLIENT_ID');
  return clientId && clientId !== PLACEHOLDER_CLIENT_ID ? clientId : null;
}

// One client per process, built on first use. OAuth2Client caches Google's
// signing certificates on the instance, so a shared one fetches them once
// instead of once per service that verifies a token.
let cached: { clientId: string; client: OAuth2Client } | null = null;

function clientFor(clientId: string): OAuth2Client {
  if (cached?.clientId !== clientId) {
    cached = { clientId, client: new OAuth2Client(clientId) };
  }
  return cached.client;
}

/**
 * Verifies a Google Identity Services ID token against Google's public keys and
 * our own client id, and returns what the token says.
 *
 * Lifted out of BlogFeedbackService unchanged when training enrolment needed
 * the same check. It is the one place in the app that turns a browser-supplied
 * string into an email address worth trusting, so it is worth having exactly
 * one of: everything returned here is the signed token's word, and no caller
 * should ever take an identity from the request body beside it.
 *
 * (AuthService keeps its own copy on purpose — dashboard login answers a
 * different question and deliberately returns different errors: an
 * Unauthorized that never echoes the library's message.)
 *
 * `requireVerifiedEmail` is opt-in rather than always-on. Google only sets
 * `email_verified` false in narrow cases, but when it does the address is one
 * the account holder has never proved they own — so a caller that will go on
 * to TREAT that address as the person (a booking that gets confirmed to it, a
 * CRM contact merged on it) must refuse it, exactly as AuthService already
 * does before granting dashboard access. Blog feedback does not opt in: the
 * address there is only ever a label on a rating an admin reads, and turning
 * it on would start rejecting readers who can leave feedback today.
 */
export async function verifyGoogleCredential(
  clientId: string,
  credential: string,
  { requireVerifiedEmail = false }: { requireVerifiedEmail?: boolean } = {},
): Promise<GoogleIdentity> {
  let ticket;
  try {
    ticket = await clientFor(clientId).verifyIdToken({ idToken: credential, audience: clientId });
  } catch (err) {
    throw new BadRequestException(
      `Invalid Google sign-in: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  const payload = ticket.getPayload();
  if (!payload?.sub || !payload?.email) {
    throw new BadRequestException('Google sign-in did not return the expected profile data.');
  }
  if (requireVerifiedEmail && payload.email_verified === false) {
    throw new BadRequestException(
      'That Google account has not verified its email address. Verify it with Google, then try again.',
    );
  }

  return { sub: payload.sub, email: payload.email, name: payload.name || '' };
}
