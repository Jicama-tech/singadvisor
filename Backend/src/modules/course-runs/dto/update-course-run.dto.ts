import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateCourseRunDto } from './create-course-run.dto';

/** A run cannot move to another Training: its enrolments carry trainingId as a
 * denormalized copy, and moving the run would split that history in two. */
export class UpdateCourseRunDto extends PartialType(
  OmitType(CreateCourseRunDto, ['trainingId'] as const),
) {}
