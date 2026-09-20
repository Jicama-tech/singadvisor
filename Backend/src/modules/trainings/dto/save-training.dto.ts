import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';

/** The only form a joining link may take: an external https URL. Unlike
 * CourseItem's videoUrl there is no `/uploads/` alternative to allow for —
 * nothing this Backend serves is somebody's Google Classroom — and a
 * capability that will be emailed out has no business travelling as http. */
const HTTPS_LINK = /^https:\/\//;

/**
 * One DTO serves both create and update — the service treats a missing
 * `title` on create as a validation failure and, on update, only overwrites
 * the fields actually present. Mirrors the field set Frontend's
 * `saveTraining` server action assembled (`src/app/admin/actions.ts`).
 */
export class SaveTrainingDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  title?: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsString()
  summary?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  image?: string;

  @IsOptional()
  @IsIn(['Student', 'Corporate', 'Professional'])
  category?: string;

  @IsOptional()
  @IsString()
  level?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  durationHrs?: number;

  @IsOptional()
  @IsIn(['In-person', 'Online', 'Hybrid'])
  format?: string;

  /**
   * The joining link an Online or Hybrid course is run from. An empty string
   * clears it, the same as null — which is exactly why this is @ValidateIf +
   * @Matches and not @IsOptional + @IsUrl, the reasoning
   * CreateCourseItemDto.videoUrl spells out: @IsOptional skips null and
   * undefined but not '', so an @IsUrl field is one the form can set and then
   * never unset.
   *
   * Not restricted to classroom.google.com. The pattern's job is to refuse a
   * link nobody can open, not to second-guess which of Google's host names an
   * admin's invite link happens to carry.
   */
  @ValidateIf(
    (o: SaveTrainingDto) => o.googleClassroomLink != null && o.googleClassroomLink !== '',
  )
  @Matches(HTTPS_LINK, {
    message: 'A Google Classroom link must start with https://.',
  })
  googleClassroomLink?: string | null;

  /** Where an In-person course is held. Free text, and printed into the
   * confirmation email as typed, so the line breaks in it are the admin's to
   * arrange. An empty string clears it, as above. */
  @IsOptional()
  @IsString()
  venueAddress?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  priceCents?: number;

  /** Three uppercase letters, nothing else. `currency` is copied onto a
   * booking, printed into a confirmation email and written into the PayNow
   * QR payload — a free-text field reaching all three is worth closing at
   * the source rather than escaping at each destination. */
  @IsOptional()
  @IsString()
  @Matches(/^[A-Z]{3}$/)
  currency?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  outcomes?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  modules?: string[];

  @IsOptional()
  @IsBoolean()
  published?: boolean;

  @IsOptional()
  @IsBoolean()
  featured?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  sortOrder?: number;

  /** Ordered: the public page credits the facilitators in the order they
   * arrive, so the arrangement in the picker is part of the payload. */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  trainerIds?: string[];
}
