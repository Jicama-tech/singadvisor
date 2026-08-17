import { Helmet } from "react-helmet-async";
import { Navigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { LoginForm } from "@/components/admin/LoginForm";
import { SITE } from "@/lib/constants";

/**
 * SPA login page. The Next version also offered a one-click demo sign-in
 * gated by DEMO_LOGIN_EMAIL/PASSWORD — deliberately NOT ported: those
 * credentials lived server-side there, while a SPA would have to ship the
 * password in the public JS bundle, which is strictly worse. Demo access
 * can be re-added later as a Backend-issued feature instead.
 */
export default function AdminLogin() {
  const { user, loading } = useAuth();
  const [searchParams] = useSearchParams();
  const next = searchParams.get("next") ?? undefined;

  if (loading) return null;
  if (user) return <Navigate to="/admin" replace />;

  return (
    <div className="grid min-h-screen place-items-center surface-sunken px-5 py-12">
      <Helmet>
        <title>Sign in — SingAdvisor</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <div className="w-full max-w-sm">
        <div className="text-center">
          <h1 className="text-3xl">{SITE.name}</h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Sign in to manage site content.
          </p>
        </div>

        <div className="mt-8 rounded-[var(--radius-card)] border border-[var(--border-subtle)] surface-raised p-7 shadow-[var(--shadow-soft)]">
          <LoginForm next={next} />
        </div>
      </div>
    </div>
  );
}
