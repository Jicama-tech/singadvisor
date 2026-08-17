import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { adminFetch } from "@/lib/adminFetch";
import EventsShell from "@/components/admin/EventsShell";
import { PageHeading } from "@/components/admin/AdminUI";
import { ParticipantsTable, type AuditTicket } from "@/components/admin/ParticipantsTable";
import { fetchTicketsAdmin, type TicketRow } from "@/lib/events-admin-client";

/**
 * Participants = eventsh tickets (the system of record) joined with this
 * Backend's local payment audit (GET /tickets/admin) by the shared
 * `ticketId`, so each row can also show HOW the ticket was paid (method,
 * verifiedAt, PayNow reference). Audit rows exist for every purchase made
 * through the SingAdvisor checkout (Razorpay, PayNow, free).
 */
export default function ParticipantsList() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [auditByTicketId, setAuditByTicketId] = useState<Map<string, AuditTicket>>(new Map());

  const load = useCallback(async () => {
    try {
      const [eventshTickets, auditRes] = await Promise.all([
        fetchTicketsAdmin(),
        adminFetch(`${__API_URL__}/tickets/admin`),
      ]);
      const audit: AuditTicket[] = auditRes.ok ? await auditRes.json() : [];
      setAuditByTicketId(new Map(audit.map((a) => [a.ticketId, a])));
      setTickets(eventshTickets);
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
        <ParticipantsTable tickets={tickets} auditByTicketId={auditByTicketId} onMutate={load} />
      </div>
    </EventsShell>
  );
}
