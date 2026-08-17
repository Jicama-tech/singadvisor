import { useParams } from "react-router-dom";
import EventsShell from "@/components/admin/EventsShell";
import { PageHeading, AdminEmpty } from "@/components/admin/AdminUI";

/** Explicit tab prop (the route passes the name statically so the tab routes
 * can be declared before the :id edit route — see App.tsx); falls back to
 * the URL param for any future dynamic usage. */
export default function EventsPlaceholder({ tab: tabProp }: { tab?: string }) {
  const { tab: paramTab } = useParams();
  const tab = tabProp ?? paramTab;
  const label = tab ? tab.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "Events";
  return (
    <EventsShell>
      <PageHeading title={label} description="This page is being ported to the new dashboard." />
      <AdminEmpty title="Coming soon" description={`The ${label} tab is part of the dashboard migration and is not wired up yet.`} />
    </EventsShell>
  );
}
