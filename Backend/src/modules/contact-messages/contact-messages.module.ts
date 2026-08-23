import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  ContactMessage,
  ContactMessageSchema,
} from './entities/contact-message.entity';
import { ContactMessagesController } from './contact-messages.controller';
import { ContactMessagesService } from './contact-messages.service';
import { CrmModule } from '../crm/crm.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ContactMessage.name, schema: ContactMessageSchema },
    ]),
    CrmModule,
  ],
  controllers: [ContactMessagesController],
  providers: [ContactMessagesService],
  exports: [ContactMessagesService],
})
export class ContactMessagesModule {}
