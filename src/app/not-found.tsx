import Link from "next/link";
import { ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";

const SUGGESTIONS = [
  { href: "/trainings", label: "Trainings" },
  { href: "/events", label: "Events" },
  { href: "/consultancy", label: "Consultancy" },
  { href: "/careers", label: "Careers" },
];

export default function NotFound() {
  return (
    <div className="grid min-h-screen place-items-center px-5 py-20">
      <div className="max-w-lg text-center">
        <p className="font-[family-name:var(--font-display)] text-7xl font-semibold text-[var(--accent)]/30">
          404
        </p>
        <h1 className="mt-4 text-3xl md:text-4xl">We can&apos;t find that page</h1>
        <p className="mt-4 text-[var(--text-secondary)]">
          It may have moved, or the link might be out of date. Here is where most
          people are headed:
        </p>

        <ul className="mt-8 flex flex-wrap justify-center gap-2">
          {SUGGESTIONS.map((s) => (
            <li key={s.href}>
              <Link
                href={s.href}
                className="inline-flex items-center gap-1.5 rounded-full surface-sunken px-4 py-2 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:text-[var(--accent)]"
              >
                {s.label}
                <Icon name="arrow-right" size={14} />
              </Link>
            </li>
          ))}
        </ul>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <ButtonLink href="/">Back to home</ButtonLink>
          <ButtonLink href="/contact" variant="secondary">
            Contact us
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}
