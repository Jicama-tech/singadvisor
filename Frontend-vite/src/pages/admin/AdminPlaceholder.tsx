import { useAuth } from "@/hooks/useAuth";
import { PageHeading, AdminEmpty } from "@/components/admin/AdminUI";

/**
 * Shared scaffold for admin pages not yet ported — renders the real shell
 * plus a "coming soon" body so every route in App.tsx is genuinely browsable
 * while the domain pages land one by one (Phase 10c).
 */
export default function AdminPlaceholder({ title }: { title: string }) {
  const { user } = useAuth();
  if (!user) return null;

  return (
      <div className="flex flex-col gap-8">
        <PageHeading title={title} description="This page is being ported to the new dashboard." />
        <AdminEmpty
          title="Coming soon"
          description={`The ${title} page is part of the dashboard migration and is not wired up yet.`}
        />
      </div>
  );
}
