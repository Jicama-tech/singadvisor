import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Event, EventDocument } from '../events/entities/event.entity';
import { SponsorRequest, SponsorRequestDocument, SponsorRequestStatus } from './entities/sponsor-request.entity';
import { ApplySponsorDto } from './dto/apply-sponsor.dto';
import { SubmitPaymentDto } from './dto/submit-payment.dto';

@Injectable()
export class SponsorsService {
  constructor(
    @InjectModel(SponsorRequest.name) private readonly model: Model<SponsorRequestDocument>,
    @InjectModel(Event.name) private readonly eventModel: Model<EventDocument>,
  ) {}

  /** Public tier list — what the "Become a sponsor" section on the event
   * page reads to render tiers + the apply form. */
  async tiersForEvent(eventId: string) {
    const event = await this.eventModel.findById(eventId).select('sponsorTypes').exec();
    if (!event) throw new NotFoundException('Event not found');
    return event.sponsorTypes;
  }

  async apply(dto: ApplySponsorDto) {
    const event = await this.eventModel.findById(dto.eventId).exec();
    if (!event) throw new NotFoundException('Event not found');
    const tier = event.sponsorTypes.find((t) => t.id === dto.sponsorTypeId);
    if (!tier) throw new BadRequestException('Sponsorship tier not found');

    try {
      return await this.model.create({
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
