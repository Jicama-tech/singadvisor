/**
 * The tab-access whitelist for operators — keyed to the SPA's own MAIN
 * sidebar (AdminShell's CONTENT_NAV + INBOX_NAV + Overview/Settings), so
 * an admin grants access in terms they already see. The frontend filters
 * the sidebar and guards routes against these keys; the backend validates
 * them on save so a typo can never silently grant nothing (or everything).
 */
export const ACCESS_TABS = [
  'overview',
  'landing',
  'trainings',
  'events',
  'consultancy',
  'careers',
  'blog',
  'registrations',
  'enquiries',
  'applications',
  'messages',
  'settings',
] as const;

export type AccessTab = (typeof ACCESS_TABS)[number];

export function isAccessTab(value: string): value is AccessTab {
  return (ACCESS_TABS as readonly string[]).includes(value);
}
