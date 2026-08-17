import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

// The admin area reflects live data, so nothing here may be cached.
export const dynamic = "force-dynamic";

export const metadata = {
  title: { default: "Admin", template: "%s | SingAdvisor Admin" },
  robots: { index: false, follow: false },
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // The middleware already redirects unauthenticated requests; this is the
  // authoritative check, since middleware alone is not a security boundary.
  const session = await getSession();
  if (!session) redirect("/admin/login");

  // Unread counts drive the sidebar badges.
  const [registrations, enquiries, applications, messages] = await Promise.all([
    db.registration.count({ where: { status: "pending" } }),
    db.consultancyEnquiry.count({ where: { status: "new" } }),
    db.jobApplication.count({ where: { status: "received" } }),
    db.contactMessage.count({ where: { handled: false } }),
  ]);

  return (
    <AdminShell
      user={{ name: session.name, email: session.email, role: session.role }}
      counts={{ registrations, enquiries, applications, messages }}
    >
      {children}
    </AdminShell>
  );
}
