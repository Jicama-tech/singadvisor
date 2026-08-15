import { IsArray, IsEmail, IsMongoId, IsOptional, IsString, MinLength } from 'class-validator';

export class ApplySponsorDto {
  @IsMongoId()
  eventId!: string;

  @IsString()
  @MinLength(1)
  sponsorTypeId!: string;

  @IsString()
  @MinLength(1)
  companyName!: string;

  @IsString()
  @MinLength(1)
  contactName!: string;

  @IsEmail()
  email!: string;

  @IsOptional()
  @IsEmail()
  businessEmail?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  website?: string;

  @IsOptional()
  @IsString()
  message?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  selectedOptions?: string[];
}
