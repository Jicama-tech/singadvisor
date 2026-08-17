
import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";

/**
 * Toggles between light and dark, persisting the choice. The initial class is
 * applied by the inline script in layout.tsx before first paint; this
 * component only reads the resulting state so the two never disagree.
 */
export function ThemeToggle() {
  const [dark, setDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
    setMounted(true);
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {
      // Private browsing with storage disabled — the toggle still works for
      // this page view, it just will not persist.
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
      className="grid h-10 w-10 place-items-center rounded-full text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-sunken)] hover:text-[var(--text-primary)]"
    >
      {/* Render nothing until mounted so the server and client markup match. */}
      {mounted && <Icon name={dark ? "sun" : "moon"} size={18} />}
    </button>
  );
}
