import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsString, MinLength, ValidateNested } from 'class-validator';

class StatItemDto {
  @IsString()
  @MinLength(1)
  value!: string; // e.g. "12,000+"

  @IsString()
  @MinLength(1)
  label!: string; // e.g. "People trained"
}

export class UpdateStatsSectionDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => StatItemDto)
  items!: StatItemDto[];
}
