import { Module } from '@nestjs/common';
import { BlogModule } from '../blog/blog.module';
import { NewsletterModule } from '../newsletter/newsletter.module';
import { ShareController } from './share.controller';
import { ShareService } from './share.service';

/**
 * Server-rendered Open Graph cards for the SPA's blog posts and newsletter
 * issues. Reads through the existing BlogService/NewsletterService rather than
 * querying Mongo itself, so "published only" stays defined in exactly one
 * place per domain.
 */
@Module({
  imports: [BlogModule, NewsletterModule],
  controllers: [ShareController],
  providers: [ShareService],
})
export class ShareModule {}
