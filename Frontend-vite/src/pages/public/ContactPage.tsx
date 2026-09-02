import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import MarketingShell from "@/components/site/MarketingShell";
import { ContactForm } from "@/components/forms/ContactForm";
import { Icon, type IconName } from "@/components/ui/Icon";
import { PageHero } from "@/components/ui/Section";
import { SITE } from "@/lib/constants";

/** The contact channels an admin configures in Settings -> Contact
 * (GET /settings/public). Same convention the Footer and WhatsAppButton
 * already follow: a channel is off, and its value blank, until it has been
 * explicitly turned on and filled in. */
type ContactSettings = {
  contactEmailEnabled: boolean;
  contactEmail: string;
  whatsappEnabled: boolean;
  whatsappNumber: string;
  contactPhoneEnabled: boolean;
  contactPhone: string;
  officeAddressEnabled: boolean;
  officeAddress: string;
  contactEmailNote: string;
  contactPhoneNote: string;
  whatsappNote: string;
  officeAddressNote: string;
};

type Channel = {
  icon: IconName;
  label: string;
  value: string;
  href?: string;
  note: string;
};

/** The wording the page shipped with — used for any note left blank in
 * Settings, so an unconfigured site reads exactly as it always did. */
const DEFAULT_NOTES = {
  email: "We reply within one working day.",
  phone: "Weekdays, 9am - 6pm SGT.",
  whatsapp: "Usually the fastest way to reach us.",
  office: "Visits by appointment.",
};

/** wa.me wants bare digits; the stored number is PhoneField's combined
 * "+65 9123 4567" form. */
function waDigits(phone: string): string {
  return phone.replace(/\D/g, "");
}

/**
 * Builds the channel list from settings, falling back to the SITE constants
 * while nothing is configured — otherwise a fresh install would show an empty
 * "Other ways to reach us" column. A channel the admin has explicitly turned
 * OFF is omitted entirely rather than falling back, since switching it off is
 * a deliberate instruction not to show it.
 */
function buildChannels(settings: ContactSettings | null): Channel[] {
  const channels: Channel[] = [];
  const unconfigured = settings === null;

  const email = settings?.contactEmailEnabled ? settings.contactEmail : unconfigured ? SITE.email : "";
  if (email) {
    channels.push({
      icon: "mail",
      label: "Email",
      value: email,
      href: `mailto:${email}`,
      note: settings?.contactEmailNote || DEFAULT_NOTES.email,
    });
  }

  const phone = settings?.contactPhoneEnabled ? settings.contactPhone : unconfigured ? SITE.phone : "";
  if (phone) {
    channels.push({
      icon: "phone",
      label: "Phone",
      value: phone,
      href: `tel:${phone.replace(/\s/g, "")}`,
      note: settings?.contactPhoneNote || DEFAULT_NOTES.phone,
    });
  }

  const whatsapp = settings?.whatsappEnabled ? waDigits(settings.whatsappNumber) : unconfigured ? SITE.whatsapp : "";
  if (whatsapp) {
    channels.push({
      icon: "whatsapp",
      label: "WhatsApp",
      value: "Message us",
      href: `https://wa.me/${whatsapp}`,
      note: settings?.whatsappNote || DEFAULT_NOTES.whatsapp,
    });
  }

  const address = settings?.officeAddressEnabled ? settings.officeAddress : unconfigured ? SITE.address : "";
  if (address) {
    channels.push({
      icon: "map-pin",
      label: "Office",
      value: address,
      note: settings?.officeAddressNote || DEFAULT_NOTES.office,
    });
  }

  return channels;
}

export default function ContactPage() {
  const [settings, setSettings] = useState<ContactSettings | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(`${__API_URL__}/settings/public`);
        if (res.ok && !cancelled) setSettings((await res.json()) as ContactSettings);
      } catch {
        /* falls back to the SITE constants below */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const channels = buildChannels(settings);

  return (
    <MarketingShell>
      <Helmet>
        <title>Contact — SingAdvisor</title>
        <meta
          name="description"
          content="Get in touch with SingAdvisor about trainings, events, consultancy engagements or careers."
        />
      </Helmet>

      <PageHero
        eyebrow="Contact"
        title="Tell us what you're trying to change"
        description="Whether it's a programme for your team, a place at an event, a consultancy engagement or a question about a role — this reaches us either way."
      />

      <div className="container-page grid gap-12 py-14 lg:grid-cols-[1fr_1.4fr] lg:gap-16 lg:py-20">
        {/* ---- Channels -------------------------------------------------- */}
        <div>
          {channels.length > 0 && (
            <>
            <h2 className="text-2xl">Other ways to reach us</h2>
            <ul className="mt-6 flex flex-col gap-5">
              {channels.map((c) => (
              <li key={c.label} className="flex items-start gap-4">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent-on-soft)]">
                  <Icon name={c.icon} size={19} />
                </span>
                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-wide text-[var(--text-muted)]">
                    {c.label}
                  </p>
                  {c.href ? (
                    <a
                      href={c.href}
                      target={c.href.startsWith("http") ? "_blank" : undefined}
                      rel={c.href.startsWith("http") ? "noopener noreferrer" : undefined}
                      className="-my-1 inline-block py-1 font-medium text-[var(--text-primary)] transition-colors hover:text-[var(--accent)]"
                    >
                      {c.value}
                    </a>
                  ) : (
                    <p className="font-medium text-[var(--text-primary)]">{c.value}</p>
                  )}
                  <p className="mt-0.5 text-sm text-[var(--text-secondary)]">{c.note}</p>
                </div>
              </li>
              ))}
            </ul>
            </>
          )}

          <div className="mt-10 rounded-[var(--radius-card)] surface-sunken p-6">
            <h3 className="text-lg">Looking for something specific?</h3>
            <ul className="mt-3 flex flex-col gap-2 text-sm">
              {[
                ["Book a place on a programme", "/trainings"],
                ["Register for an event", "/events"],
                ["Scope a consultancy engagement", "/consultancy#enquire"],
                ["Apply for a role", "/careers"],
              ].map(([label, href]) => (
                <li key={href}>
                  <Link
                    to={href}
                    className="group flex items-center gap-2 text-[var(--text-secondary)] transition-colors hover:text-[var(--accent)]"
                  >
                    <Icon
                      name="arrow-right"
                      size={14}
                      className="transition-transform group-hover:translate-x-1"
                    />
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* ---- Form ------------------------------------------------------ */}
        <div className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] surface-raised p-6 shadow-[var(--shadow-soft)] md:p-8">
          <h2 className="text-2xl">Send us a message</h2>
          <p className="mt-1.5 text-sm text-[var(--text-secondary)]">
            All fields marked with an asterisk are required.
          </p>
          <div className="mt-6">
            <ContactForm />
          </div>
        </div>
      </div>
    </MarketingShell>
  );
}
