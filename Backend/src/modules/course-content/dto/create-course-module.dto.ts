import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

/**
 * Everything an admin sets on a module. `trainingId` is deliberately absent —
 * it comes from the path, so a module can never be posted into a training the
 * request was not addressing.
 */
export class CreateCourseModuleDto {
  @IsString()
  @MinLength(1)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  summary?: string;

  @IsOptional()
  @IsBoolean()
  published?: boolean;

  /** Defaults to one after the training's current last module. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  sortOrder?: number;
}
