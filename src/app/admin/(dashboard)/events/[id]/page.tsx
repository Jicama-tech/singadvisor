import { notFound } from "next/navigation";
import { PageHeading } from "@/components/admin/AdminUI";
import { EventForm } from "@/components/admin/EventForm";
import { db } from "@/lib/db";

export const metadata = { title: "Edit event" };

export default async function EditEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const event = await db.event.findUnique({ where: { id } });
  if (!event) notFound();

  return (
    <>
      <PageHeading title={event.title} description={`/events/${event.slug}`} />
      <EventForm event={event} />
    </>
  );
}
