import { WORDS_PER_MINUTE } from "@/lib/constants";

/** Merge conditional class names without pulling in a dependency. */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

/**
 * The schema stores list fields as JSON strings so the model stays portable
 * across SQLite and Postgres. These helpers are the only place that knows it.
 */
export function parseList(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

export type AgendaItem = { time: string; title: string };

export function parseAgenda(value: string | null | undefined): AgendaItem[] {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((item) =>
      item && typeof item === "object" && "time" in item && "title" in item
        ? [{ time: String(item.time), title: String(item.title) }]
        : [],
    );
  } catch {
    return [];
  }
}

export function stringifyList(items: string[]): string {
  return JSON.stringify(items.map((s) => s.trim()).filter(Boolean));
}

/** Turn a textarea of one-per-line entries into the stored JSON string. */
export function linesToJson(text: string): string {
  return stringifyList(text.split("\n"));
}

export function jsonToLines(value: string | null | undefined): string {
  return parseList(value).join("\n");
}

/**
 * Intl renders SGD in en-SG as a bare "$680", which reads as US dollars to
 * anyone scanning the page. On a Singapore site the amount has to be
 * unambiguous, so SGD gets an explicit "S$" and other currencies fall back to
 * Intl's own symbol.
 */
function withCurrency(amount: number, currency: string, decimals: number): string {
  const number = new Intl.NumberFormat("en-SG", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);
  if (currency === "SGD") return `S$${number}`;
  return new Intl.NumberFormat("en-SG", {
    style: "currency",
    currency,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);
}

export function formatPrice(cents: number, currency = "SGD"): string {
  if (cents <= 0) return "Free";
  return withCurrency(cents / 100, currency, cents % 100 === 0 ? 0 : 2);
}

export function formatSalaryRange(
  min: number | null,
  max: number | null,
  currency = "SGD",
): string | null {
  if (min == null && max == null) return null;
  const fmt = (n: number) => withCurrency(n, currency, 0);
  if (min != null && max != null) return `${fmt(min)} – ${fmt(max)}`;
  return fmt((min ?? max) as number);
}

const SGT = "Asia/Singapore";

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("en-SG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: SGT,
  }).format(new Date(date));
}

export function formatDateTime(date: Date | string): string {
  return new Intl.DateTimeFormat("en-SG", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: SGT,
  }).format(new Date(date));
}

export function formatTimeRange(start: Date | string, end: Date | string): string {
  const time = (d: Date | string) =>
    new Intl.DateTimeFormat("en-SG", {
      hour: "numeric",
      minute: "2-digit",
      timeZone: SGT,
    }).format(new Date(d));
  return `${time(start)} – ${time(end)}`;
}

export function isUpcoming(date: Date | string): boolean {
  return new Date(date).getTime() > Date.now();
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Estimated reading time in whole minutes, never less than one.
 * Markdown syntax is stripped first so `##` and `**` do not inflate the count.
 */
export function readingMinutes(markdown: string): number {
  const words = markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[#>*_`~|-]/g, " ")
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}

export function formatDuration(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)} min`;
  if (Number.isInteger(hours)) return `${hours} hr${hours === 1 ? "" : "s"}`;
  return `${hours} hrs`;
}
