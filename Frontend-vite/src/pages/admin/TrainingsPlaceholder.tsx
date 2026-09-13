import { useParams } from "react-router-dom";
import TrainingsShell from "@/components/admin/TrainingsShell";
import { PageHeading, AdminEmpty } from "@/components/admin/AdminUI";

/** Explicit tab prop (the route passes the name statically so the tab routes
 * can be declared before the :id edit route — see App.tsx); falls back to
 * the URL param for any future dynamic usage. This is what a new Trainings
 * tab lands on until its real page exists: add a row to TrainingsNestedNav's
 * TABS, a literal route before `trainings/:id`, and the section is browsable. */
export default function TrainingsPlaceholder({ tab: tabProp }: { tab?: string }) {
  const { tab: paramTab } = useParams();
  const tab = tabProp ?? paramTab;
  const label = tab ? tab.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "Trainings";
  return (
    <TrainingsShell>
      <PageHeading title={label} description="Part of the Trainings dashboard, not wired up yet." />
      <AdminEmpty title="Coming soon" description={`The ${label} tab has its place in the nav; its page lands here once it ships.`} />
    </TrainingsShell>
  );
}
