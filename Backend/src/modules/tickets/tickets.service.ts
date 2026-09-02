import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { randomBytes, randomUUID } from 'crypto';
import { join } from 'path';
import { Model, Types } from 'mongoose';
import { Ticket, TicketDocument } from './entities/ticket.entity';
import { CrmService } from '../crm/crm.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { ConfirmTicketDto } from './dto/confirm-ticket.dto';
import { ClaimFreeTicketDto } from './dto/claim-free-ticket.dto';
import { CreatePaynowOrderDto } from './dto/create-paynow-order.dto';
import { ConfirmPaynowDto } from './dto/confirm-paynow.dto';
import { RazorpayService } from './razorpay.service';
import { PaynowService } from '../paynow/paynow.service';
import { MailService } from '../mail/mail.service';

type ConfirmInput = {
  eventId: string;
  tierId: string;
  quantity: number;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature?: string;
  method?: string;
};

/** Loosely-typed shape of what eventsh's GET /events/:id actually returns —
 * only the fields this service reads. See EventshVisitorType/fetchEventshEvent
 * below for why this Backend fetches events from eventsh now instead of its
 * own (no longer authoritative — Events moved to eventsh, see the Frontend's
 * events-client.ts) local `events` collection. */
interface EventshVisitorType {
  id: string;
  name: string;
  price: number;
  maxCount: number;
  soldCount: number;
  isActive: boolean;
}
interface EventshEvent {
  _id: string;
  title: string;
  location?: string;
  startDate: string;
  time?: string;
  currency?: string;
  image?: string;
  visitorTypes?: EventshVisitorType[];
  organizer?: { organizationName?: string; name?: string };
}

@Injectable()
export class TicketsService {
  private readonly logger = new Logger(TicketsService.name);

  constructor(
    @InjectModel(Ticket.name) private readonly ticketModel: Model<TicketDocument>,
    private readonly razorpay: RazorpayService,
    private readonly paynow: PaynowService,
    private readonly mail: MailService,
    private readonly crmService: CrmService,
  ) {}

  private eventshUrl(): string {
    const url = process.env.EVENTSH_BACKEND_URL;
    if (!url) {
      throw new ServiceUnavailableException(
        'EVENTSH_BACKEND_URL is not set in Backend/.env',
      );
    }
    return url;
  }

  private eventshOrganizerId(): string {
    const id = process.env.EVENTSH_ORGANIZER_ID;
    if (!id) {
      throw new ServiceUnavailableException(
        'EVENTSH_ORGANIZER_ID is not set in Backend/.env',
      );
    }
    return id;
  }

  /** Events now live on eventsh (see Frontend's events-client.ts) — this
   * app's own `events` collection is no longer kept in sync, so ticket
   * purchase (order creation and the final confirm/free-claim) must read
   * live tier price/capacity from eventsh, not the local copy. Public,
   * unauthenticated read — matches how eventsh's own GET /events/:id
   * already works, no API key needed. */
  private async fetchEventshEvent(eventId: string): Promise<EventshEvent> {
    let response: Response;
    try {
      response = await fetch(`${this.eventshUrl()}/events/${eventId}`, {
        cache: 'no-store',
      });
    } catch (cause) {
      throw new ServiceUnavailableException('eventsh is unreachable', { cause });
    }
    if (!response.ok) throw new NotFoundException('Event not found');
    const body = (await response.json()) as { data?: EventshEvent } | EventshEvent;
    const event = (body as { data?: EventshEvent }).data ?? (body as EventshEvent);
    if (!event?._id) throw new NotFoundException('Event not found');
    return event;
  }

  private async fetchEventshTier(
    eventId: string,
    tierId: string,
  ): Promise<{ event: EventshEvent; tier: EventshVisitorType }> {
    const event = await this.fetchEventshEvent(eventId);
    const tier = (event.visitorTypes || []).find((v) => v.id === tierId);
    if (!tier || !tier.isActive) throw new BadRequestException('Ticket tier not found');
    return { event, tier };
  }

