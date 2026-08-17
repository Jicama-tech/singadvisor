import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import EventsShell from "@/components/admin/EventsShell";
import { PageHeading } from "@/components/admin/AdminUI";
import { ParticipantsTable } from "@/components/admin/ParticipantsTable";
import { fetchTicketsAdmin, type TicketRow } from "@/lib/events-admin-client";

export default function ParticipantsList() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<TicketRow[]>([]);

  const load = useCallback(async () => {
    try {
      setTickets(await fetchTicketsAdmin());
    } catch {
      setTickets([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (!user) return null;

  return (
    <EventsShell>
      <div className="flex flex-col gap-8">
        <PageHeading
          title="Participants"
          description={`${tickets.length} ticket${tickets.length === 1 ? "" : "s"}`}
        />
        <ParticipantsTable tickets={tickets} onMutate={load} />
      </div>
    </EventsShell>
  );
}
