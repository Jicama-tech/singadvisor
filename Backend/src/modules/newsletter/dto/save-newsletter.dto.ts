import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  IsUrl,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { MaxWords } from './max-words.validator';

/** One story in an issue. An image and a message are required — a story
 * missing either would render as a broken block on the public page. The
 * reference link is optional: not every story points somewhere else. */
export class NewsletterItemDto {
  @IsOptional()
  @IsString()
  heading?: string;

  // A relative /uploads/newsletters/... path from the upload endpoint, not
  // a full URL — same convention as blog's coverImage.
  @IsString()
  @MinLength(1, { message: 'Every story needs an image.' })
  image!: string;

  @IsString()
  @MinLength(10)
  @MaxWords(1000)
  message!: string;

  // Only validated when one was actually given. @IsOptional() alone is not
  // enough: it skips undefined/null, but the admin form submits an empty
  // string for a blank field, which @IsUrl would then reject.
  @ValidateIf((item: NewsletterItemDto) => Boolean(item.referenceLink))
  @IsUrl({ require_tld: false })
  referenceLink?: string;
}

/** Create/update shape — all optional so PATCH can send a partial update;
 * NewsletterService enforces the required fields on create. */
export class SaveNewsletterDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  title?: string;

  // Leave blank to generate from the title — see NewsletterService.save.
  @IsOptional()
  @IsString()
  slug?: string;

  /** The stories in this issue. Absent on a partial update means "leave the
   * stories alone"; present means "these are now the stories", so an empty
   * array is rejected rather than silently emptying an issue. */
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1, { message: 'An issue needs at least one story.' })
  @ValidateNested({ each: true })
  @Type(() => NewsletterItemDto)
  items?: NewsletterItemDto[];

  @IsOptional()
  @IsBoolean()
  published?: boolean;
}
