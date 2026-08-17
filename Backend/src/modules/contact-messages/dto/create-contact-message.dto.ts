import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

/** Public contact form — mirrors Frontend's `contactSchema` in
 * `src/lib/validation.ts`. */
export class CreateContactMessageDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @IsEmail()
  @MaxLength(200)
  email!: string;

  @IsOptional()
  @IsString()
  @MinLength(6)
  @MaxLength(30)
  @Matches(/^[+\d][\d\s()-]*$/)
  phone?: string;

  @IsString()
  @MinLength(3)
  @MaxLength(160)
  subject!: string;

  @IsString()
  @MinLength(10)
  @MaxLength(4000)
  message!: string;
}
