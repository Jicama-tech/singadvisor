import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDate,
  IsIn,
  IsInt,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUrl,
  Min,
  MinLength,
} from 'class-validator';

export class CreateSessionDto {
  /** Defaults to one after the run's current last session. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  sequence?: number;

  @IsString()
  @MinLength(1)
  title!: string;

  @Type(() => Date)
  @IsDate()
  startsAt!: Date;

  @Type(() => Date)
  @IsDate()
  endsAt!: Date;

  /** Claimable hours — required rather than derived from the clock times, for
   * the reason given on CourseRunSession.durationHours. */
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  durationHours!: number;

  @IsOptional()
  @IsIn(['In-person', 'Online'])
  mode?: string;

  @IsOptional()
  @IsString()
  venue?: string | null;

  @IsOptional()
  @IsUrl({ require_protocol: true })
  joinUrl?: string | null;

  @IsOptional()
  @IsMongoId()
  trainerId?: string | null;

  @IsOptional()
  @IsBoolean()
  cancelled?: boolean;
}
