import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { randomUUID } from 'crypto';
import { mkdirSync } from 'fs';
import { join } from 'path';
import { Model } from 'mongoose';
import * as QRCode from 'qrcode';
import { Event, EventDocument } from '../events/entities/event.entity';
import { Ticket, TicketDocument } from './entities/ticket.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { ConfirmTicketDto } from './dto/confirm-ticket.dto';
import { ClaimFreeTicketDto } from './dto/claim-free-ticket.dto';
import { RazorpayService } from './razorpay.service';
import { MailService } from '../mail/mail.service';

const TICKETS_UPLOAD_DIR = join(process.cwd(), 'uploads', 'tickets');

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

@Injectable()
export class TicketsService {
  private readonly logger = new Logger(TicketsService.name);

  constructor(
    @InjectModel(Ticket.name) private readonly ticketModel: Model<TicketDocument>,
    @InjectModel(Event.name) private readonly eventModel: Model<EventDocument>,
    private readonly razorpay: RazorpayService,
    private readonly mail: MailService,
  ) {}

  async createOrder(dto: CreateOrderDto) {
    const event = await this.eventModel.findById(dto.eventId).exec();
    if (!event) throw new NotFoundException('Event not found');
    const tier = event.visitorTypes.find((v) => v.id === dto.tierId);
    if (!tier || !tier.isActive) throw new BadRequestException('Ticket tier not found');
    if (tier.maxCount - tier.soldCount < dto.quantity) {
      throw new BadRequestException('Not enough tickets available');
    }

    const amountMinorUnits = Math.round(tier.price * dto.quantity * 100);
    const order = await this.razorpay.createOrder({
      amountMinorUnits,
      currency: event.currency || 'SGD',
      receipt: `evt_${event.id}_${Date.now()}`,
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
      keyId: this.razorpay.publicKeyId,
      eventId: String(event._id),
      tierId: tier.id,
      quantity: dto.quantity,
    };
  }

  /** The client-confirm path — called immediately after Checkout.js resolves. */
  async confirmTicket(dto: ConfirmTicketDto) {
    const valid = this.razorpay.verifyPaymentSignature({
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
    const event = await this.eventModel.findById(dto.eventId).exec();
    if (!event) throw new NotFoundException('Event not found');
    const tier = event.visitorTypes.find((v) => v.id === dto.tierId);
    if (!tier || !tier.isActive) throw new BadRequestException('Ticket tier not found');
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

  private async confirmPurchase(input: ConfirmInput): Promise<TicketDocument> {
    const existing = await this.ticketModel
      .findOne({ 'payment.razorpayOrderId': input.razorpayOrderId })
      .exec();
    if (existing) return existing; // idempotent — client + webhook can both land here

    const event = await this.eventModel.findById(input.eventId).exec();
    if (!event) throw new NotFoundException('Event not found');
    const tier = event.visitorTypes.find((v) => v.id === input.tierId);
    if (!tier || !tier.isActive) throw new BadRequestException('Ticket tier not found');
    if (tier.maxCount - tier.soldCount < input.quantity) {
      throw new BadRequestException('Not enough tickets available');
    }

    const amountMinorUnits = Math.round(tier.price * input.quantity * 100);

    // Atomic, race-safe inventory decrement: only succeeds if the tier still
    // has enough headroom at write time, re-checked inside the same $expr
    // the update runs against (not just the pre-check read above).
    const updatedEvent = await this.eventModel
      .findOneAndUpdate(
        {
          _id: input.eventId,
          $expr: {
            $gt: [
              {
                $size: {
                  $filter: {
                    input: '$visitorTypes',
                    as: 'vt',
                    cond: {
                      $and: [
                        { $eq: ['$$vt.id', input.tierId] },
                        { $eq: ['$$vt.isActive', true] },
                        { $lte: [{ $add: ['$$vt.soldCount', input.quantity] }, '$$vt.maxCount'] },
                      ],
                    },
                  },
                },
              },
              0,
            ],
          },
        },
        { $inc: { 'visitorTypes.$[elem].soldCount': input.quantity } },
        { new: true, arrayFilters: [{ 'elem.id': input.tierId }] },
      )
      .exec();
    if (!updatedEvent) throw new BadRequestException('Not enough tickets available');

    const ticketId = `TKT-${randomUUID().replace(/-/g, '').slice(0, 10).toUpperCase()}`;
    const qrCodeUrl = await this.generateQrCode(ticketId, input.eventId);

    let ticket: TicketDocument;
    try {
      ticket = await this.ticketModel.create({
        ticketId,
        eventId: input.eventId,
        eventTitle: event.title,
        eventDate: event.startDate,
        eventTime: event.time,
        eventVenue: event.venue,
        customerName: input.customerName,
        customerEmail: input.customerEmail,
        customerPhone: input.customerPhone ?? '',
        ticketDetails: [
          { ticketType: tier.name, quantity: input.quantity, price: tier.price, tierId: tier.id, seatIds: [] },
        ],
        totalAmount: amountMinorUnits,
        currency: event.currency,
        status: 'confirmed',
        purchaseDate: new Date(),
        qrCodeUrl,
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
      // past the idempotency check above; the inventory was already
      // decremented once by whichever of them lost this race, so just
      // return the ticket the winner created rather than double-booking.
      if ((err as { code?: number }).code === 11000) {
        const winner = await this.ticketModel
          .findOne({ 'payment.razorpayOrderId': input.razorpayOrderId })
          .exec();
        if (winner) return winner;
      }
      throw err;
    }

    await this.sendConfirmationEmail(ticket);
    return ticket;
  }

  private async generateQrCode(ticketId: string, eventId: string): Promise<string> {
    mkdirSync(TICKETS_UPLOAD_DIR, { recursive: true });
    const filename = `${randomUUID()}.png`;
    const payload = JSON.stringify({
      type: 'singadvisor-ticket',
      ticketId,
      eventId,
      issuedAt: new Date().toISOString(),
    });
    await QRCode.toFile(join(TICKETS_UPLOAD_DIR, filename), payload, { width: 480 });
    return `/uploads/tickets/${filename}`;
  }

  private async sendConfirmationEmail(ticket: TicketDocument): Promise<void> {
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

  async resendEmail(id: string) {
    const ticket = await this.findById(id);
    await this.sendConfirmationEmail(ticket);
    return { sent: true };
  }
}
