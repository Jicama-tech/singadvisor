import { useParams } from "react-router-dom";
import EventsShell from "@/components/admin/EventsShell";
import { PageHeading, AdminEmpty } from "@/components/admin/AdminUI";

export default function EventsPlaceholder() {
  const { tab } = useParams();
  const label = tab ? tab.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "Events";
  return (
    <EventsShell>
      <PageHeading title={label} description="This page is being ported to the new dashboard." />
      <AdminEmpty title="Coming soon" description={`The ${label} tab is part of the dashboard migration and is not wired up yet.`} />
    </EventsShell>
  );
}
