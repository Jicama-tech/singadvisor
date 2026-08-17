import type { ReactNode } from "react";
import { Footer } from "@/components/site/Footer";
import { Navbar } from "@/components/site/Navbar";
import { WhatsAppButton } from "@/components/site/WhatsAppButton";

/** The React-Router equivalent of the Next app's (marketing)/layout.tsx —
 * every public page renders inside this chrome. */
export default function MarketingShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main id="main" className="flex-1">
        {children}
      </main>
      <Footer />
      <WhatsAppButton />
    </div>
  );
}
