import { AdminEmpty, PageHeading, Panel } from "@/components/admin/AdminUI";

/** Shared body for every not-yet-built Organizer dashboard tab (see
 * EventsNestedNav.tsx) — real content, not a 404/crash, so the full tab list
 * is genuinely browsable while each is built out incrementally. */
export function ComingSoonTab({ title, description }: { title: string; description: string }) {
  return (
    <>
      <PageHeading title={title} />
      <Panel>
        <AdminEmpty message={description} />
      </Panel>
    </>
  );
}
