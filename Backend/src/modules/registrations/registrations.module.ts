import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Registration, RegistrationSchema } from './entities/registration.entity';
import { RegistrationsController } from './registrations.controller';
import { RegistrationsService } from './registrations.service';
import { ParticipantsController } from './participants.controller';
import { ParticipantsService } from './participants.service';
// The Training model is registered here too (Nest scopes forFeature models to
// the module that declares them) so RegistrationsService can inject it for the
// enrolment-time published check, and ParticipantsService for a course's live
// title and slug.
import { Training, TrainingSchema } from '../trainings/entities/training.entity';
// Read-only, and only for the Participants roster's other half — a seat is
// what turns an enquiry into an attendee. Registered here the same way
// CrmModule registers its own cross-module reads; nothing in this module
// writes an enrolment.
import { Enrolment, EnrolmentSchema } from '../enrolments/entities/enrolment.entity';
import { CrmModule } from '../crm/crm.module';
// MailModule exports MailService, which is all the confirmation email needs —
// the ticket flow imports it exactly this way. Nothing here configures SMTP;
// an unconfigured deployment is MailService's own business and sendBestEffort
// answers for it.
import { MailModule } from '../mail/mail.module';
// PaynowModule already exports PaynowService (the sponsor and ticket flows
// inject it the same way) — importing it is all the paid-enrolment QR needs.
import { PaynowModule } from '../paynow/paynow.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Registration.name, schema: RegistrationSchema },
      { name: Training.name, schema: TrainingSchema },
      { name: Enrolment.name, schema: EnrolmentSchema },
    ]),
    CrmModule,
    MailModule,
    PaynowModule,
  ],
  controllers: [RegistrationsController, ParticipantsController],
  providers: [RegistrationsService, ParticipantsService],
  exports: [RegistrationsService],
})
export class RegistrationsModule {}
