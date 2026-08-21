import { useEffect, useState } from "react";
import { AppImage as Image } from "@/components/ui/AppImage";
import { Link } from "react-router-dom";
import { NewsletterForm } from "@/components/site/NewsletterForm";
import { Icon } from "@/components/ui/Icon";
import { SITE } from "@/lib/constants";

/** Same GET /settings/public convention as WhatsAppButton.tsx — the footer's
 * email row only shows once the admin has explicitly turned it on in
 * Settings → Contact. */
type ContactSettings = {
  contactEmailEnabled: boolean;
  contactEmail: string;
};

const COLUMNS = [
  {
    heading: "What we do",
    links: [
      { href: "/trainings", label: "Trainings" },
      { href: "/events", label: "Events" },
      { href: "/consultancy", label: "Consultancy" },
      { href: "/careers", label: "Careers" },
    ],
  },
  {
    heading: "Company",
    links: [
      { href: "/blog", label: "Blog" },
      { href: "/about", label: "About us" },
      { href: "/contact", label: "Contact" },
      { href: "/trainings?category=Corporate", label: "For employers" },
      { href: "/trainings?category=Student", label: "For students" },
    ],
  },
] as const;

export function Footer() {
  const [settings, setSettings] = useState<ContactSettings | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(`${__API_URL__}/settings/public`);
        if (res.ok && !cancelled) setSettings((await res.json()) as ContactSettings);
      } catch {
        /* email row just stays hidden */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <footer className="border-t border-[var(--border-subtle)] surface-sunken">
      <div className="container-page py-16">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr_1fr_1.4fr]">
          <div className="flex flex-col items-start gap-4">
            {/* items-start matters: in a column flex the default align-items
                is `stretch`, which overrides `w-auto` and stretches the logo
                to the column width, distorting it. */}
            <Image
              src="/Images/logo/Log.png"
              alt="SingAdvisor"
              width={168}
              height={44}
              className="h-9 w-auto dark:hidden"
            />
            <Image
              src="/Images/logo/Logwhite.png"
              alt="SingAdvisor"
              width={168}
              height={44}
              className="hidden h-9 w-auto dark:block"
            />
            <p className="max-w-xs text-sm leading-relaxed text-[var(--text-secondary)]">
              {SITE.tagline}
            </p>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.heading} className="flex flex-col gap-3">
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                {col.heading}
              </h3>
              <ul className="flex flex-col gap-2">
                {col.links.map((link) => (
                  <li key={link.href + link.label}>
                    <Link
                      to={link.href}
                      // -my-1 py-1 enlarges the touch target to ~25px without
                      // altering the visual rhythm of the list.
                      className="-my-1 inline-block py-1 text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--accent)]"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div className="flex flex-col gap-4">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              Stay in the loop
            </h3>
            <p className="text-sm text-[var(--text-secondary)]">
              New programmes and upcoming events, roughly once a month.
            </p>
            <NewsletterForm />
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-[var(--border-subtle)] pt-8 text-sm text-[var(--text-secondary)] md:flex-row md:items-center md:justify-between">
          <p>
            © {new Date().getFullYear()} {SITE.name}. All rights reserved.
          </p>
          <ul className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <li className="flex items-center gap-2">
              <Icon name="map-pin" size={15} />
              {SITE.address}
            </li>
            {settings?.contactEmailEnabled && settings.contactEmail && (
              <li>
                <a
                  href={`mailto:${settings.contactEmail}`}
                  className="flex items-center gap-2 transition-colors hover:text-[var(--accent)]"
                >
                  <Icon name="mail" size={15} />
                  {settings.contactEmail}
                </a>
              </li>
            )}
          </ul>
        </div>
      </div>
    </footer>
  );
}
