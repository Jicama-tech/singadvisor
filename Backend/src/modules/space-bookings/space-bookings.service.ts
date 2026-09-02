import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { randomBytes } from 'crypto';
import { SpaceBooking, SpaceBookingDocument } from './entities/space-booking.entity';
import { PaynowService } from '../paynow/paynow.service';
import { SettingsService } from '../settings/settings.service';
import { CrmService } from '../crm/crm.service';
import { QuoteSpaceBookingDto } from './dto/quote-space-booking.dto';
import { ConfirmSpaceBookingDto } from './dto/confirm-space-booking.dto';

/** One placed space as eventsh's availability endpoint returns it. Only the
 * fields this service reads are listed — external wire data, read defensively. */
interface EventshSpace {
  positionId: string;
  templateId: string;
  name?: string;
  price?: number;
  slots?: {
    id: string;
    label?: string;
    date?: string;
    startTime?: string;
    endTime?: string;
    isBooked?: boolean;
  }[];
}

@Injectable()
export class SpaceBookingsService {
  private readonly logger = new Logger(SpaceBookingsService.name);

  constructor(
    @InjectModel(SpaceBooking.name)
    private readonly model: Model<SpaceBookingDocument>,
    private readonly paynow: PaynowService,
    private readonly settings: SettingsService,
    private readonly crmService: CrmService,
  ) {}

  private eventshUrl(): string {
    const url = process.env.EVENTSH_BACKEND_URL;
    if (!url) throw new ServiceUnavailableException('EVENTSH_BACKEND_URL is not set.');
    return url;
  }

  private organizerId(): string {
    const id = process.env.EVENTSH_ORGANIZER_ID;
    if (!id) throw new ServiceUnavailableException('EVENTSH_ORGANIZER_ID is not set.');
    return id;
  }

  private async eventsh<T>(path: string, init?: RequestInit): Promise<T> {
    let res: Response;
    try {
      res = await fetch(`${this.eventshUrl()}${path}`, init);
    } catch (cause) {
      throw new ServiceUnavailableException('eventsh is unreachable', { cause });
    }
    const body = (await res.json().catch(() => null)) as
      | (T & { message?: string | string[] })
      | null;
    if (!res.ok) {
      const m = body?.message;
      throw new BadRequestException(
        (Array.isArray(m) ? m.join(' ') : m) || `eventsh returned ${res.status}`,
      );
    }
    return body as T;
  }

  /**
   * Prices a selection and, when it costs something, hands back a PayNow QR to
   * pay against.
   *
   * Every slot is re-resolved against eventsh's own availability: the price
   * comes from the event, not the request, and a slot someone else has already
   * taken is rejected here rather than after the person has paid. That check
   * is a snapshot, not a lock — eventsh has no hold primitive, so a genuine
   * race can still lose at confirm time, which is why confirm re-checks too.
   */
  async quote(dto: QuoteSpaceBookingDto) {
    if (!dto.slots?.length) throw new BadRequestException('Select at least one slot.');

    const available = await this.eventsh<{ data?: { spaces?: EventshSpace[] } }>(
      `/scheduled-spaces/available/${dto.eventId}`,
    );
    const spaces = available?.data?.spaces ?? [];

    const resolved = dto.slots.map((sel) => {
      const space = spaces.find((s) => s.positionId === sel.positionId);
      if (!space) throw new BadRequestException('That space is no longer on this event.');
      const slot = (space.slots ?? []).find((s) => s.id === sel.slotId);
      if (!slot) throw new BadRequestException(`That slot is no longer on "${space.name}".`);
      if (slot.isBooked) {
        throw new BadRequestException(
          `${space.name} ${slot.startTime}–${slot.endTime} has just been taken. Pick another.`,
        );
      }
      return {
        positionId: space.positionId,
        templateId: space.templateId,
        slotId: slot.id,
        spaceName: space.name ?? '',
        label: slot.label ?? '',
        date: slot.date ?? '',
        startTime: slot.startTime ?? '',
        endTime: slot.endTime ?? '',
        price: Number(space.price) || 0,
      };
    });

    const amount = resolved.reduce((sum, s) => sum + s.price, 0);
    // 12 chars: fits PayNow's 25-char reference field and is short enough to
    // read off a bank statement, same format the ticket flow uses.
    const reference = randomBytes(6).toString('hex').toUpperCase();

    const booking = await this.model.create({
      reference,
      eventId: dto.eventId,
      slots: resolved,
      amount,
      currency: 'SGD',
      name: dto.name,
      email: dto.email.toLowerCase().trim(),
      phone: dto.phone ?? '',
      organization: dto.organization ?? '',
      status: 'pending',
    });

    // Free slots have nothing to pay, so no QR is generated and the caller
    // goes straight to confirm.
    if (amount <= 0) {
      return { reference, amount, currency: booking.currency, slots: resolved, payment: null };
    }

    const settings = await this.settings.getPublicPayload();
    if (!settings.paynowEnabled) {
      throw new BadRequestException(
        'These spaces cost money but PayNow is not configured — set the company UEN and name in Settings.',
      );
    }

    const { qr, payeeId, payeeName } = await this.paynow.generateQr(
      amount,
      reference,
      booking.currency,
    );
    return {
      reference,
      amount,
      currency: booking.currency,
      slots: resolved,
      payment: { qr, payeeId, payeeName },
    };
  }

