import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/auth";
import { withBasePath } from "@/lib/base-path";

/**
 * Build an absolute redirect target that keeps the app's basePath AND points at
 * the public origin.
 *
 * Two traps here, both of which produce a redirect the browser cannot follow:
 *
 *  1. `new URL("/admin", request.url)` replaces the whole path, dropping the
 *     basePath — the user lands on /admin instead of /singadvisor/admin.
 *  2. Behind a reverse proxy, `request.url` is the INTERNAL origin the proxy
 *     dialled (e.g. https://localhost:3100), not the public one. Using it as
 *     the base emits `Location: https://localhost:3100/...`, which fails with
 *     ERR_CONNECTION_REFUSED for every visitor. Local dev never shows this
 *     because there the internal and public origins are identical.
 *
 * So the origin is rebuilt from the forwarded headers nginx sets, falling back
 * to the request's own values when running without a proxy.
 */
function appUrl(path: string, request: NextRequest): URL {
  const proto =
    request.headers.get("x-forwarded-proto")?.split(",")[0].trim() ||
    request.nextUrl.protocol.replace(":", "");
  const host =
    request.headers.get("x-forwarded-host")?.split(",")[0].trim() ||
    request.headers.get("host") ||
    request.nextUrl.host;
  return new URL(withBasePath(path), `${proto}://${host}`);
}

/**
 * The legacy Vite app used capitalised routes. These cannot be expressed as
 * next.config redirects because that matching is case-insensitive — a rule
 * from /Trainings to /trainings would match its own destination and loop.
 * Comparing pathname exactly here avoids that.
 */
const LEGACY_ROUTES: Record<string, string> = {
  "/Trainings": "/trainings",
  "/Events": "/events",
  "/About": "/about",
  "/Contact": "/contact",
};

/**
 * Gate for the admin area. This is a first line of defence for navigation —
 * every admin page and action independently calls its own session check, so a
 * middleware bypass alone does not grant access to any data.
 */
export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  const legacy = LEGACY_ROUTES[pathname];
  if (legacy) {
    return NextResponse.redirect(appUrl(legacy + search, request), 308);
  }

  if (!pathname.startsWith("/admin")) return NextResponse.next();

  const session = await verifySession(
    request.cookies.get(SESSION_COOKIE)?.value,
  );

  if (pathname === "/admin/login") {
    // Already signed in — no reason to show the form again.
    if (session) return NextResponse.redirect(appUrl("/admin", request));
    return NextResponse.next();
  }

  if (!session) {
    const url = appUrl("/admin/login", request);
    // Preserve where they were headed so login can return them there.
    url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/Trainings",
    "/Events",
    "/About",
    "/Contact",
  ],
};
