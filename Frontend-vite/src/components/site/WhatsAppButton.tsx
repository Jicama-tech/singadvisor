import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";

/** Buyer-facing contact-channel availability (GET /settings/public) — same
 * shape/fetch convention TicketPurchaseForm.tsx already uses for payment
 * methods. Off (and the number/email blank) unless the admin has explicitly
 * enabled each one in Settings → Contact. */
type ContactSettings = {
  whatsappEnabled: boolean;
  whatsappNumber: string;
};

export function WhatsAppButton() {
  const [settings, setSettings] = useState<ContactSettings | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(`${__API_URL__}/settings/public`);
        if (res.ok && !cancelled) setSettings((await res.json()) as ContactSettings);
      } catch {
        /* stays hidden — same as "not configured" */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!settings?.whatsappEnabled || !settings.whatsappNumber) return null;

  // wa.me wants digits only, no "+" or spaces.
  const digits = settings.whatsappNumber.replace(/\D/g, "");
  const href = `https://wa.me/${digits}?text=${encodeURIComponent(
    "Hi SingAdvisor, I'd like to know more about your programmes.",
  )}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with us on WhatsApp"
      className="fixed bottom-6 right-6 z-40 grid h-14 w-14 place-items-center rounded-full bg-[#25D366] text-white shadow-[var(--shadow-lift)] transition-transform hover:scale-105 active:scale-95"
    >
      <Icon name="whatsapp" size={26} />
    </a>
  );
}
