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
}
