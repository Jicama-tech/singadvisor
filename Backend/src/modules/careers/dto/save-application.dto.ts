import {
  IsEmail,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * Public job application (the résumé itself arrives as a multipart `resume`
 * field, validated in the controller's interceptor + service). Mirrors
 * Frontend's `applicationSchema` in `src/lib/validation.ts`.
 */
export class SaveApplicationDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @IsEmail()
  @MaxLength(200)
  email!: string;

  @IsString()
  @MinLength(6)
  @MaxLength(30)
  @Matches(/^[+\d][\d\s()-]*$/)
  phone!: string;

  @IsOptional()
  @IsUrl({ require_protocol: true })
  @MaxLength(300)
  linkedin?: string;

  @IsOptional()
  @IsUrl({ require_protocol: true })
  @MaxLength(300)
  portfolio?: string;

  @IsString()
  @MinLength(50)
  @MaxLength(6000)
  coverLetter!: string;
}
