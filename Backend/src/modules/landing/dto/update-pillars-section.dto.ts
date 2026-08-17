import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsString, MinLength, ValidateNested } from 'class-validator';

class PillarItemDto {
  @IsString()
  @MinLength(1)
  title!: string;

  @IsString()
  @MinLength(1)
  description!: string;
}

/**
 * Exactly 4, positionally fixed to Trainings / Events / Consultancy /
 * Careers — their icon and link target stay hardcoded on the Frontend (site
 * navigation, not editable content); only the copy is.
 */
export class UpdatePillarsSectionDto {
  @IsArray()
  @ArrayMinSize(4)
  @ArrayMaxSize(4)
  @ValidateNested({ each: true })
  @Type(() => PillarItemDto)
  items!: PillarItemDto[];
}