  async createOrder(dto: CreateOrderDto) {
    const { event, tier } = await this.fetchEventshTier(dto.eventId, dto.tierId);
    // Best-effort, not atomic — eventsh computes soldCount live from real
    // tickets rather than exposing an atomic "reserve N" primitive the way
    // this app's own (now-unused) local Event model did. Two buyers racing
    // for the last remaining unit could both pass this check; the accepted
    // trade-off for eventsh becoming the record store, not a regression
    // introduced here — eventsh's own native ticket-purchase flow has no
    // server-side capacity enforcement at all today.
    if (tier.maxCount - tier.soldCount < dto.quantity) {
      throw new BadRequestException('Not enough tickets available');
    }

    const amountMinorUnits = Math.round(tier.price * dto.quantity * 100);
    const order = await this.razorpay.createOrder({
      amountMinorUnits,
      currency: event.currency || 'SGD',
      receipt: `evt_${event._id}_${Date.now()}`,
      notes: {
        eventId: String(event._id),
        tierId: tier.id,
        quantity: String(dto.quantity),
        customerName: dto.customerName,
        customerEmail: dto.customerEmail,
        customerPhone: dto.customerPhone ?? '',
      },
    });

    return {
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: await this.razorpay.publicKeyId(),
      eventId: String(event._id),
      tierId: tier.id,
      quantity: dto.quantity,
    };
  }

  /** The client-confirm path — called immediately after Checkout.js resolves. */
  async confirmTicket(dto: ConfirmTicketDto) {
    const valid = await this.razorpay.verifyPaymentSignature({
      orderId: dto.razorpay_order_id,
      paymentId: dto.razorpay_payment_id,
      signature: dto.razorpay_signature,
    });
    if (!valid) throw new BadRequestException('Payment verification failed');

    return this.confirmPurchase({
      eventId: dto.eventId,
      tierId: dto.tierId,
      quantity: dto.quantity,
      customerName: dto.customerName,
      customerEmail: dto.customerEmail,
      customerPhone: dto.customerPhone,
      razorpayOrderId: dto.razorpay_order_id,
      razorpayPaymentId: dto.razorpay_payment_id,
      razorpaySignature: dto.razorpay_signature,
    });
  }

  /** Free tiers (price 0) skip Razorpay entirely — most payment gateways,
   * Razorpay included, reject a zero-amount order outright, and there is
   * nothing to verify for a $0 charge anyway. Re-checks the tier is
   * genuinely free server-side rather than trusting the client's route
   * choice — a paid tier can never be claimed through this path. */
  async claimFreeTicket(dto: ClaimFreeTicketDto) {
    const { tier } = await this.fetchEventshTier(dto.eventId, dto.tierId);
    if (tier.price > 0) throw new BadRequestException('This tier requires payment');

    return this.confirmPurchase({
      eventId: dto.eventId,
      tierId: dto.tierId,
      quantity: dto.quantity,
      customerName: dto.customerName,
      customerEmail: dto.customerEmail,
      customerPhone: dto.customerPhone,
      razorpayOrderId: `free-${randomUUID()}`,
      razorpayPaymentId: 'free',
      method: 'free',
    });
  }

  /** Step 1 of PayNow checkout — server-generated dynamic QR (amount
   * embedded, non-editable) to the Settings-configured UEN, with a
   * short 12-char reference the admin cross-checks the bank transfer
   * against. Writes the audit doc in 'pending' state; the buyer confirms
   * via confirmPaynow below (trust model — same as eventsh's own flow). */
  async createPaynowOrder(dto: CreatePaynowOrderDto) {
    const { event, tier } = await this.fetchEventshTier(dto.eventId, dto.tierId);
    if (tier.maxCount - tier.soldCount < dto.quantity) {
      throw new BadRequestException('Not enough tickets available');
    }
    if (tier.price <= 0) {
      throw new BadRequestException('This tier is free — no payment needed');
    }

    const amountMinorUnits = Math.round(tier.price * dto.quantity * 100);
    const paynowRef = randomBytes(6).toString('hex').toUpperCase(); // 12 chars — fits TLV62's 25-char cap and is easy to read off a bank statement
    const currency = event.currency || 'SGD';
    const amountMajor = amountMinorUnits / 100;

    const { qr } = await this.paynow.generateQr(amountMajor, paynowRef, currency);

    const audit = await this.ticketModel.create({
      ticketId: `TKT-PN-${randomUUID().replace(/-/g, '').slice(0, 10).toUpperCase()}`,
      eventId: dto.eventId,
      eventTitle: event.title,
      eventDate: event.startDate,
      eventTime: event.time || '',
      eventVenue: event.location || '',
      customerName: dto.customerName,
      customerEmail: dto.customerEmail,
      customerPhone: dto.customerPhone ?? '',
      ticketDetails: [
        { ticketType: tier.name, quantity: dto.quantity, price: tier.price, tierId: tier.id, seatIds: [] },
      ],
      totalAmount: amountMinorUnits,
      currency,
      status: 'pending',
      purchaseDate: new Date(),
      qrCodeUrl: '',
      paynowRef,
      payment: {
        razorpayOrderId: `paynow-${paynowRef}`,
        razorpayPaymentId: '',
        amount: amountMinorUnits,
        method: 'paynow',
      },
    });

    return {
      orderId: String(audit._id),
      paynowRef,
      amount: amountMinorUnits,
      amountMajor,
      currency,
      qrDataUrl: qr,
      eventId: String(event._id),
      tierId: tier.id,
      quantity: dto.quantity,
    };
  }

