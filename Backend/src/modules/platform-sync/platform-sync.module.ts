import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { BlogPost, BlogPostSchema } from '../blog/entities/blog-post.entity';
import { PlatformSyncService } from './platform-sync.service';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    MongooseModule.forFeature([{ name: BlogPost.name, schema: BlogPostSchema }]),
  ],
  providers: [PlatformSyncService],
})
export class PlatformSyncModule {}
