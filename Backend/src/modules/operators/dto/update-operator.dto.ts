import { IsArray, IsBoolean, IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

/** Partial update (the Settings
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
  @IsArray()
  @IsString({ each: true })
  accessTabs?: string[];

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
