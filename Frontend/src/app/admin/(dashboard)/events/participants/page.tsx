import { PageHeading } from "@/components/admin/AdminUI";
import { ParticipantsTable } from "@/components/admin/ParticipantsTable";
import { fetchTicketsAdmin } from "@/lib/events-admin-client";

export const metadata = { title: "Participants" };

export default async function AdminParticipantsPage() {
  const tickets = await fetchTicketsAdmin();

  return (
    <>
      <PageHeading
        title="Participants"
        description={`${tickets.length} ticket${tickets.length === 1 ? "" : "s"}`}
      />
      <ParticipantsTable tickets={tickets} />
    </>
  );
}
