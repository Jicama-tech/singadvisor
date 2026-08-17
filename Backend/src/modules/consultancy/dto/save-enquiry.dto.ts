import { IsEmail, IsIn, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

/**
 * Public enquiry submission — same validation rules as Frontend's
 * `enquirySchema` in `src/lib/validation.ts` (the Zod schema was the gate;
 * these decorators are its class-validator mirror).
 */
export class SaveEnquiryDto {
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

  @IsString()
  @MinLength(2)
  @MaxLength(160)
  company!: string;

  @IsOptional()
  @IsIn(['1-10', '11-50', '51-200', '200+'])
  companySize?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  budget?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  timeline?: string;

  @IsString()
  @MinLength(20)
  @MaxLength(4000)
  message!: string;

  @IsOptional()
  @IsString()
  serviceId?: string;
}
