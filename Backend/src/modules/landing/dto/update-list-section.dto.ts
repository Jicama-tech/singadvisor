import { IsInt, IsString, Max, Min, MinLength } from 'class-validator';

/**
 * Shared shape for the four DB-driven sections (trainings, events, careers,
 * blog). Only the surrounding copy and item count live here — the actual
 * items keep coming from their existing models (Training, Event, JobPosting,
 * BlogPost) exactly as today; this never touches or duplicates that data.
 */
export class UpdateListSectionDto {
  @IsString()
  @MinLength(1)
  eyebrow!: string;

  @IsString()
  @MinLength(1)
  title!: string;

  @IsString()
  @MinLength(1)
  description!: string;

  @IsString()
  @MinLength(1)
  ctaLabel!: string;

  @IsString()
  @MinLength(1)
  ctaHref!: string;

  @IsInt()
  @Min(1)
  @Max(12)
  take!: number;
}
