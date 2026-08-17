import "server-only";
import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";
import { cache } from "react";

/**
 * Admin sessions are a signed JWT in an httpOnly cookie. jose is used rather
 * than a Node-only JWT library because the middleware runs on the Edge
 * runtime, where node:crypto is unavailable.
 */

export const SESSION_COOKIE = "sa_session";
const MAX_AGE_SECONDS = 60 * 60 * 8; // 8 hours

export type SessionPayload = {
  sub: string;
  email: string;
  name: string;
  role: string;
};

function secret(): Uint8Array {
  const value = process.env.AUTH_SECRET;
  // Failing loudly beats silently signing sessions with a default secret.
  if (!value || value.length < 16) {
    throw new Error(
      "AUTH_SECRET is missing or too short. Generate one with `openssl rand -base64 32` and set it in .env",
    );
  }
  return new TextEncoder().encode(value);
}

export async function createSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(secret());
}

export async function verifySession(
  token: string | undefined,
): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret(), {
      algorithms: ["HS256"],
    });
    if (
      typeof payload.sub !== "string" ||
      typeof payload.email !== "string" ||
      typeof payload.name !== "string" ||
      typeof payload.role !== "string"
    ) {
      return null;
    }
    return {
      sub: payload.sub,
      email: payload.email,
      name: payload.name,
      role: payload.role,
    };
  } catch {
    // Expired, tampered with, or signed by a different secret.
    return null;
  }
}

export async function setSessionCookie(token: string) {
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

/**
 * The current admin, or null. Cached per request so a page rendering several
 * server components does not re-verify the token each time.
 */
export const getSession = cache(async (): Promise<SessionPayload | null> => {
  const store = await cookies();
  return verifySession(store.get(SESSION_COOKIE)?.value);
});

/**
 * The raw session JWT, for forwarding to the Backend as a bearer token.
 * Works because the Frontend signs this cookie with the same secret/shape
 * Backend/src/modules/auth issues its own tokens with (see AUTH_SECRET /
 * JWT_ACCESS_SECRET) — so a token minted here verifies there without any
 * separate service-to-service auth mechanism. Returns null if there is no
 * valid session; callers should treat that the same as "not logged in".
 */
export async function getSessionToken(): Promise<string | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await verifySession(token);
  return session ? token : null;
}

/** Thrown when the Backend can't be reached at all — distinct from a rejected
 * login, so the caller can show "try again later" instead of "wrong password". */
export class AuthServiceUnavailableError extends Error {
  constructor(cause?: unknown) {
    super("The authentication service is unavailable.");
    this.name = "AuthServiceUnavailableError";
    this.cause = cause;
  }
}

/**
 * Verify an email/password pair. The credential check itself now happens in
 * Backend/ (bcrypt against the migrated `admin-users` collection) — this
 * just calls it and hands back the same {sub, email, name, role} shape
 * `createSession` always expected, so nothing downstream of this function
 * changed. See Backend/src/modules/auth/auth.service.ts for the other half.
 */
export async function authenticate(email: string, password: string) {
  const backendUrl = process.env.BACKEND_URL;
  if (!backendUrl) {
    throw new Error("BACKEND_URL is missing. Set it in .env (see .env.example).");
  }

  let response: Response;
  try {
    response = await fetch(`${backendUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
      cache: "no-store",
    });
  } catch (cause) {
    throw new AuthServiceUnavailableError(cause);
  }

  if (response.status === 401) return null; // wrong email or password
  if (!response.ok) throw new AuthServiceUnavailableError(await response.text());

  const { user } = (await response.json()) as {
    user: { sub: string; email: string; name: string; role: string };
  };
  return user;
}
