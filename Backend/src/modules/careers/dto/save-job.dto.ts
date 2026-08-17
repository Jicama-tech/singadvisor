import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDate,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

/** Create/update shape for a job posting — mirrors the fields Frontend's
 * `saveJob` server action assembled, including its closesAt/salary checks
 * (the service re-implements the cross-field validation). */
export class SaveJobDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  title?: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsString()
  department?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsIn(['Full-time', 'Part-time', 'Contract', 'Internship'])
  employment?: string;

  @IsOptional()
  @IsIn(['On-site', 'Remote', 'Hybrid'])
  workMode?: string;

  @IsOptional()
  @IsString()
  experience?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  salaryMin?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  salaryMax?: number | null;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  summary?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  requirements?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  benefits?: string[];

  @IsOptional()
  @IsBoolean()
  published?: boolean;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  closesAt?: Date | null;
}
