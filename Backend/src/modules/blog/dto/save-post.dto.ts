import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDate,
  IsIn,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

/** Create/update shape for a blog post — mirrors the fields Frontend's
 * `savePost` server action assembled. `publishedAt` may arrive as null (the
 * service stamps it on first publish, keeping it stable afterwards). */
export class SavePostDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  title?: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsString()
  excerpt?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsString()
  coverImage?: string;

  @IsOptional()
  @IsIn(['Trainings', 'Events', 'Consultancy', 'Careers', 'Insights'])
  category?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsBoolean()
  published?: boolean;

  @IsOptional()
  @IsBoolean()
  featured?: boolean;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  publishedAt?: Date | null;

  @IsOptional()
  @IsString()
  authorId?: string;

  @IsOptional()
  @IsString()
  writtenByName?: string;

  @IsOptional()
  @IsString()
  writtenByPosition?: string;
}