  /** Step 2 — the buyer asserts "I have paid". Creates the real ticket in
   * eventsh (paymentConfirmed: true — eventsh's trust model, no PayNow
   * callback exists anywhere), then flips the audit doc to confirmed.
   * Idempotent: a repeat call for the same order returns the already-issued
   * ticket. */
  async confirmPaynow(dto: ConfirmPaynowDto) {
    const audit = await this.ticketModel
      .findById(dto.orderId)
      .where('payment.method', 'paynow')
      .exec();
    if (!audit) throw new NotFoundException('PayNow order not found');
    if (audit.payment.verifiedAt) return audit; // already confirmed — idempotent

    const { event, tier } = await this.fetchEventshTier(String(audit.eventId), audit.ticketDetails[0]?.tierId || '');
    if (tier.maxCount - tier.soldCount < audit.ticketDetails[0]?.quantity) {
      throw new BadRequestException('Not enough tickets available');
    }

    // The real ticket lives in eventsh — same creation path the Razorpay
    // confirm uses, so the payload/error handling never drift.
    const created = await this.createEventshTicket(
      {
        eventId: String(audit.eventId),
        tierId: tier.id,
        quantity: audit.ticketDetails[0]?.quantity ?? 1,
        customerName: audit.customerName,
        customerEmail: audit.customerEmail,
        customerPhone: audit.customerPhone,
        razorpayOrderId: `paynow-${audit.paynowRef}`,
        razorpayPaymentId: 'paynow',
        method: 'paynow',
      },
      audit.ticketId,
      event,
      tier,
    );

    audit.status = 'confirmed';
    audit.payment.verifiedAt = new Date();
    audit.payment.razorpayPaymentId = 'paynow';
    audit.eventshTicketId = String(created.ticketId || '');
    await audit.save();
    return audit;
  }

  /** The async fallback path — called from the Razorpay webhook, reconstructs
   * the purchase from the order's `notes` since the client may never have
   * called back (e.g. browser closed right after paying). */
  async confirmFromWebhook(orderId: string, paymentId: string, notes: Record<string, string>) {
    if (!notes.eventId || !notes.tierId || !notes.quantity) {
      this.logger.warn(`Webhook for order ${orderId} is missing expected notes — skipping`);
      return null;
    }
    return this.confirmPurchase({
      eventId: notes.eventId,
      tierId: notes.tierId,
      quantity: Number(notes.quantity),
      customerName: notes.customerName || 'Unknown',
      customerEmail: notes.customerEmail || '',
      customerPhone: notes.customerPhone,
      razorpayOrderId: orderId,
      razorpayPaymentId: paymentId,
    });
  }

  /** Splits a single "First Last" name field into eventsh's required
   * firstName/lastName pair — this app's own buyer form only ever collected
   * one combined name field. Best-effort: everything after the first space
   * becomes the last name; a single-word name repeats as both (eventsh
   * requires both non-empty). */
  private splitName(fullName: string): { firstName: string; lastName: string } {
    const trimmed = (fullName || '').trim();
    const spaceIdx = trimmed.indexOf(' ');
    if (spaceIdx === -1) return { firstName: trimmed || 'Guest', lastName: trimmed || 'Guest' };
    return { firstName: trimmed.slice(0, spaceIdx), lastName: trimmed.slice(spaceIdx + 1) };
  }

