import "server-only";
import bcrypt from "bcryptjs";
import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";
import { cache } from "react";
import { db } from "@/lib/db";

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

/** Verify an email/password pair against the database. */
export async function authenticate(email: string, password: string) {
  const user = await db.adminUser.findUnique({ where: { email } });

  // Compare against a dummy hash when the user does not exist so the response
  // time does not reveal which emails are registered.
  const hash =
    user?.passwordHash ??
    "$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidinv";
  const valid = await bcrypt.compare(password, hash);

  if (!user || !valid) return null;

  await db.adminUser.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  return { sub: user.id, email: user.email, name: user.name, role: user.role };
}
