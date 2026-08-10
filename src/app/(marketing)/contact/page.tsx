import type { Metadata } from "next";
import Link from "next/link";
import { ContactForm } from "@/components/forms/ContactForm";
import { Icon, type IconName } from "@/components/ui/Icon";
import { PageHero } from "@/components/ui/Section";
import { SITE } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Get in touch with SingAdvisor about trainings, events, consultancy engagements or careers.",
};

const CHANNELS: {
  icon: IconName;
  label: string;
  value: string;
  href?: string;
  note: string;
}[] = [
  {
    icon: "mail",
    label: "Email",
    value: SITE.email,
    href: `mailto:${SITE.email}`,
    note: "We reply within one working day.",
  },
  {
    icon: "phone",
    label: "Phone",
    value: SITE.phone,
    href: `tel:${SITE.phone.replace(/\s/g, "")}`,
    note: "Weekdays, 9am – 6pm SGT.",
  },
  {
    icon: "whatsapp",
    label: "WhatsApp",
    value: "Message us",
    href: `https://wa.me/${SITE.whatsapp}`,
    note: "Usually the fastest way to reach us.",
  },
  {
    icon: "map-pin",
    label: "Office",
    value: SITE.address,
    note: "Visits by appointment.",
  },
];

export default function ContactPage() {
  return (
    <>
      <PageHero
        eyebrow="Contact"
        title="Tell us what you're trying to change"
        description="Whether it's a programme for your team, a place at an event, a consultancy engagement or a question about a role — this reaches us either way."
      />

      <div className="container-page grid gap-12 py-14 lg:grid-cols-[1fr_1.4fr] lg:gap-16 lg:py-20">
        {/* ---- Channels -------------------------------------------------- */}
        <div>
          <h2 className="text-2xl">Other ways to reach us</h2>
          <ul className="mt-6 flex flex-col gap-5">
            {CHANNELS.map((c) => (
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
                  {/* Link, not <a>: these are internal routes, so they need
                      client navigation and the basePath prefix. */}
                  <Link
                    href={href}
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
    </>
  );
}
