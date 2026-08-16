import Link from "next/link";
import { deleteEvent } from "@/app/admin/actions";
import {
  AdminEmpty,
  PageHeading,
  Panel,
  TableWrap,
  Td,
  Th,
} from "@/components/admin/AdminUI";
import { CouponsPanel } from "@/components/admin/CouponsPanel";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { fetchCouponsAdmin, fetchEventsAdmin } from "@/lib/events-admin-client";
import { formatDateTime, formatPrice, isUpcoming } from "@/lib/utils";

export const metadata = { title: "Events" };

export default async function AdminEventsPage() {
  const [events, coupons] = await Promise.all([fetchEventsAdmin(), fetchCouponsAdmin()]);

  return (
    <>
      <PageHeading
        title="Events"
        description={`${events.length} event${events.length === 1 ? "" : "s"}`}
        action={
          <ButtonLink href="/admin/events/new" size="sm">
            <Icon name="plus" size={16} />
            New event
          </ButtonLink>
        }
      />

      <Tabs defaultValue="events">
        <TabsList className="mb-6">
          <TabsTrigger value="events">Events</TabsTrigger>
          <TabsTrigger value="coupons">Coupons</TabsTrigger>
        </TabsList>

        <TabsContent value="events">
          <EventsListPanel events={events} />
        </TabsContent>
        <TabsContent value="coupons">
          <CouponsPanel
            coupons={coupons}
            events={events.map((e) => ({ _id: e._id, title: e.title }))}
          />
        </TabsContent>
      </Tabs>
    </>
  );
}

function EventsListPanel({ events }: { events: Awaited<ReturnType<typeof fetchEventsAdmin>> }) {
  return (
    <>
      <Panel>
        {events.length === 0 ? (
          <AdminEmpty message="No events yet. Create your first one." />
        ) : (
          <TableWrap>
            <thead>
              <tr>
                <Th>Title</Th>
                <Th>When</Th>
                <Th>Venue</Th>
                <Th>Seats</Th>
                <Th>Admission</Th>
                <Th>Status</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {events.map((e) => {
                const capacity = e.visitorTypes.reduce((sum, t) => sum + t.maxCount, 0);
                const booked = e.visitorTypes.reduce((sum, t) => sum + t.soldCount, 0);
                const upcoming = isUpcoming(e.startDate);
                const nearFull = capacity > 0 && booked / capacity >= 0.8;
                const priceCents = Math.round((e.visitorTypes[0]?.price ?? 0) * 100);

                return (
                  <tr key={e._id} className="hover:bg-[var(--surface-sunken)]">
                    <Td>
                      <Link
                        href={`/admin/events/${e._id}`}
                        className="font-medium text-[var(--text-primary)] hover:text-[var(--accent)]"
                      >
                        {e.title}
                      </Link>
                      <span className="block text-xs text-[var(--text-muted)]">
                        /{e.slug}
                      </span>
                    </Td>
                    <Td className="whitespace-nowrap text-[var(--text-secondary)]">
                      {formatDateTime(e.startDate)}
                    </Td>
                    <Td className="text-[var(--text-secondary)]">{e.venue}</Td>
                    <Td>
                      <span
                        className={
                          nearFull && upcoming
                            ? "font-medium text-amber-600 dark:text-amber-400"
                            : "text-[var(--text-secondary)]"
                        }
                      >
                        {booked} / {capacity}
                      </span>
                    </Td>
                    <Td className="text-[var(--text-secondary)]">
                      {formatPrice(priceCents, e.currency)}
                    </Td>
                    <Td>
                      <div className="flex flex-wrap gap-1">
                        <Badge tone={e.published ? "success" : "neutral"}>
                          {e.published ? "Live" : "Draft"}
                        </Badge>
                        {!upcoming && <Badge>Past</Badge>}
                        {e.featured && <Badge tone="warn">Featured</Badge>}
                      </div>
                    </Td>
                    <Td>
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`/events/${e.slug}`}
                          target="_blank"
                          aria-label={`Preview ${e.title}`}
                          className="grid h-8 w-8 place-items-center rounded-lg text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-sunken)] hover:text-[var(--accent)]"
                        >
                          <Icon name="external" size={15} />
                        </Link>
                        <Link
                          href={`/admin/events/${e._id}`}
                          aria-label={`Edit ${e.title}`}
                          className="grid h-8 w-8 place-items-center rounded-lg text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-sunken)] hover:text-[var(--accent)]"
                        >
                          <Icon name="pencil" size={15} />
                        </Link>
                        <DeleteButton id={e._id} action={deleteEvent} label={e.title} />
                      </div>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </TableWrap>
        )}
      </Panel>
    </>
  );
}