  /**
   * Takes the booking after payment: holds the slots in eventsh, records the
   * payment reference, and puts the person in the CRM.
   *
   * PayNow gives no machine-verifiable receipt, so this trusts the payer's
   * "I've paid" the same way the ticket PayNow flow does — the organizer
   * reconciles against the bank statement using the reference. Idempotent: a
   * double-submit returns the existing confirmation rather than booking twice.
   */
  async confirm(dto: ConfirmSpaceBookingDto) {
    const booking = await this.model.findOne({ reference: dto.reference }).exec();
    if (!booking) throw new NotFoundException('No booking with that reference.');
    if (booking.status === 'confirmed') {
      return this.present(booking);
    }

    const registered = await this.eventsh<{ data?: { _id?: string } }>(
      '/scheduled-spaces/register',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: booking.eventId,
          organizerId: this.organizerId(),
          name: booking.name,
          email: booking.email,
          phone: booking.phone,
          organization: booking.organization,
        }),
      },
    );
    const requestId = registered?.data?._id;
    if (!requestId) throw new BadRequestException('eventsh did not return a booking reference.');

    await this.eventsh(`/scheduled-spaces/${requestId}/select-slots`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        selectedSlots: booking.slots.map((s) => ({
          positionId: s.positionId,
          templateId: s.templateId,
          slotId: s.slotId,
        })),
        paidAmount: booking.amount,
        ...(dto.transactionId ? { transactionId: dto.transactionId } : {}),
      }),
    });

    booking.status = 'confirmed';
    booking.eventshRequestId = requestId;
    booking.transactionId = dto.transactionId ?? '';
    booking.confirmedAt = new Date();
    await booking.save();

    // Never let a CRM hiccup undo a booking that has been paid for and held.
    const what = booking.slots.map((s) => `${s.spaceName} ${s.startTime}-${s.endTime}`).join(', ');
    this.crmService
      .upsertContact({
        email: booking.email,
        name: booking.name,
        phone: booking.phone || undefined,
        company: booking.organization || undefined,
        source: {
          type: 'space-booking',
          refId: booking._id,
          label: `Booked ${what || 'a space'}`,
        },
      })
      .catch((err: unknown) =>
        this.logger.warn(`CRM upsert failed for space booking: ${(err as Error)?.message}`),
      );

    return this.present(booking);
  }

  /** Admin list — every booking, newest first. */
  findAll() {
    return this.model.find().sort({ createdAt: -1 }).exec();
  }

  private present(booking: SpaceBookingDocument) {
    return {
      reference: booking.reference,
      status: booking.status,
      amount: booking.amount,
      currency: booking.currency,
      slots: booking.slots,
      eventshRequestId: booking.eventshRequestId,
    };
  }
}
