import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Newsletter, NewsletterSchema } from './entities/newsletter.entity';
import { NewsletterController } from './newsletter.controller';
import { NewsletterService } from './newsletter.service';
// The gate's one question — is this person a member.
import { MembershipsModule } from '../memberships/memberships.module';
// Publishing a members-only issue announces it to the membership.
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Newsletter.name, schema: NewsletterSchema }]),
    MembershipsModule,
    MailModule,
  ],
  controllers: [NewsletterController],
  providers: [NewsletterService],
  exports: [NewsletterService],
})
export class NewsletterModule {}
