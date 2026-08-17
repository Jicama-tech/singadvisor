/**
 * Operator tab-access keys — mirrors Backend/src/modules/operators/
 * access-tabs.ts 1:1 (the backend validates these exact keys on save).
 * Keyed to the admin's own main sidebar, so granting access reads in terms
 * the admin already sees.
 */
export const ACCESS_TABS = [
  "overview",
  "landing",
  "trainings",
  "events",
  "consultancy",
  "careers",
  "blog",
  "registrations",
  "enquiries",
  "applications",
  "messages",
  "settings",
] as const;

export type AccessTab = (typeof ACCESS_TABS)[number];

/** Human labels for the Operators panel's checkbox groups. */
export const ACCESS_TAB_LABELS: Record<AccessTab, string> = {
  overview: "Overview",
  landing: "Landing page",
  trainings: "Trainings",
  events: "Events",
  consultancy: "Consultancy",
  careers: "Careers",
  blog: "Blog",
  registrations: "Registrations",
  enquiries: "Enquiries",
  applications: "Applications",
  messages: "Messages",
  settings: "Settings",
};

/** Which main-sidebar key a route requires — used to enforce tab access
 * (an operator without the key sees the access-denied panel instead). */
export function tabForPath(pathname: string): AccessTab | null {
  if (pathname === "/admin") return "overview";
  for (const [prefix, tab] of [
    ["/admin/landing", "landing"],
    ["/admin/trainings", "trainings"],
    ["/admin/events", "events"],
    ["/admin/consultancy", "consultancy"],
    ["/admin/careers", "careers"],
    ["/admin/blog", "blog"],
    ["/admin/registrations", "registrations"],
    ["/admin/enquiries", "enquiries"],
    ["/admin/applications", "applications"],
    ["/admin/messages", "messages"],
    ["/admin/settings", "settings"],
  ] as const) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`) || pathname.startsWith(`${prefix}?`)) {
      return tab as AccessTab;
    }
  }
  return null;
}
