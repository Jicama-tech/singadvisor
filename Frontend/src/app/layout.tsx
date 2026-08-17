import type { Metadata } from "next";
import { Inter, Fraunces } from "next/font/google";
import { SITE } from "@/lib/constants";
import { withBasePath } from "@/lib/base-path";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
  axes: ["SOFT", "WONK"],
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  ),
  title: {
    default: `${SITE.name} — Trainings, Events, Consultancy & Careers`,
    template: `%s | ${SITE.name}`,
  },
  description: SITE.tagline,
  openGraph: {
    type: "website",
    locale: "en_SG",
    siteName: SITE.name,
    title: `${SITE.name} — Trainings, Events, Consultancy & Careers`,
    description: SITE.tagline,
  },
  // Metadata paths are emitted verbatim, so the prefix has to be explicit.
  icons: { icon: withBasePath("/Images/logo/Log.png") },
};

/**
 * Applies the persisted theme before first paint. Inlined deliberately —
 * anything async here produces a flash of the wrong theme on load.
 */
const themeScript = `
(function(){
  try {
    var stored = localStorage.getItem('theme');
    var dark = stored ? stored === 'dark'
      : window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (dark) document.documentElement.classList.add('dark');
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    // The font variables must sit on <html>, not <body>: the @theme tokens in
    // globals.css resolve --font-sans/--font-display at :root, and a variable
    // defined only on <body> is not in scope there — every heading would
    // silently fall back to a system font.
    <html
      lang="en-SG"
      className={`${inter.variable} ${fraunces.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-[var(--accent)] focus:px-5 focus:py-2.5 focus:text-sm focus:font-medium focus:text-[var(--accent-foreground)]"
        >
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
