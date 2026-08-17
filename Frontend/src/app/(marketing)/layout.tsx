import { Footer } from "@/components/site/Footer";
import { Navbar } from "@/components/site/Navbar";
import { WhatsAppButton } from "@/components/site/WhatsAppButton";

export default function MarketingLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
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
