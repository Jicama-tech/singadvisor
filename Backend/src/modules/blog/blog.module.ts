import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BlogPost, BlogPostSchema } from './entities/blog-post.entity';
import { BlogFeedback, BlogFeedbackSchema } from './entities/blog-feedback.entity';
import { BlogController } from './blog.controller';
import { BlogService } from './blog.service';
import { BlogFeedbackService } from './blog-feedback.service';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: BlogPost.name, schema: BlogPostSchema },
      { name: BlogFeedback.name, schema: BlogFeedbackSchema },
    ]),
    AiModule,
  ],
  controllers: [BlogController],
  providers: [BlogService, BlogFeedbackService],
  exports: [BlogService, BlogFeedbackService],
})
export class BlogModule {}
