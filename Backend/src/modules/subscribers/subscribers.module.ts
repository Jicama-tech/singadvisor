import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Subscriber, SubscriberSchema } from './entities/subscriber.entity';
import { SubscribersController } from './subscribers.controller';
import { SubscribersService } from './subscribers.service';
import { CrmModule } from '../crm/crm.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Subscriber.name, schema: SubscriberSchema }]),
    CrmModule,
  ],
  controllers: [SubscribersController],
  providers: [SubscribersService],
  exports: [SubscribersService],
})
export class SubscribersModule {}
