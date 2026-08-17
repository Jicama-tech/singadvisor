import { notFound } from "next/navigation";
import { PageHeading } from "@/components/admin/AdminUI";
import { EventForm } from "@/components/admin/EventForm";
import { EventsServiceError, fetchEventAdmin } from "@/lib/events-admin-client";

export const metadata = { title: "Edit event" };

export default async function EditEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let event;
  try {
    event = await fetchEventAdmin(id);
  } catch (err) {
    if (err instanceof EventsServiceError && err.status === 404) notFound();
    throw err;
  }

  return (
    <>
      <PageHeading title={event.title} description={`/events/${event.slug}`} />
      <EventForm event={event} />
    </>
  );
}
