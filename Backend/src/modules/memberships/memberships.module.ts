import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Membership, MembershipSchema } from './entities/membership.entity';
import {
  MembershipPlan,
  MembershipPlanSchema,
} from './entities/membership-plan.entity';
import { MembershipsController } from './memberships.controller';
import { MembershipsService } from './memberships.service';
import { MembershipsCron } from './memberships.cron';
import { CrmModule } from '../crm/crm.module';
import { MailModule } from '../mail/mail.module';
// PaynowModule exports PaynowService; the enrolment, sponsor and ticket flows
// all inject it this way, and a membership's QR is the same QR.
import { PaynowModule } from '../paynow/paynow.module';
// The `emails` perk's whole implementation: SubscribersModule already exports
// SubscribersService, and a membership subscribing someone is the same write
// the newsletter form makes.
import { SubscribersModule } from '../subscribers/subscribers.module';

// ScheduleModule is not imported here — forRoot() is registered once in
// AppModule and its explorer discovers @Cron across every provider in the app,
// exactly as events-mirror.module.ts notes for its own sweep.
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Membership.name, schema: MembershipSchema },
      { name: MembershipPlan.name, schema: MembershipPlanSchema },
    ]),
    CrmModule,
    MailModule,
    PaynowModule,
    SubscribersModule,
  ],
  controllers: [MembershipsController],
  providers: [MembershipsService, MembershipsCron],
  // BlogModule and NewsletterModule import this. Their controllers call
  // viewerFor() for the members-only content gate; their services reach
  // activeMemberEmails() through announceToMembers to tell the membership
  // about a gated post. Nothing else outside this module reads it.
  //
  // RegistrationsModule deliberately does NOT import it: an enrolment is
  // priced at the list price and a membership must not move it.
  exports: [MembershipsService],
})
export class MembershipsModule {}
