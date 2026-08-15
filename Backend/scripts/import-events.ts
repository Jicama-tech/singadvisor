/**
 * One-off import of `Frontend/prisma/export-events.ts`'s JSON dump into the
 * new Mongo `events`/`tickets` collections. Second half of the event-ops
 * port's data migration (see the plan's "Data migration" section).
 *
 * - `slug` is preserved verbatim for URL/SEO continuity.
 * - Each Prisma `Event` gets one synthetic `visitorTypes[0]` tier
 *   ("General Admission") carrying its old price/capacity — `soldCount` is
 *   the sum of non-cancelled registrations' `seats`, matching exactly how
 *   the old public event page computed "remaining seats"
 *   (`status:{not:"cancelled"}`).
 * - Each `Registration` row (regardless of status) becomes a `Ticket` with
 *   a `payment` sentinel (`method:"legacy-migrated"`) rather than a
 *   fabricated Razorpay record — no gateway was ever involved historically,
 *   and this keeps that honest instead of pretending otherwise. A synthetic
 *   `legacy-<registrationId>` value fills `razorpayOrderId` purely to
 *   satisfy the schema's required+unique constraint; it is not a real order.
 *
 * Safe to re-run: upserts by `slug` (events) and by the same synthetic
 * `payment.razorpayOrderId` (tickets), never duplicates.
 *
 *   npm run import:events -- ../Frontend/events-export.json
 */
import 'dotenv/config';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import mongoose from 'mongoose';
import { EventSchema } from '../src/modules/events/entities/event.entity';
import { TicketSchema } from '../src/modules/tickets/entities/ticket.entity';

type LegacyRegistration = {
  id: string;
  name: string;
  email: string;
  phone: string;
  seats: number;
  status: string;
  createdAt: string;
};

type LegacyEvent = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  description: string;
  image: string;
  venue: string;
  address: string;
  startsAt: string;
  endsAt: string;
  capacity: number;
  speakers: string; // JSON-encoded string[]
  agenda: string; // JSON-encoded {time,title}[]
  priceCents: number;
  currency: string;
  published: boolean;
  featured: boolean;
  registrations: LegacyRegistration[];
};

function parseJsonArray(raw: string): unknown[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function main() {
  const inPath = resolve(process.argv[2] || '../Frontend/events-export.json');
  const legacyEvents: LegacyEvent[] = JSON.parse(readFileSync(inPath, 'utf-8'));

  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/singadvisor');
  const EventModel = mongoose.model('Event', EventSchema);
  const TicketModel = mongoose.model('Ticket', TicketSchema);

  let eventsUpserted = 0;
  let ticketsUpserted = 0;

  for (const legacy of legacyEvents) {
    const activeSeats = legacy.registrations
      .filter((r) => r.status !== 'cancelled')
      .reduce((sum, r) => sum + r.seats, 0);

    const tierId = 'general';
    const event = await EventModel.findOneAndUpdate(
      { slug: legacy.slug },
      {
        slug: legacy.slug,
        title: legacy.title,
        summary: legacy.summary,
        description: legacy.description,
        image: legacy.image,
        venue: legacy.venue,
        address: legacy.address,
        startDate: new Date(legacy.startsAt),
        endDate: new Date(legacy.endsAt),
        speakers: parseJsonArray(legacy.speakers) as string[],
        agenda: parseJsonArray(legacy.agenda) as { time: string; title: string }[],
        currency: legacy.currency || 'SGD',
        status: legacy.published ? 'published' : 'draft',
        published: legacy.published,
        featured: legacy.featured,
        visitorTypes: [
          {
            id: tierId,
            name: 'General Admission',
            price: legacy.priceCents / 100,
            maxCount: legacy.capacity,
            soldCount: activeSeats,
            featureAccess: [],
            isActive: true,
          },
        ],
      },
      { upsert: true, new: true },
    ).exec();
    eventsUpserted++;

    for (const reg of legacy.registrations) {
      const razorpayOrderId = `legacy-${reg.id}`;
      await TicketModel.findOneAndUpdate(
        { 'payment.razorpayOrderId': razorpayOrderId },
        {
          ticketId: `TKT-LEGACY-${reg.id.slice(0, 10).toUpperCase()}`,
          eventId: event._id,
          eventTitle: legacy.title,
          eventDate: new Date(legacy.startsAt),
          eventTime: '',
          eventVenue: legacy.venue,
          customerName: reg.name,
          customerEmail: reg.email.toLowerCase(),
          customerPhone: reg.phone,
          ticketDetails: [
            {
              ticketType: 'General Admission',
              quantity: reg.seats,
              price: legacy.priceCents / 100,
              tierId,
              seatIds: [],
            },
          ],
          totalAmount: Math.round((legacy.priceCents / 100) * reg.seats * 100),
          currency: legacy.currency || 'SGD',
          status: reg.status === 'cancelled' ? 'cancelled' : 'confirmed',
          purchaseDate: new Date(reg.createdAt),
          payment: {
            razorpayOrderId,
            amount: Math.round((legacy.priceCents / 100) * reg.seats * 100),
            method: 'legacy-migrated',
            verifiedAt: new Date(reg.createdAt),
          },
        },
        { upsert: true, new: true },
      ).exec();
      ticketsUpserted++;
    }
  }

  await mongoose.disconnect();
  console.log(`Imported ${eventsUpserted} events and ${ticketsUpserted} tickets from ${inPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
