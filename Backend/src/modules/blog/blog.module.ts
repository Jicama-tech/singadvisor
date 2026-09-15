import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BlogPost, BlogPostSchema } from './entities/blog-post.entity';
import { BlogFeedback, BlogFeedbackSchema } from './entities/blog-feedback.entity';
import { BlogController } from './blog.controller';
import { BlogService } from './blog.service';
import { BlogFeedbackService } from './blog-feedback.service';
import { AiModule } from '../ai/ai.module';
import { CrmModule } from '../crm/crm.module';
// The members-only gate asks one question — is this person a member — and
// MembershipsModule exports the only thing that can answer it.
import { MembershipsModule } from '../memberships/memberships.module';
// Publishing a members-only post announces it to the membership.
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: BlogPost.name, schema: BlogPostSchema },
      { name: BlogFeedback.name, schema: BlogFeedbackSchema },
    ]),
    AiModule,
    CrmModule,
    MembershipsModule,
    MailModule,
  ],
  controllers: [BlogController],
  providers: [BlogService, BlogFeedbackService],
  exports: [BlogService, BlogFeedbackService],
})
export class BlogModule {}