  /** Creates the ticket in eventsh — the actual system of record now (QR
   * code, confirmation email/WhatsApp, admin views, door-scanning all
   * happen there, automatically, as part of this call). Public,
   * unauthenticated — matches eventsh's own buyer-purchase trust model;
   * this Backend calls it the same way a buyer's browser would, the only
   * difference being it only ever does so after Razorpay's signature has
   * already been independently verified above. */
  private async createEventshTicket(
    input: ConfirmInput,
    ticketId: string,
    event: EventshEvent,
    tier: EventshVisitorType,
  ): Promise<{ ticketId: string; qrCode?: string }> {
    const { firstName, lastName } = this.splitName(input.customerName);
    const body = {
      ticketId,
      eventId: input.eventId,
      organizerId: this.eventshOrganizerId(),
      tickets: [
        { type: tier.name, quantity: input.quantity, price: tier.price, tierId: tier.id },
      ],
      customerDetails: {
        firstName,
        lastName,
        email: input.customerEmail,
        // eventsh requires whatsapp (non-empty check is NOT enforced
        // server-side, only @IsString) — this app's buyer form only
        // collects an optional phone number, so an empty string is the
        // honest value when the buyer didn't give one.
        whatsapp: input.customerPhone || '',
      },
      total: tier.price * input.quantity, // major units — eventsh's own convention, NOT Razorpay's minor-unit amount
      paymentConfirmed: true, // Razorpay signature already verified above (or this is the free-tier path)
      purchaseDate: new Date().toISOString(),
      eventInfo: {
        id: String(event._id),
        title: event.title,
        organizationName: event.organizer?.organizationName || event.organizer?.name || 'SingAdvisor',
        venue: event.location || '',
        date: event.startDate,
        time: event.time || '',
        image: event.image || '',
        organizerId: this.eventshOrganizerId(),
      },
    };

    let response: Response;
    try {
      response = await fetch(`${this.eventshUrl()}/tickets/create-ticket`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    } catch (cause) {
      throw new ServiceUnavailableException('eventsh is unreachable', { cause });
    }
    if (!response.ok) {
      const errBody = await response.json().catch(() => null);
      const message =
        errBody && typeof errBody === 'object' && 'message' in errBody
          ? String((errBody as { message: unknown }).message)
          : `eventsh rejected the ticket (${response.status})`;
      throw new BadRequestException(message);
    }
    return (await response.json()) as { ticketId: string; qrCode?: string };
  }

  private async confirmPurchase(input: ConfirmInput): Promise<TicketDocument> {
    const existing = await this.ticketModel
      .findOne({ 'payment.razorpayOrderId': input.razorpayOrderId })
      .exec();
    if (existing) return existing; // idempotent — client + webhook can both land here

    const { event, tier } = await this.fetchEventshTier(input.eventId, input.tierId);
    // Best-effort, not atomic — see the matching comment in createOrder()
    // for why (eventsh has no atomic "reserve N" primitive to check against
    // here the way this app's own local Event model used to).
    if (tier.maxCount - tier.soldCount < input.quantity) {
      throw new BadRequestException('Not enough tickets available');
    }

    const amountMinorUnits = Math.round(tier.price * input.quantity * 100);
    const ticketId = `TKT-${randomUUID().replace(/-/g, '').slice(0, 10).toUpperCase()}`;

    // Create in eventsh FIRST — it's the actual system of record now (and
    // sends the confirmation email/WhatsApp itself). Only once that
    // succeeds do we write the local audit/idempotency record below, so a
    // failed eventsh call never leaves an orphaned local "confirmed" ticket
    // with no real ticket behind it.
    await this.createEventshTicket(input, ticketId, event, tier);

    let ticket: TicketDocument;
    try {
      // Kept locally as this app's own payment audit trail and the
      // idempotency guard above (payment.razorpayOrderId is uniquely
      // indexed) — eventsh has no razorpayOrderId concept to check against,
      // so there's nowhere else this race-guard could live. Not shown to
      // buyers or organizers directly anymore; eventsh is what the admin
      // UI and door-scanning actually read from now.
      ticket = await this.ticketModel.create({
        ticketId,
        eventId: input.eventId,
        eventTitle: event.title,
        eventDate: event.startDate,
        eventTime: event.time || '',
        eventVenue: event.location || '',
        customerName: input.customerName,
        customerEmail: input.customerEmail,
        customerPhone: input.customerPhone ?? '',
        ticketDetails: [
          { ticketType: tier.name, quantity: input.quantity, price: tier.price, tierId: tier.id, seatIds: [] },
        ],
        totalAmount: amountMinorUnits,
        currency: event.currency || 'SGD',
        status: 'confirmed',
        purchaseDate: new Date(),
        qrCodeUrl: '', // the real QR lives in eventsh now (email/WhatsApp/admin) — nothing local to link to
        payment: {
          razorpayOrderId: input.razorpayOrderId,
          razorpayPaymentId: input.razorpayPaymentId,
          razorpaySignature: input.razorpaySignature,
          verifiedAt: new Date(),
          amount: amountMinorUnits,
          method: input.method ?? 'razorpay',
        },
      });
    } catch (err) {
      // Duplicate razorpayOrderId — the client call and the webhook raced
      // past the idempotency check above. The eventsh ticket was already
      // created once by whichever of them lost this race (createEventshTicket
      // uses this same generated ticketId, deterministic per call — but two
      // racing calls generate DIFFERENT ticketIds, so this can create two
      // eventsh tickets for one payment in the rare double-race case; that
      // tracks eventsh's own lack of an idempotency key on create-ticket,
      // not something this Backend can close on its own). Return the local
      // record either way rather than surfacing an error for a payment that
      // did succeed.
      if ((err as { code?: number }).code === 11000) {
        const winner = await this.ticketModel
          .findOne({ 'payment.razorpayOrderId': input.razorpayOrderId })
          .exec();
        if (winner) return winner;
      }
      throw err;
    }

    // Never let a CRM hiccup affect a payment that already succeeded. Placed
    // after the local audit record so it only runs on the one call that
    // actually created the ticket — the idempotency guard at the top of this
    // method returns early for the client/webhook race, so a single purchase
    // never lands in the timeline twice.
    this.crmService
      .upsertContact({
        email: ticket.customerEmail,
        name: ticket.customerName,
        phone: ticket.customerPhone || undefined,
        source: {
          type: 'ticket',
          refId: ticket._id,
          label: `Bought a ticket for ${ticket.eventTitle}`,
        },
      })
      .catch((err: unknown) =>
        this.logger.warn(`CRM upsert failed for ticket: ${(err as Error)?.message}`),
      );

    return ticket;
  }

  async findById(id: string) {
    const doc = await this.ticketModel.findById(id).exec();
    if (!doc) throw new NotFoundException(`No ticket with id "${id}"`);
    return doc;
  }

  async findByTicketId(ticketId: string) {
    const doc = await this.ticketModel.findOne({ ticketId }).exec();
    if (!doc) throw new NotFoundException(`No ticket with id "${ticketId}"`);
    return doc;
  }

  findAllForAdmin(eventId?: string) {
    return this.ticketModel
      .find(eventId ? { eventId } : {})
      .sort({ purchaseDate: -1 })
      .exec();
  }

  async setStatus(id: string, status: 'pending' | 'confirmed' | 'cancelled' | 'used') {
    const update: Partial<Ticket> = { status };
    if (status === 'used') {
      update.isUsed = true;
      update.usedAt = new Date();
    }
    const doc = await this.ticketModel.findByIdAndUpdate(id, update, { new: true }).exec();
    if (!doc) throw new NotFoundException(`No ticket with id "${id}"`);
    return doc;
  }

  /** Legacy path — only meaningful for tickets created before the eventsh
   * cutover (real local qrCodeUrl on disk). New tickets are created in
   * eventsh directly (see createEventshTicket) and have qrCodeUrl: '' —
   * for those, resend-email is eventsh's own admin action now
   * (POST /tickets/:id/resend-email on eventsh, via the Frontend's
   * events-admin-client.ts, not this route), matching how ticket admin
   * reads/actions moved off this Backend the same way Events' did. */
  async resendEmail(id: string) {
    const ticket = await this.findById(id);
    if (!ticket.qrCodeUrl) {
      throw new BadRequestException(
        'This ticket lives in eventsh now — resend its email from there, not this Backend.',
      );
    }
    const qrAbsolutePath = join(process.cwd(), ticket.qrCodeUrl.replace(/^\//, ''));
    const sent = await this.mail.sendBestEffort({
      to: ticket.customerEmail,
      subject: `Your ticket for ${ticket.eventTitle}`,
      html: `
        <p>Hi ${ticket.customerName},</p>
        <p>Your ticket for <strong>${ticket.eventTitle}</strong> is confirmed.</p>
        <p><strong>Ticket ID:</strong> ${ticket.ticketId}</p>
        <p>Show the attached QR code at the door.</p>
      `,
      attachments: [{ filename: 'ticket-qr.png', path: qrAbsolutePath }],
    });
    if (!sent) {
      this.logger.warn(`Confirmation email not sent for ticket ${ticket.ticketId} — see prior warning for why`);
    }
    return { sent };
  }
}
