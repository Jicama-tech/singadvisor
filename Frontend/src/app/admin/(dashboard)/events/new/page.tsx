import { PageHeading } from "@/components/admin/AdminUI";
import { EventForm } from "@/components/admin/EventForm";

export const metadata = { title: "New event" };

export default function NewEventPage() {
  return (
    <>
      <PageHeading
        title="New event"
        description="Times are entered and displayed in Singapore time."
      />
      <EventForm />
    </>
  );
}
