import EventsShell from "@/components/admin/EventsShell";
import { PageHeading, AdminEmpty } from "@/components/admin/AdminUI";

export default function ParticipantsList() {
  return (
    <EventsShell>
      <PageHeading title="Participants" description="This page is being ported to the new dashboard." />
      <AdminEmpty title="Coming soon" description="The Participants tab is part of the dashboard migration and is not wired up yet." />
    </EventsShell>
  );
}
