import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SettingsModule } from '../settings/settings.module';
import { Contact, ContactSchema } from '../crm/entities/contact.entity';
import { Membership, MembershipSchema } from '../memberships/entities/membership.entity';
import {
  WhatsappBroadcast,
  WhatsappBroadcastSchema,
} from './entities/whatsapp-broadcast.entity';
import { WhatsappController } from './whatsapp.controller';
import { WhatsappService } from './whatsapp.service';
import { WhatsappBroadcastService } from './whatsapp-broadcast.service';

/**
 * WhatsApp messaging.
 *
 * The Contact and Membership MODELS are registered here rather than importing
 * CrmModule and MembershipsModule. Both of those already import a chain that
 * leads back through SubscribersModule to CrmModule, and adding WhatsApp to
 * that graph reproduces the three-way cycle that once stopped this app booting
 * with no error message at all (see the note in CrmModule). Registering the
 * models is enough: a broadcast reads addresses and phone numbers, it does not
 * need either service's behaviour.
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: WhatsappBroadcast.name, schema: WhatsappBroadcastSchema },
      { name: Contact.name, schema: ContactSchema },
      { name: Membership.name, schema: MembershipSchema },
    ]),
    SettingsModule,
  ],
  controllers: [WhatsappController],
  providers: [WhatsappService, WhatsappBroadcastService],
  // The session, for anything that later wants to send transactionally — an
  // enrolment confirmation, say. Nothing does yet.
  exports: [WhatsappService],
})
export class WhatsappModule {}
