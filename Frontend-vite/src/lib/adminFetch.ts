/**
 * The one fetch wrapper in the app (mirrors eventsh-v1's frontend/src/lib/
 * adminFetch.ts): auto-attaches the session Bearer token and, on a 401,
 * dispatches a window event the admin shell listens for — one place handles
 * "your session expired" instead of every page doing its own redirect.
 */
export async function adminFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const token = sessionStorage.getItem("token");
  const headers = new Headers(init?.headers || {});
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  const res = await fetch(input, { ...init, headers });
  if (res.status === 401) {
    window.dispatchEvent(new Event("admin-session-expired"));
  }
  return res;
}

/** Standard helper for the app's ad-hoc fetch convention: JSON out, thrown
 * Error with the backend's message on failure (mirrors how every eventsh
 * component handles responses inline). */
export async function apiJson<T>(
  path: string,
  init?: RequestInit & { admin?: boolean },
): Promise<T> {
  const res = await (init?.admin ? adminFetch(`${__API_URL__}${path}`, init) : fetch(`${__API_URL__}${path}`, init));
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const data = await res.json();
      if (typeof data?.message === "string") message = data.message;
      else if (Array.isArray(data?.message)) message = data.message.join(" ");
    } catch {
      /* keep default message */
    }
    throw new Error(message);
  }
  return (await res.json()) as T;
}
