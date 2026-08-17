import type { ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { AdminShell } from "@/components/admin/AdminShell";
import { EventsNestedNav } from "@/components/admin/EventsNestedNav";

/**
 * The React-Router equivalent of the Next app's `events/layout.tsx`: pages
 * under /admin/events that belong to the "Organizer dashboard" tab set render
 * inside AdminShell PLUS the nested secondary sidebar (a second column
 * between the main sidebar and content). Focused sub-pages (new/edit forms)
 * skip this wrapper entirely and stay full-width.
 */
export default function EventsShell({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <AdminShell
      user={{ name: user.name, email: user.email, role: user.role }}
      counts={{ registrations: 0, enquiries: 0, applications: 0, messages: 0 }}
    >
      <div className="flex flex-col gap-0 lg:flex-row lg:items-start">
        <EventsNestedNav />
        <div className="min-w-0 flex-1 p-4 lg:p-6">{children}</div>
      </div>
    </AdminShell>
  );
}
