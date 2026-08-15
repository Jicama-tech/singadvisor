import type { NextConfig } from "next";

/**
 * Serve the app from a subpath (e.g. "/singadvisor" behind nginx on
 * jicama.tech) by setting NEXT_PUBLIC_BASE_PATH at BUILD time. Leave it unset
 * to serve from the domain root. It is baked into the bundle, so changing it
 * needs a rebuild — restarting the server is not enough.
 */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/**
 * next/image refuses to optimize a remote image unless its origin is
 * explicitly allow-listed — needed now that uploaded landing-page media
 * (Backend/uploads/*, served by the Backend, not the Frontend) can end up as
 * an <Image src>. Parsed from the same env var withBackendUrl() uses, so the
 * two can never drift apart.
 */
const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL
  ? new URL(process.env.NEXT_PUBLIC_BACKEND_URL)
  : null;

const nextConfig: NextConfig = {
  reactStrictMode: true,
  eslint: {
    dirs: ["src"],
  },

  // The floating dev-mode badge (route info / build activity). Dev-only —
  // has no effect on production builds — but distracting during day-to-day
  // use, so it's off.
  devIndicators: false,

  images: {
    remotePatterns: backendUrl
      ? [
          {
            protocol: backendUrl.protocol.replace(":", "") as "http" | "https",
            hostname: backendUrl.hostname,
            port: backendUrl.port,
            pathname: "/uploads/**",
          },
        ]
      : [],
  },

  // basePath alone is correct here. Do NOT also set `assetPrefix` to the same
  // value: basePath already serves /_next and /public under the prefix, and
  // the pair makes the image optimizer reject every request with a 400, which
  // silently breaks every image on the site. assetPrefix is only for serving
  // assets from a different origin, such as a CDN.
  ...(basePath ? { basePath } : {}),

  // Deliberately NOT `output: "standalone"`. Standalone is for shipping a
  // minimal bundle without node_modules, but it is incompatible with
  // `next start` ("next start does not work with output: standalone") and
  // requires hand-copying .next/static and public/ into the output directory.
  // The VPS deploy rsyncs the repo and runs `npm ci`, so it gains nothing.

  /**
   * The legacy Vite app used different training slugs. These permanent
   * redirects keep existing inbound links and search results working.
   *
   * Note: redirects here match case-INSENSITIVELY, so a rule whose source and
   * destination differ only by case (e.g. /Trainings -> /trainings) would
   * match its own destination and loop forever. Those legacy capitalised
   * routes are handled in src/middleware.ts instead, where the comparison is
   * explicitly case-sensitive.
   */
  async redirects() {
    return [
      { source: "/Services", destination: "/consultancy", permanent: true },

      {
        source: "/trainings/managetime",
        destination: "/trainings/manage-time",
        permanent: true,
      },
      {
        source: "/trainings/managemoney",
        destination: "/trainings/manage-money",
        permanent: true,
      },
      {
        source: "/trainings/managehealth",
        destination: "/trainings/manage-health",
        permanent: true,
      },
      {
        source: "/trainings/manageemotion",
        destination: "/trainings/manage-emotion",
        permanent: true,
      },
      {
        source: "/trainings/build-trust",
        destination: "/trainings/build-trust-in-teams",
        permanent: true,
      },

      // The old site addressed events by numeric id; those ids no longer map
      // to anything, so send the visitor to the listing rather than a 404.
      { source: "/events/:id(\\d+)", destination: "/events", permanent: false },
    ];
  },
};

export default nextConfig;
