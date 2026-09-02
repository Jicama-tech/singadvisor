import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SpaceBooking, SpaceBookingSchema } from './entities/space-booking.entity';
import { SpaceBookingsController } from './space-bookings.controller';
import { SpaceBookingsService } from './space-bookings.service';
import { PaynowModule } from '../paynow/paynow.module';
import { SettingsModule } from '../settings/settings.module';
import { CrmModule } from '../crm/crm.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: SpaceBooking.name, schema: SpaceBookingSchema }]),
    PaynowModule,
    SettingsModule,
    CrmModule,
  ],
  controllers: [SpaceBookingsController],
  providers: [SpaceBookingsService],
})
export class SpaceBookingsModule {}
