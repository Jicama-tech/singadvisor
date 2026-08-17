
import { AppImage as Image } from "@/components/ui/AppImage";
import { Link } from "react-router-dom";
import { useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { ThemeToggle } from "@/components/site/ThemeToggle";
import { cn } from "@/lib/utils";
import { fetchLandingSections } from "@/lib/landing-client";

// Each entry optionally maps to a landing-page section — when that section
// is set to Hidden in the admin's Landing page, the matching navbar link
// hides too (so the public nav and the homepage always agree). "about" has
// no section (it is always visible).
const NAV = [
  { href: "/trainings", label: "Trainings", section: "trainings" },
  { href: "/events", label: "Events", section: "events" },
  { href: "/consultancy", label: "Consultancy", section: "consultancy" },
  { href: "/careers", label: "Careers", section: "careers" },
  { href: "/blog", label: "Blog", section: "blog" },
  { href: "/about", label: "About", section: null },
] as const;

export function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [hiddenSections, setHiddenSections] = useState<Set<string> | null>(null);
  const { pathname } = useLocation();

  // Landing-section visibility drives which links show. Fail-open: when the
  // fetch fails (or the list is empty) nothing is hidden.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const sections = await fetchLandingSections();
      if (cancelled || sections.length === 0) return;
      const visible = new Set(sections.map((s) => s.key));
      const hidden = new Set(
        (["trainings", "events", "consultancy", "careers", "blog"] as const).filter((k) => !visible.has(k)),
      );
      setHiddenSections(hidden);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Close the mobile sheet whenever the route changes.
  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Prevent the page scrolling behind the open mobile sheet.
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  const visibleNav = NAV.filter((item) => !hiddenSections || !item.section || !hiddenSections.has(item.section));

  return (
    <header
      className={cn(
        "sticky top-0 z-50 border-b transition-all duration-300",
        scrolled
          ? "border-[var(--border-subtle)] bg-[var(--surface)]/85 backdrop-blur-lg"
          : "border-transparent bg-[var(--surface)]",
      )}
    >
      <nav
        aria-label="Main"
        className="container-page flex h-18 items-center justify-between gap-4"
      >
        <Link
          to="/"
          className="flex shrink-0 items-center"
          aria-label="SingAdvisor home"
        >
          <Image
            src="/Images/logo/Log.png"
            alt="SingAdvisor"
            width={168}
            height={44}
            priority
            className="h-9 w-auto dark:hidden"
          />
          <Image
            src="/Images/logo/Logwhite.png"
            alt="SingAdvisor"
            width={168}
            height={44}
            priority
            className="hidden h-9 w-auto dark:block"
          />
        </Link>

        <ul className="hidden items-center gap-1 lg:flex">
          {visibleNav.map((item) => (
            <li key={item.href}>
              <Link
                to={item.href}
                aria-current={isActive(item.href) ? "page" : undefined}
                className={cn(
                  "relative rounded-full px-4 py-2 text-[0.9375rem] font-medium transition-colors",
                  isActive(item.href)
                    ? "text-[var(--accent)]"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
                )}
              >
                {item.label}
                {isActive(item.href) && (
                  <span className="absolute inset-x-4 -bottom-px h-0.5 rounded-full bg-[var(--accent)]" />
                )}
              </Link>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          {/* Wrapped rather than putting `hidden sm:inline-flex` on the button:
              the button's own base class already sets `inline-flex`, and which
              display utility wins is decided by stylesheet order, not class
              order — so the button would stay visible on mobile. */}
          <span className="hidden sm:contents">
            <ButtonLink to="/contact" size="sm">
              Get in touch
            </ButtonLink>
          </span>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? "Close menu" : "Open menu"}
            className="grid h-10 w-10 place-items-center rounded-full text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-sunken)] lg:hidden"
          >
            <Icon name={open ? "x" : "menu"} />
          </button>
        </div>
      </nav>

      {open && (
        <div
          id="mobile-menu"
          className="border-t border-[var(--border-subtle)] bg-[var(--surface)] lg:hidden"
        >
          <ul className="container-page flex flex-col py-3">
            {visibleNav.map((item) => (
              <li key={item.href}>
                <Link
                  to={item.href}
                  aria-current={isActive(item.href) ? "page" : undefined}
                  className={cn(
                    "flex items-center justify-between rounded-xl px-3 py-3 text-base font-medium transition-colors",
                    isActive(item.href)
                      ? "bg-[var(--accent-soft)] text-[var(--accent-on-soft)]"
                      : "text-[var(--text-secondary)] hover:bg-[var(--surface-sunken)]",
                  )}
                >
                  {item.label}
                  <Icon name="arrow-right" size={16} />
                </Link>
              </li>
            ))}
            <li className="mt-2 px-3">
              <ButtonLink to="/contact" className="w-full">
                Get in touch
              </ButtonLink>
            </li>
          </ul>
        </div>
      )}
    </header>
  );
}
