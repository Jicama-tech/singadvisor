import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SponsorRequest, SponsorRequestDocument, SponsorRequestStatus } from './entities/sponsor-request.entity';
import { ApplySponsorDto } from './dto/apply-sponsor.dto';
import { SubmitPaymentDto } from './dto/submit-payment.dto';
import { CrmService } from '../crm/crm.service';
import { PaynowService } from '../paynow/paynow.service';

/** The slice of eventsh's sponsorTypes this service uses. */
type SponsorTier = {
  id: string;
  name: string;
  price?: number;
  collectPayment?: boolean;
  description?: string;
  customOptions?: string[];
};

@Injectable()
export class SponsorsService {
  private readonly logger = new Logger(SponsorsService.name);

  constructor(
    @InjectModel(SponsorRequest.name) private readonly model: Model<SponsorRequestDocument>,
    private readonly crmService: CrmService,
    private readonly paynow: PaynowService,
  ) {}

  /**
   * Events live on eventsh, not in this app's own `events` collection — that
   * one stopped being kept in sync at the cutover and still holds stale
   * pre-cutover rows. Reading it here meant every sponsorship application for
   * a real event failed with "Event not found", because the event was only
   * ever in eventsh. Same live read the ticket purchase already does.
   */
  private async fetchEventshEvent(
    eventId: string,
  ): Promise<{ _id: string; sponsorTypes?: SponsorTier[] }> {
    const url = process.env.EVENTSH_BACKEND_URL;
    if (!url) throw new ServiceUnavailableException('EVENTSH_BACKEND_URL is not set.');
    let response: Response;
    try {
      response = await fetch(`${url}/events/${eventId}`, { cache: 'no-store' });
    } catch (cause) {
      throw new ServiceUnavailableException('eventsh is unreachable', { cause });
    }
    if (!response.ok) throw new NotFoundException('Event not found');
    const body = (await response.json()) as { data?: { _id: string } } | { _id: string };
    const event = ('data' in body ? body.data : body) as {
      _id: string;
      sponsorTypes?: SponsorTier[];
    };
    if (!event?._id) throw new NotFoundException('Event not found');
    return event;
  }

  /** Public tier list — what the "Become a sponsor" section on the event
   * page reads to render tiers + the apply form. */
  async tiersForEvent(eventId: string) {
    const event = await this.fetchEventshEvent(eventId);
    return event.sponsorTypes ?? [];
  }

  async apply(dto: ApplySponsorDto) {
    const event = await this.fetchEventshEvent(dto.eventId);
    const tier = (event.sponsorTypes ?? []).find((t) => t.id === dto.sponsorTypeId);
    if (!tier) throw new BadRequestException('Sponsorship tier not found');

    try {
      const request = await this.model.create({
        eventId: dto.eventId,
        sponsorTypeId: tier.id,
        sponsorTypeName: tier.name,
        amount: tier.price,
        collectPayment: tier.collectPayment,
        selectedOptions: dto.selectedOptions ?? [],
        companyName: dto.companyName,
        contactName: dto.contactName,
        email: dto.email.toLowerCase(),
        businessEmail: dto.businessEmail ?? '',
        phone: dto.phone ?? '',
        website: dto.website ?? '',
        message: dto.message ?? '',
        status: 'Applied',
        statusHistory: [{ status: 'Applied', note: '', changedAt: new Date() }],
      });

      // Never let a CRM hiccup block the application itself.
      this.crmService
        .upsertContact({
          email: request.email,
          name: request.contactName,
          phone: request.phone || undefined,
          company: request.companyName || undefined,
          source: {
            type: 'sponsor',
            refId: request._id,
            label: `Applied to sponsor (${request.sponsorTypeName})`,
          },
        })
        .catch((err: unknown) =>
          this.logger.warn(`CRM upsert failed for sponsor request: ${(err as Error)?.message}`),
        );

      return request;
    } catch (err) {
      if ((err as { code?: number }).code === 11000) {
        throw new BadRequestException('This email has already applied to sponsor this event.');
      }
      throw err;
    }
  }

  async findMyApplication(eventId: string, email: string) {
    const doc = await this.model.findOne({ eventId, email: email.toLowerCase() }).exec();
    if (!doc) throw new NotFoundException('No application found for this email.');
    return doc;
  }

  /**
   * PayNow QR for a cash sponsorship, built from the UEN in Settings — the
   * same generator the ticket and slot-booking flows use.
   *
   * The reference is derived from the request's own id rather than stored on
   * it: deterministic, so reloading the page shows the same code rather than
   * minting a new reference for a payment the sponsor may already have made,
   * and short enough to read off a bank statement.
   */
  async paynowQr(id: string) {
    const request = await this.findById(id);
    if (!request.collectPayment || request.amount <= 0) {
      throw new BadRequestException('This sponsorship tier has nothing to pay.');
    }
    const reference = String(request._id).slice(-12).toUpperCase();
    const { qr, payeeId, payeeName } = await this.paynow.generateQr(request.amount, reference);
    return {
      reference,
      amount: request.amount,
      currency: 'SGD',
      payment: { qr, payeeId, payeeName },
    };
  }

  async submitPayment(id: string, dto: SubmitPaymentDto) {
    const doc = await this.model
      .findByIdAndUpdate(
        id,
        {
          transactionId: dto.transactionId,
          transactionScreenshot: dto.transactionScreenshot ?? '',
          paymentMethod: dto.paymentMethod ?? '',
          status: 'PaymentSubmitted',
          $push: { statusHistory: { status: 'PaymentSubmitted', note: '', changedAt: new Date() } },
        },
        { new: true },
      )
      .exec();
    if (!doc) throw new NotFoundException(`No sponsor request with id "${id}"`);
    return doc;
  }

  findByEvent(eventId: string) {
    return this.model.find({ eventId }).sort({ createdAt: -1 }).exec();
  }

  async findById(id: string) {
    const doc = await this.model.findById(id).exec();
    if (!doc) throw new NotFoundException(`No sponsor request with id "${id}"`);
    return doc;
  }

  async setStatus(id: string, status: SponsorRequestStatus, note?: string) {
    const doc = await this.model
      .findByIdAndUpdate(
        id,
        { status, $push: { statusHistory: { status, note: note ?? '', changedAt: new Date() } } },
        { new: true },
      )
      .exec();
    if (!doc) throw new NotFoundException(`No sponsor request with id "${id}"`);
    return doc;
  }

  async verifyPayment(id: string) {
    const doc = await this.model
      .findByIdAndUpdate(
        id,
        {
          paymentVerified: true,
          paymentVerifiedAt: new Date(),
          status: 'Confirmed',
          $push: { statusHistory: { status: 'Confirmed', note: 'Payment verified', changedAt: new Date() } },
        },
        { new: true },
      )
      .exec();
    if (!doc) throw new NotFoundException(`No sponsor request with id "${id}"`);
    return doc;
  }

  /** Confirmed sponsors' logos — feeds a public marquee/logo strip. */
  confirmedLogos(eventId: string) {
    return this.model
      .find({ eventId, status: 'Confirmed', logo: { $ne: '' } })
      .select('companyName logo -_id')
      .exec();
  }
}
