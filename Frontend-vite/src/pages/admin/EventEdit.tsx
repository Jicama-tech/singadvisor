import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { PageHeading, AdminEmpty } from "@/components/admin/AdminUI";
import EventsShell from "@/components/admin/EventsShell";
import { EventForm } from "@/components/admin/EventForm";
import { saveEvent } from "@/eventsActions";
import { fetchEventAdmin, EventsServiceError } from "@/lib/events-admin-client";
import type { EventRow } from "@/lib/events-client";
import type { FormState } from "@/lib/form-state";

export default function EventEdit() {
  const { user } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState<EventRow | undefined>(undefined);
  const [loaded, setLoaded] = useState(!id);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    void (async () => {
      try {
        const doc = await fetchEventAdmin(id);
        if (!cancelled) setEvent(doc);
      } catch (err) {
        if (err instanceof EventsServiceError && err.status === 404) {
          if (!cancelled) setNotFound(true);
        }
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (!user) return null;

  const onSubmit = async (fd: FormData): Promise<FormState> => {
    const result = await saveEvent(fd);
    if (result.ok) navigate("/admin/events");
    return result;
  };

  return (
    <EventsShell>
      {/* No gap here — PageHeading already carries its own bottom margin;
          stacking a flex gap on top of that doubled the space between the
          heading and the tabs below it. */}
      <div className="flex flex-col">
        {notFound ? (
          <AdminEmpty title="Event not found" message="That event does not exist or was deleted." />
        ) : (
          <>
            <PageHeading
              title={id ? event?.title ?? "Event" : "New event"}
              description={event?.slug ? `/events/${event.slug}` : "Create a new event."}
            />
            {loaded && <EventForm event={event} action={onSubmit} />}
          </>
        )}
      </div>
    </EventsShell>
  );
}
