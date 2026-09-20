import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Subscriber, SubscriberDocument } from './entities/subscriber.entity';
import { SubscribeDto } from './dto/subscribe.dto';
import { CrmService } from '../crm/crm.service';

@Injectable()
export class SubscribersService {
  private readonly logger = new Logger(SubscribersService.name);

  constructor(
    @InjectModel(Subscriber.name)
    private readonly model: Model<SubscriberDocument>,
    private readonly crmService: CrmService,
  ) {}

  /** Re-subscribing is idempotent and reactivates a previous unsubscribe
   * (same upsert semantics as the old server action). */
  async subscribe(dto: SubscribeDto) {
    const email = dto.email.toLowerCase().trim();
    const subscriber = await this.model.findOneAndUpdate(
      { email },
      { $set: { active: true }, $setOnInsert: { createdAt: new Date() } },
      { upsert: true, new: true },
    );

    this.crmService
      .upsertContact({
        email,
        source: {
          type: 'subscriber',
          refId: subscriber._id,
          label: 'Subscribed to the newsletter',
        },
      })
      .catch((err: unknown) =>
        this.logger.warn(`CRM upsert failed for subscriber: ${(err as Error)?.message}`),
      );

    return subscriber;
  }

  /**
   * Whether this address is on the list right now.
   *
   * Read by the membership `emails` perk BEFORE it subscribes, because the
   * answer afterwards is always yes and what it needs to know is whether the
   * membership is what put them there — only then may its expiry take them
   * off again. See Membership.subscribedByMembership.
   */
  async isActive(email: string): Promise<boolean> {
    const address = (email || '').toLowerCase().trim();
    if (!address) return false;
    const existing = await this.model.findOne({ email: address }).lean().exec();
    return !!existing?.active;
  }

  /**
   * Flip an existing row's subscription without creating one.
   *
   * Deliberately not an upsert, unlike subscribe() above: this is called to
   * UNDO a subscription a membership made, and a row that is no longer there
   * is already in the state being asked for. Creating an inactive row for an
   * address that never subscribed would be inventing a record of a consent
   * nobody gave.
   */
  async setActive(email: string, active: boolean): Promise<boolean> {
    const address = (email || '').toLowerCase().trim();
    if (!address) return false;
    const updated = await this.model
      .findOneAndUpdate({ email: address }, { $set: { active } }, { new: true })
      .exec();
    return !!updated;
  }
}
