import { IsBoolean, IsOptional, IsString, IsUrl, MinLength } from 'class-validator';
import { MaxWords } from './max-words.validator';

/** Create/update shape — all optional so PATCH can send a partial update;
 * NewsletterService enforces the required fields on create. */
export class SaveNewsletterDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  title?: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  image?: string;

  @IsOptional()
  @IsString()
  imageAlt?: string;

  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxWords(500)
  message?: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  referenceLink?: string;

  @IsOptional()
  @IsBoolean()
  published?: boolean;
}
