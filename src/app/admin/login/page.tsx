import type { Metadata } from "next";
import { LoginForm } from "@/components/admin/LoginForm";
import { SITE } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};

// Read at request time, not build time, so the demo shortcut can be switched
// off by editing .env and restarting — no rebuild or redeploy needed.
export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  /**
   * One-click demo sign-in.
   *
   * Only rendered when BOTH DEMO_LOGIN_EMAIL and DEMO_LOGIN_PASSWORD are set —
   * so it is off unless someone deliberately turns it on. Remember this page is
   * public: while it is enabled, anyone who reaches the URL can sign in and
   * change content. Clear the two vars and `pm2 restart singadvisor` to disable.
   */
  const demoEmail = process.env.DEMO_LOGIN_EMAIL?.trim();
  const demoPassword = process.env.DEMO_LOGIN_PASSWORD?.trim();
  const demo =
    demoEmail && demoPassword
      ? { email: demoEmail, password: demoPassword }
      : undefined;

  return (
    <div className="grid min-h-screen place-items-center surface-sunken px-5 py-12">
      <div className="w-full max-w-sm">
        <div className="text-center">
          <h1 className="text-3xl">{SITE.name}</h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Sign in to manage site content.
          </p>
        </div>

        <div className="mt-8 rounded-[var(--radius-card)] border border-[var(--border-subtle)] surface-raised p-7 shadow-[var(--shadow-soft)]">
          <LoginForm next={next} demo={demo} />
        </div>
      </div>
    </div>
  );
}
