import { IsArray, IsBoolean, IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

/** Partial update — blank password keeps the existing one (the Settings
 * Operators tab follows the same convention as the Razorpay secrets). */
export class UpdateOperatorDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @MaxLength(200)
  password?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  accessTabs?: string[];

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
