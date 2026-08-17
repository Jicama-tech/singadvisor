
import { useMemo, useState } from "react";
import { markTicketAttendanceAction, resendTicketEmailAction } from "@/app/admin/actions";
import { AdminEmpty, Panel, TableWrap, Td, Th } from "@/components/admin/AdminUI";
import { Badge } from "@/components/ui/Badge";
import { SubmitButton } from "@/components/forms/FormShell";
import { Icon } from "@/components/ui/Icon";
import { Input, Select } from "@/components/ui/Field";
import type { TicketRow } from "@/lib/events-admin-client";
import { formatDateTime, formatPrice } from "@/lib/utils";

const STATUS_TONE: Record<TicketRow["status"], "success" | "warn" | "danger" | "neutral"> = {
  confirmed: "success",
  pending: "warn",
  cancelled: "danger",
  used: "neutral",
};

/** The Visitors view from eventsh's EventAttendees.tsx (Exhibitors/Speakers/
 * Round Tables/Workshop/Sponsors/Scheduled Spaces sub-tabs are explicitly
 * out of scope for this pass — see the Phase 6d plan notes). Filtering is
 * client-side, same as eventsh's own TicketFilters, since fetchTicketsAdmin
 * already returns the organizer's full ticket list unfiltered. */
export function ParticipantsTable({ tickets }: { tickets: TicketRow[] }) {
  const [search, setSearch] = useState("");
  const [eventFilter, setEventFilter] = useState("all");
  const [attendanceFilter, setAttendanceFilter] = useState<"all" | "present" | "absent">("all");

  const events = useMemo(() => {
    const seen = new Map<string, string>();
    for (const t of tickets) if (!seen.has(t.eventId)) seen.set(t.eventId, t.eventTitle);
    return Array.from(seen, ([id, title]) => ({ id, title }));
  }, [tickets]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tickets.filter((t) => {
      if (eventFilter !== "all" && t.eventId !== eventFilter) return false;
      if (attendanceFilter === "present" && !t.isUsed) return false;
      if (attendanceFilter === "absent" && t.isUsed) return false;
      if (
        q &&
        !t.customerName.toLowerCase().includes(q) &&
        !t.customerEmail.toLowerCase().includes(q)
      )
        return false;
      return true;
    });
  }, [tickets, search, eventFilter, attendanceFilter]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter by name or email"
          className="max-w-xs"
          aria-label="Filter by name or email"
        />
        <Select
          value={eventFilter}
          onChange={(e) => setEventFilter(e.target.value)}
          className="max-w-xs"
          aria-label="Filter by event"
        >
          <option value="all">All events</option>
          {events.map((e) => (
            <option key={e.id} value={e.id}>
              {e.title}
            </option>
          ))}
        </Select>
        <Select
          value={attendanceFilter}
          onChange={(e) => setAttendanceFilter(e.target.value as typeof attendanceFilter)}
          className="max-w-40"
          aria-label="Filter by attendance"
        >
          <option value="all">All</option>
          <option value="present">Checked in</option>
          <option value="absent">Not checked in</option>
        </Select>
      </div>

      <Panel>
        {filtered.length === 0 ? (
          <AdminEmpty
            message={tickets.length === 0 ? "No tickets sold yet." : "No tickets match your filters."}
          />
        ) : (
          <TableWrap>
            <thead>
              <tr>
                <Th>Visitor</Th>
                <Th>Event</Th>
                <Th>Tickets</Th>
                <Th>Amount</Th>
                <Th>Status</Th>
                <Th>Attendance</Th>
                <Th>Purchased</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <tr key={t._id} className="hover:bg-[var(--surface-sunken)]">
                  <Td>
                    <span className="block font-medium text-[var(--text-primary)]">
                      {t.customerName}
                    </span>
                    <a
                      href={`mailto:${t.customerEmail}`}
                      className="block text-xs text-[var(--accent)] hover:underline"
                    >
                      {t.customerEmail}
                    </a>
                    {t.customerPhone && (
                      <span className="block text-xs text-[var(--text-muted)]">
                        {t.customerPhone}
                      </span>
                    )}
                  </Td>
                  <Td className="text-[var(--text-secondary)]">{t.eventTitle}</Td>
                  <Td className="text-[var(--text-secondary)]">
                    {t.ticketDetails.map((d, i) => (
                      <span key={i} className="block whitespace-nowrap">
                        {d.quantity}× {d.ticketType}
                      </span>
                    ))}
                  </Td>
                  <Td className="whitespace-nowrap text-[var(--text-secondary)]">
                    {formatPrice(Math.round(t.totalAmount * 100), t.currency)}
                  </Td>
                  <Td>
                    <Badge tone={STATUS_TONE[t.status]}>{t.status}</Badge>
                  </Td>
                  <Td>
                    {t.isUsed ? (
                      <Badge tone="success">Checked in</Badge>
                    ) : (
                      <form action={markTicketAttendanceAction}>
                        <input type="hidden" name="ticketId" value={t.ticketId} />
                        <SubmitButton pendingLabel="Marking…" className="!h-8 !px-3 !text-xs">
                          Mark present
                        </SubmitButton>
                      </form>
                    )}
                  </Td>
                  <Td className="whitespace-nowrap text-[var(--text-secondary)]">
                    {formatDateTime(t.purchaseDate)}
                  </Td>
                  <Td>
                    <div className="flex items-center justify-end">
                      <form action={resendTicketEmailAction}>
                        <input type="hidden" name="id" value={t._id} />
                        <button
                          type="submit"
                          aria-label={`Resend ticket email to ${t.customerEmail}`}
                          className="grid h-8 w-8 place-items-center rounded-lg text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-sunken)] hover:text-[var(--accent)]"
                        >
                          <Icon name="mail" size={15} />
                        </button>
                      </form>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        )}
      </Panel>
    </div>
  );
}
