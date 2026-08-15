import "server-only";

export const LANDING_SECTION_KEYS = [
  "hero",
  "stats",
  "pillars",
  "trainings",
  "events",
  "consultancy",
  "careers",
  "blog",
  "cta",
] as const;

export type LandingSectionKey = (typeof LANDING_SECTION_KEYS)[number];

/** Three visual treatments offered consistently across every section.
 * "modern" is always what shipped originally — the seed default and the
 * fallback for anything unrecognised. */
export const LANDING_VARIANTS = ["modern", "minimal", "bold"] as const;
export type LandingVariant = (typeof LANDING_VARIANTS)[number];

export type HeroContent = {
  eyebrow: string;
  title: string;
  titleAccent: string;
  description: string;
  /** "{count}" is replaced with the live published-training count at render time. */
  primaryCtaLabel: string;
  primaryCtaHref: string;
  secondaryCtaLabel: string;
  secondaryCtaHref: string;
  videoSrc: string;
  posterSrc: string;
};

export type StatsContent = { items: { value: string; label: string }[] };

/** Exactly 4 — positionally matched to Trainings/Events/Consultancy/Careers. */
export type PillarsContent = { items: { title: string; description: string }[] };

export type ConsultancyContent = {
  eyebrow: string;
  title: string;
  description: string;
  image: string;
  ctaLabel: string;
  ctaHref: string;
};

export type CtaContent = {
  title: string;
  description: string;
  primaryCtaLabel: string;
  primaryCtaHref: string;
  secondaryCtaLabel: string;
  secondaryCtaHref: string;
};

/** Shared shape for the four DB-driven sections. */
export type ListContent = {
  eyebrow: string;
  title: string;
  description: string;
  ctaLabel: string;
  ctaHref: string;
  take: number;
};

export type LandingSectionRow = {
  key: LandingSectionKey;
  sortOrder: number;
  variant: LandingVariant;
  content: unknown;
};

/**
 * Fetches the public, visible-only, sorted landing sections from the
 * Backend. Returns [] — never throws — on any failure (Backend down,
 * network error, bad response), so callers must fall back to hardcoded
 * defaults. The homepage must never render blank because of this call.
 */
export async function fetchLandingSections(): Promise<LandingSectionRow[]> {
  const backendUrl = process.env.BACKEND_URL;
  if (!backendUrl) {
    console.error("BACKEND_URL is missing; landing page will use fallback content.");
    return [];
  }

  try {
    const response = await fetch(`${backendUrl}/landing/sections`, {
      next: { revalidate: 60 },
    });
    if (!response.ok) return [];
    const data: unknown = await response.json();
    return Array.isArray(data) ? (data as LandingSectionRow[]) : [];
  } catch {
    return [];
  }
}
