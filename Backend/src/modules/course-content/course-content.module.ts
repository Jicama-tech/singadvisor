import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  CourseModule,
  CourseModuleSchema,
} from './entities/course-module.entity';
import { CourseItem, CourseItemSchema } from './entities/course-item.entity';
import { Training, TrainingSchema } from '../trainings/entities/training.entity';
import { CourseContentController } from './course-content.controller';
import { CourseContentService } from './course-content.service';

/**
 * The Coursera-style curriculum authored under Trainings → Content.
 *
 * `CourseModule` below is the entity, not this file's `@Module` decorator —
 * two different identifiers that happen to read alike, which is why the entity
 * is named for the thing it is (a module of a course) and not renamed around
 * Nest.
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CourseModule.name, schema: CourseModuleSchema },
      { name: CourseItem.name, schema: CourseItemSchema },
      // Registered here too (Nest scopes forFeature models to the declaring
      // module), as CourseRunsModule does: Training for the existence check,
      // the public slug join and seedFromOutline. TrainingsModule exports only
      // TrainingsService, not its models.
      { name: Training.name, schema: TrainingSchema },
    ]),
  ],
  controllers: [CourseContentController],
  providers: [CourseContentService],
  exports: [MongooseModule],
})
export class CourseContentModule {}
