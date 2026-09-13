import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

/** The person taking over the seat. Company carries over from the person they
 * replace unless given — a substitution is normally within the same sponsor. */
export class SubstituteEnrolmentDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  phone?: string | null;

  @IsOptional()
  @IsString()
  company?: string | null;

  @IsOptional()
  @IsString()
  jobTitle?: string | null;

  @IsOptional()
  @IsString()
  externalId?: string | null;
}
