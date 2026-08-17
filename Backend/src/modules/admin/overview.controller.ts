import { Controller, Get, UseGuards } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

/**
 * Dashboard overview stats — any signed-in admin (owner OR editor) may
 * read these; unlike AdminController (owner-only account management), this
 * endpoint is the dashboard's own data feed. Counts come from this
 * Backend's content collections; events/tickets/revenue come from the
 * dedicated eventsh instance (server-side, with the API key — never
 * shipped to the browser).
 */
@Controller('admin')
export class OverviewController {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  private async count(collection: string, filter: object = {}): Promise<number> {
    const db = this.connection.db;
    if (!db) return 0;
    return db.collection(collection).countDocuments(filter);
  }

  private eventshConfig() {
    const url = process.env.EVENTSH_BACKEND_URL;
    const organizerId = process.env.EVENTSH_ORGANIZER_ID;
    const apiKey = process.env.EVENTSH_API_KEY;
    if (!url || !organizerId || !apiKey) return null;
    return { url, organizerId, apiKey };
  }

  @Get('overview-stats')
  @UseGuards(JwtAuthGuard)
  async overviewStats() {
    const [
      trainings,
      posts,
      services,
      jobs,
      registrations,
      enquiries,
      contactMessages,
      applications,
      pendingRegistrations,
      newEnquiries,
      receivedApplications,
      unhandledMessages,
    ] = await Promise.all([
      this.count('trainings'),
      this.count('blog-posts'),
      this.count('consultancy-services'),
      this.count('job-postings'),
      this.count('registrations'),
      this.count('consultancy-enquiries'),
      this.count('contact-messages'),
      this.count('job-applications'),
      this.count('registrations', { status: 'pending' }),
      this.count('consultancy-enquiries', { status: 'new' }),
      this.count('job-applications', { status: 'received' }),
      this.count('contact-messages', { handled: false }),
    ]);

    // eventsh side — events/tickets/revenue. Best-effort: the dashboard
    // must never crash because the events instance is briefly unreachable.
    let events = 0;
    let ticketsSold = 0;
    let revenueMinor = 0;
    let revenueCurrency = 'SGD';
    const cfg = this.eventshConfig();
    if (cfg) {
      try {
        const headers = {
          'x-organizer-id': cfg.organizerId,
          'x-api-key': cfg.apiKey,
        };
        const [evRes, tkRes] = await Promise.all([
          fetch(`${cfg.url}/events/organizer/${cfg.organizerId}?publicOnly=false`, { headers }),
          fetch(`${cfg.url}/tickets/organizer/${cfg.organizerId}`, { headers }),
        ]);
        if (evRes.ok) {
          const body = (await evRes.json()) as { data?: unknown[] };
          events = (body.data || []).length;
        }
        if (tkRes.ok) {
          const tickets = (await tkRes.json()) as {
            totalAmount?: number;
            status?: string;
            paymentConfirmed?: boolean;
          }[];
          const paid = tickets.filter(
            (t) => t.paymentConfirmed && (t.status === 'confirmed' || t.status === 'used'),
          );
          ticketsSold = paid.length;
          // eventsh stores totals in MAJOR units — convert to minor here so
          // the frontend formats consistently via its existing helpers.
          revenueMinor = Math.round(paid.reduce((sum, t) => sum + (t.totalAmount || 0), 0) * 100);
        }
      } catch {
        // eventsh unreachable — counts stay 0, the dashboard still renders.
      }
    }

    return {
      trainings,
      events,
      consultancyServices: services,
      posts,
      jobs,
      ticketsSold,
      revenue: revenueMinor,
      revenueCurrency,
      inbox: {
        registrations: pendingRegistrations,
        enquiries: newEnquiries,
        applications: receivedApplications,
        messages: unhandledMessages,
      },
      totals: { registrations, enquiries, applications, contactMessages },
    };
  }
}
