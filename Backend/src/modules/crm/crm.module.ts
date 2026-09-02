import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Contact, ContactSchema } from './entities/contact.entity';
import { Registration, RegistrationSchema } from '../registrations/entities/registration.entity';
import {
  ConsultancyEnquiry,
  ConsultancyEnquirySchema,
} from '../consultancy/entities/consultancy-enquiry.entity';
import { JobApplication, JobApplicationSchema } from '../careers/entities/job-application.entity';
import {
  ContactMessage,
  ContactMessageSchema,
} from '../contact-messages/entities/contact-message.entity';
import { Subscriber, SubscriberSchema } from '../subscribers/entities/subscriber.entity';
import { Ticket, TicketSchema } from '../tickets/entities/ticket.entity';
import {
  SponsorRequest,
  SponsorRequestSchema,
} from '../sponsors/entities/sponsor-request.entity';
import { BlogFeedback, BlogFeedbackSchema } from '../blog/entities/blog-feedback.entity';
import { CrmController } from './crm.controller';
import { CrmService } from './crm.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Contact.name, schema: ContactSchema },
      // Read-only, backfill() only — see CrmService's constructor comment.
      { name: Registration.name, schema: RegistrationSchema },
      { name: ConsultancyEnquiry.name, schema: ConsultancyEnquirySchema },
      { name: JobApplication.name, schema: JobApplicationSchema },
      { name: ContactMessage.name, schema: ContactMessageSchema },
      { name: Subscriber.name, schema: SubscriberSchema },
      { name: Ticket.name, schema: TicketSchema },
      { name: SponsorRequest.name, schema: SponsorRequestSchema },
      { name: BlogFeedback.name, schema: BlogFeedbackSchema },
    ]),
  ],
  controllers: [CrmController],
  providers: [CrmService],
  exports: [CrmService],
})
export class CrmModule {}
