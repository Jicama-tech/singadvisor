import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MailModule } from '../mail/mail.module';
import { SettingsModule } from '../settings/settings.module';
import { PaynowModule } from '../paynow/paynow.module';
import { Ticket, TicketSchema } from './entities/ticket.entity';
import { TicketsController } from './tickets.controller';
import { RazorpayWebhookController } from './razorpay-webhook.controller';
import { TicketsService } from './tickets.service';
import { RazorpayService } from './razorpay.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Ticket.name, schema: TicketSchema }]),
    // EventsModule is no longer imported here — Events moved to eventsh
    // (see Frontend's events-client.ts), so this module doesn't need the
    // local Event model anymore; tickets.service.ts now fetches event/tier
    // data from eventsh directly (fetchEventshEvent/fetchEventshTier).
    MailModule,
    SettingsModule,
    PaynowModule,
  ],
  controllers: [TicketsController, RazorpayWebhookController],
  providers: [TicketsService, RazorpayService],
  exports: [TicketsService],
})
export class TicketsModule {}
