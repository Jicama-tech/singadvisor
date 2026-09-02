/**
 * Booking a scheduled space (a court, studio or other facility sold by the
 * time slot) on the public event page.
 *
 * Everything here forwards to eventsh through the Backend's unguarded
 * /eventsh-public proxy, the same route the public event reads go through.
 * eventsh owns the booking record, the slot-availability tokens and the
 * organizer's status workflow — the events themselves already live there, so
 * a second local store would immediately disagree with the first.
 *
 * Unauthenticated on purpose: someone booking a badminton court has no
 * account. See the Backend controller for what that does and does not allow.
 *
 * Never throws for a read — a page that cannot reach the API should render
 * the spaces without booking rather than break, same rule as events-client.
 */

const PROXY = `${__API_URL__}/eventsh-public`;

export type BookableSlot = {
  id: string;
  label: string;
  date: string;
  startTime: string;
  endTime: string;
  /** Set by eventsh from the event's own booked-slot tokens. */
  isBooked?: boolean;
};

/** A placed space as the availability endpoint returns it — the slots here
 * carry `isBooked`, which the event document's own copy does not. */
export type BookableSpace = {
  positionId: string;
  templateId: string;
  id: string;
  name: string;
  facilityType: string;
  price: number;
  color: string;
  slots: BookableSlot[];
};

export type SelectedSlot = { positionId: string; templateId: string; slotId: string };

export type BookingDetails = {
  name: string;
  email: string;
  phone?: string;
  organization?: string;
  purpose?: string;
};

/** Turns a failed response into the message eventsh actually sent, so the
 * page can show "you already have a request for this event" rather than a
 * generic failure. */
async function messageFrom(res: Response, fallback: string): Promise<string> {
  const body = (await res.json().catch(() => null)) as { message?: string | string[] } | null;
  const m = body?.message;
  return (Array.isArray(m) ? m.join(" ") : m) || fallback;
}

export async function fetchBookableSpaces(eventId: string): Promise<BookableSpace[]> {
  try {
    const res = await fetch(`${PROXY}/scheduled-spaces/available/${eventId}`);
    if (!res.ok) return [];
    const body = (await res.json()) as { data?: { spaces?: BookableSpace[] } };
    return body?.data?.spaces ?? [];
  } catch {
    return [];
  }
}

export type QuotedSlot = {
  positionId: string;
  templateId: string;
  slotId: string;
  spaceName: string;
  label: string;
  date: string;
  startTime: string;
  endTime: string;
  price: number;
};

export type Quote = {
  reference: string;
  amount: number;
  currency: string;
  slots: QuotedSlot[];
  /** null when the selection costs nothing — a free slot skips payment and
   * goes straight to confirm. */
  payment: { qr: string; payeeId: string; payeeName: string } | null;
};

/**
 * Step 1 — price the selection and get a PayNow QR to pay against.
 *
 * The price is resolved server-side from the event, not sent from here, so
 * what appears in the QR cannot be altered by the browser. Slots already taken
 * are rejected now rather than after someone has paid.
 */
export async function quoteBooking(
  eventId: string,
  details: BookingDetails,
  slots: SelectedSlot[],
): Promise<Quote> {
  const res = await fetch(`${__API_URL__}/space-bookings/quote`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      eventId,
      slots,
      name: details.name,
      email: details.email,
      ...(details.phone ? { phone: details.phone } : {}),
      ...(details.organization ? { organization: details.organization } : {}),
    }),
  });
  if (!res.ok) throw new Error(await messageFrom(res, "Could not price those slots."));
  return (await res.json()) as Quote;
}

/** Step 2 — after paying, hold the slots and record the payer in the CRM. */
export async function confirmBooking(
  reference: string,
  transactionId?: string,
): Promise<{ reference: string; status: string; amount: number }> {
  const res = await fetch(`${__API_URL__}/space-bookings/confirm`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reference, ...(transactionId ? { transactionId } : {}) }),
  });
  if (!res.ok) throw new Error(await messageFrom(res, "Could not confirm the booking."));
  return (await res.json()) as { reference: string; status: string; amount: number };
}
