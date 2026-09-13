import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import {
  COURSE_ITEM_KINDS,
  CourseItemKind,
  QUIZ_QUESTION_TYPES,
  RELEASE_RULES,
  SUBMISSION_TYPES,
  VIDEO_PROVIDERS,
} from '../entities/course-item.entity';

/** A link that must be either an external https URL or a file this Backend
 * served from uploads/ — the two forms CourseAttachment.url documents. */
const LINK_OR_UPLOAD = /^(https?:\/\/|\/uploads\/)/;

export class QuizOptionDto {
  // Optional: a brand-new option arrives with no id yet — the service fills
  // one in (`o.id || randomUUID()`) rather than requiring the client to mint
  // it, as EventsService does for ticket tiers.
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  @MinLength(1)
  text!: string;

  @IsOptional()
  @IsBoolean()
  correct?: boolean;
}

export class QuizQuestionDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsOptional()
  @IsIn(QUIZ_QUESTION_TYPES)
  type?: string;

  @IsString()
  @MinLength(1)
  prompt!: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(12)
  @ValidateNested({ each: true })
  @Type(() => QuizOptionDto)
  options?: QuizOptionDto[];

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  explanation?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  points?: number;
}

export class CourseAttachmentDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  label!: string;

  @IsString()
  @Matches(LINK_OR_UPLOAD, {
    message: 'An attachment link must start with https:// or be an uploaded file.',
  })
  url!: string;
}

/**
 * Everything an admin sets on an item. `courseModuleId` and `trainingId` are
 * deliberately absent: the module comes from the path and the training is
 * copied off it, so an item can never be posted into a training the request
 * was not addressing.
 *
 * Which of the payload fields below actually matter is decided by `kind`, and
 * that rule is NOT here — it is CourseContentService.assertItemCoherent, which
 * checks the item as it will be after the write rather than the fields in this
 * request (the assertRunCoherent precedent).
 */
export class CreateCourseItemDto {
  @IsIn(COURSE_ITEM_KINDS)
  kind!: CourseItemKind;

  @IsString()
  @MinLength(1)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  summary?: string;

  /** Opens a lesson group; an empty string clears it, the same as null. See
   * CourseItem.lessonHeading for why a lesson is a divider, not a row. */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  lessonHeading?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  estimatedMins?: number;

  /** Defaults to one after the module's current last item. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  sortOrder?: number;

  @IsOptional()
  @IsIn(RELEASE_RULES)
  releaseRule?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  releaseOnDay?: number | null;

  @IsOptional()
  @IsBoolean()
  optional?: boolean;

  @IsOptional()
  @IsBoolean()
  previewFree?: boolean;

  @IsOptional()
  @IsBoolean()
  published?: boolean;

  @IsOptional()
  @IsBoolean()
  graded?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  gradeWeight?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  passMarkPct?: number;

  /**
   * An empty string clears it, the same as null. @Matches and NOT @IsUrl:
   * @IsUrl rejects `/uploads/course-media/x.mp4`, which would make the
   * videoProvider: 'file' path — the whole reason POST /uploads/course-media
   * exists — impossible to save.
   */
  @ValidateIf((o: CreateCourseItemDto) => o.videoUrl != null && o.videoUrl !== '')
  @Matches(LINK_OR_UPLOAD, {
    message: 'A video link must start with https:// or be an uploaded file.',
  })
  videoUrl?: string | null;

  @IsOptional()
  @IsIn(VIDEO_PROVIDERS)
  videoProvider?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200_000)
  body?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => QuizQuestionDto)
  questions?: QuizQuestionDto[];

  /** 0 means unlimited. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  attemptsAllowed?: number;

  @IsOptional()
  @IsBoolean()
  shuffleQuestions?: boolean;

  @IsOptional()
  @IsIn(SUBMISSION_TYPES)
  submissionType?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  dueOnDay?: number | null;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => CourseAttachmentDto)
  attachments?: CourseAttachmentDto[];
}
