import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Subscriber, SubscriberDocument } from './entities/subscriber.entity';
import { SubscribeDto } from './dto/subscribe.dto';

@Injectable()
export class SubscribersService {
  constructor(
    @InjectModel(Subscriber.name)
    private readonly model: Model<SubscriberDocument>,
  ) {}

  /** Re-subscribing is idempotent and reactivates a previous unsubscribe
   * (same upsert semantics as the old server action). */
  async subscribe(dto: SubscribeDto) {
    const email = dto.email.toLowerCase().trim();
    return this.model.findOneAndUpdate(
      { email },
      { $set: { active: true }, $setOnInsert: { createdAt: new Date() } },
      { upsert: true, new: true },
    );
  }
}
