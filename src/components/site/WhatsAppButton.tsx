import { Icon } from "@/components/ui/Icon";
import { SITE } from "@/lib/constants";

export function WhatsAppButton() {
  const href = `https://wa.me/${SITE.whatsapp}?text=${encodeURIComponent(
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
