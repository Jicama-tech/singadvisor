import { useCallback, useState } from "react";

/**
 * Manual collapse/expand for a sidebar that also has a route-driven "auto"
 * collapsed state (AdminShell's primary sidebar, EventsNestedNav,
 * LandingNestedNav all auto-collapse to icon-only on certain routes). This
 * layers a user-controlled override on top: once toggled, the override wins
 * over whatever the route would otherwise pick, and is remembered (via
 * localStorage, keyed by `storageKey`) so it stays collapsed/expanded across
 * navigation and reloads until toggled again — a normal "collapsible
 * sidebar" the user can flip at any time.
 */
export function useSidebarCollapse(storageKey: string, auto: boolean): [boolean, () => void] {
  const [override, setOverride] = useState<boolean | null>(() => {
    if (typeof window === "undefined") return null;
    const stored = window.localStorage.getItem(storageKey);
    return stored === "true" ? true : stored === "false" ? false : null;
  });

  const toggle = useCallback(() => {
    setOverride((prev) => {
      const next = !(prev ?? auto);
      try {
        window.localStorage.setItem(storageKey, String(next));
      } catch {
        /* storage unavailable (private mode, quota) — override still works
           for the rest of this session via state, just won't persist. */
      }
      return next;
    });
  }, [auto, storageKey]);

  return [override ?? auto, toggle];
}
