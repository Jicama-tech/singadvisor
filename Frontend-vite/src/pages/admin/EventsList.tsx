import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import EventsShell from "@/components/admin/EventsShell";
import { AdminEmpty, PageHeading, Panel, TableWrap, Td, Th } from "@/components/admin/AdminUI";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { CouponsPanel } from "@/components/admin/CouponsPanel";
import { deleteEvent } from "@/eventsActions";
import { fetchCouponsAdmin, fetchEventsAdmin } from "@/lib/events-admin-client";
import type { CouponRow } from "@/lib/events-admin-client";
import type { EventRow } from "@/lib/events-client";
import { formatDate } from "@/lib/utils";

export default function EventsList() {
  const { user } = useAuth();
  const [events, setEvents] = useState<EventRow[] | null>(null);
  const [coupons, setCoupons] = useState<CouponRow[]>([]);

  const load = useCallback(async () => {
    try {
      const [ev, cp] = await Promise.all([fetchEventsAdmin(), fetchCouponsAdmin()]);
      setEvents(ev);
      setCoupons(cp);
    } catch {
      /* an empty list is better than a blank tab */
      setEvents([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function remove(id: string) {
    await deleteEvent(id);
    await load();
  }

  async function reloadCoupons() {
    setCoupons(await fetchCouponsAdmin());
  }

  if (!user) return null;

  return (
    <EventsShell>
      <Tabs defaultValue="events">
        <div className="flex flex-col gap-6">
          <PageHeading
            title="Events & Coupons"
            description={`${events?.length ?? "…"} event${events?.length === 1 ? "" : "s"}`}
            action={
              <TabsList aria-label="Events or coupons">
                <TabsTrigger value="events">Events</TabsTrigger>
                <TabsTrigger value="coupons">Coupons</TabsTrigger>
              </TabsList>
            }
          />

          <TabsContent value="events">
            <div className="flex flex-col gap-6">
              <div className="flex justify-end">
                <ButtonLink to="/admin/events/new" size="sm">
                  <Icon name="plus" size={16} />
                  New event
                </ButtonLink>
              </div>

              <Panel>
                {events && events.length === 0 ? (
                  <AdminEmpty message="No events yet. Create your first one." />
                ) : (
                  <TableWrap>
                    <thead>
                      <tr>
                        <Th>Event</Th>
                        <Th>Date</Th>
                        <Th>Status</Th>
                        <Th className="text-right">Actions</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {(events ?? []).map((e) => (
                        <tr key={e._id} className="hover:bg-[var(--surface-sunken)]">
                          <Td>
                            <Link
                              to={`/admin/events/${e._id}`}
                              className="font-medium text-[var(--text-primary)] hover:text-[var(--accent)]"
                            >
                              {e.title}
                            </Link>
                            <span className="block text-xs text-[var(--text-muted)]">/{e.slug}</span>
                          </Td>
                          <Td className="whitespace-nowrap text-[var(--text-secondary)]">
                            {formatDate(e.startDate)}
                          </Td>
                          <Td>
                            <Badge tone={e.status === "published" ? "success" : "neutral"}>
                              {e.status}
                            </Badge>
                          </Td>
                          <Td>
                            <div className="flex items-center justify-end gap-1">
                              <Link
                                to={`/events/${e.slug}`}
                                target="_blank"
                                aria-label={`Preview ${e.title}`}
                                className="grid h-8 w-8 place-items-center rounded-lg text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-sunken)] hover:text-[var(--accent)]"
                              >
                                <Icon name="external" size={15} />
                              </Link>
                              <Link
                                to={`/admin/events/${e._id}`}
                                aria-label={`Edit ${e.title}`}
                                className="grid h-8 w-8 place-items-center rounded-lg text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-sunken)] hover:text-[var(--accent)]"
                              >
                                <Icon name="pencil" size={15} />
                              </Link>
                              <DeleteButton id={e._id} action={remove} label={e.title} />
                            </div>
                          </Td>
                        </tr>
                      ))}
                    </tbody>
                  </TableWrap>
                )}
              </Panel>
            </div>
          </TabsContent>

          <TabsContent value="coupons">
            <CouponsPanel
              coupons={coupons}
              events={(events ?? []).map((e) => ({ _id: e._id, title: e.title }))}
              onMutate={reloadCoupons}
            />
          </TabsContent>
        </div>
      </Tabs>
    </EventsShell>
  );
}
