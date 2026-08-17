import { Type } from 'class-transformer';
import {
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

/** Public training enrolment — mirrors Frontend's `registrationSchema` in
 * `src/lib/validation.ts` (the Zod schema was the gate; these decorators are
 * its class-validator mirror). */
export class CreateRegistrationDto {
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
  @IsString()
  @MaxLength(160)
  company?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  seats?: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  message?: string;
}
