import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateCourseItemDto } from './create-course-item.dto';

/** An item cannot change kind: its payload fields would be nonsense and the
 * orphaned ones would keep their schema defaults. Delete and re-add, the way
 * UpdateCourseRunDto refuses to move a run to another Training. */
export class UpdateCourseItemDto extends PartialType(
  OmitType(CreateCourseItemDto, ['kind'] as const),
) {}
