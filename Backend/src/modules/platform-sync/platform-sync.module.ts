import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BlogPost, BlogPostSchema } from '../blog/entities/blog-post.entity';
import { Newsletter, NewsletterSchema } from '../newsletter/entities/newsletter.entity';
import { PlatformSyncService } from './platform-sync.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: BlogPost.name, schema: BlogPostSchema },
      { name: Newsletter.name, schema: NewsletterSchema },
    ]),
  ],
  providers: [PlatformSyncService],
})
export class PlatformSyncModule {}
