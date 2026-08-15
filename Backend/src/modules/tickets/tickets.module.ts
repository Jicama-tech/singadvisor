import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EventsModule } from '../events/events.module';
import { MailModule } from '../mail/mail.module';
import { Ticket, TicketSchema } from './entities/ticket.entity';
import { TicketsController } from './tickets.controller';
import { RazorpayWebhookController } from './razorpay-webhook.controller';
import { TicketsService } from './tickets.service';
import { RazorpayService } from './razorpay.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Ticket.name, schema: TicketSchema }]),
    EventsModule, // re-exports its Event model registration for inventory decrement
    MailModule,
  ],
  controllers: [TicketsController, RazorpayWebhookController],
  providers: [TicketsService, RazorpayService],
  exports: [TicketsService],
})
export class TicketsModule {}
