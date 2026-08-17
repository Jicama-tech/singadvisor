import EventsShell from "@/components/admin/EventsShell";
import { PageHeading, AdminEmpty } from "@/components/admin/AdminUI";

export default function EventsList() {
  return (
    <EventsShell>
      <PageHeading title="Events/Coupons" description="This page is being ported to the new dashboard." />
      <AdminEmpty title="Coming soon" description="The Events/Coupons tab is part of the dashboard migration and is not wired up yet." />
    </EventsShell>
  );
}
