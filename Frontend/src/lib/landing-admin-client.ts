import "server-only";
import { getSessionToken } from "@/lib/auth";
import type { LandingSectionKey, LandingVariant } from "@/lib/landing-client";

/**
 * The admin-only endpoints (GET .../all, GET .../:key) return the full
 * Mongoose document — unlike the public feed, which omits `visible` because
 * it only ever returns visible rows anyway.
 */
export type LandingSectionAdminRow = {
  key: LandingSectionKey;
  sortOrder: number;
  visible: boolean;
  variant: LandingVariant;
  content: unknown;
};

/** Thrown by every function below on any failure — network, auth, or a
 * rejected Backend validation (in which case `fieldErrors` is populated). */
export class LandingServiceError extends Error {
  status?: number;
  fieldErrors?: string[];
  constructor(message: string, status?: number, fieldErrors?: string[]) {
    super(message);
    this.name = "LandingServiceError";
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

async function authedFetch(path: string, init: RequestInit = {}): Promise<unknown> {
  const token = await getSessionToken();
  if (!token) throw new LandingServiceError("Not authorised.", 401);

  const backendUrl = process.env.BACKEND_URL;
  if (!backendUrl) throw new LandingServiceError("BACKEND_URL is missing. Set it in .env.");

  let response: Response;
  try {
    response = await fetch(`${backendUrl}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...init.headers,
      },
      cache: "no-store",
    });
  } catch (cause) {
    const err = new LandingServiceError("The Backend is unreachable.");
    err.cause = cause;
    throw err;
  }

  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    let fieldErrors: string[] | undefined;
    try {
      const body: unknown = await response.json();
      if (body && typeof body === "object" && "message" in body) {
        const m = (body as { message: unknown }).message;
        if (Array.isArray(m)) {
          fieldErrors = m.map(String);
          message = fieldErrors.join(" ");
        } else if (typeof m === "string") {
          message = m;
        }
      }
    } catch {
      // Non-JSON error body — fall back to the generic message above.
    }
    throw new LandingServiceError(message, response.status, fieldErrors);
  }

  return response.json();
}

export function fetchLandingSectionsAdmin(): Promise<LandingSectionAdminRow[]> {
  return authedFetch("/landing/sections/all") as Promise<LandingSectionAdminRow[]>;
}

export function fetchLandingSectionAdmin(key: LandingSectionKey): Promise<LandingSectionAdminRow> {
  return authedFetch(`/landing/sections/${key}`) as Promise<LandingSectionAdminRow>;
}

export function patchLandingSectionContent(key: LandingSectionKey, content: object) {
  return authedFetch(`/landing/sections/${key}`, {
    method: "PATCH",
    body: JSON.stringify(content),
  });
}

export function patchLandingSectionVisibility(key: LandingSectionKey, visible: boolean) {
  return authedFetch(`/landing/sections/${key}/visibility`, {
    method: "PATCH",
    body: JSON.stringify({ visible }),
  });
}

export function patchLandingSectionMove(key: LandingSectionKey, direction: "up" | "down") {
  return authedFetch(`/landing/sections/${key}/move`, {
    method: "PATCH",
    body: JSON.stringify({ direction }),
  });
}

export function patchLandingSectionVariant(key: LandingSectionKey, variant: LandingVariant) {
  return authedFetch(`/landing/sections/${key}/variant`, {
    method: "PATCH",
    body: JSON.stringify({ variant }),
  });
}

/**
 * Uploads to Backend/uploads/landing/ and returns the path to store in a
 * section's content (e.g. `hero.posterSrc`). Deliberately not built on
 * authedFetch above — a multipart body must NOT get the JSON Content-Type
 * that helper always sets; fetch needs to compute the multipart boundary
 * itself, which only happens if the header is left unset entirely.
 */
export async function uploadLandingMedia(file: File): Promise<{ url: string }> {
  const token = await getSessionToken();
  if (!token) throw new LandingServiceError("Not authorised.", 401);

  const backendUrl = process.env.BACKEND_URL;
  if (!backendUrl) throw new LandingServiceError("BACKEND_URL is missing. Set it in .env.");

  const body = new FormData();
  body.append("file", file);

  let response: Response;
  try {
    response = await fetch(`${backendUrl}/uploads/landing`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body,
    });
  } catch (cause) {
    const err = new LandingServiceError("The Backend is unreachable.");
    err.cause = cause;
    throw err;
  }

  if (!response.ok) {
    let message = `Upload failed (${response.status})`;
    try {
      const body: unknown = await response.json();
      if (body && typeof body === "object" && "message" in body && typeof body.message === "string") {
        message = body.message;
      }
    } catch {
      // Non-JSON error body — fall back to the generic message above.
    }
    throw new LandingServiceError(message, response.status);
  }

  return response.json() as Promise<{ url: string }>;
}
