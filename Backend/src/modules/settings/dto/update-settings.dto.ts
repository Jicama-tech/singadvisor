import { IsBoolean, IsOptional, IsString, Matches, ValidateIf } from 'class-validator';

/**
 * Partial update of the platform settings. Secrets follow the
 * blank = keep-existing convention: an empty/missing string leaves the
 * stored value untouched, and the explicit clear flags wipe it. companyUEN
 * validates ONLY when a non-empty value is provided — an empty string
 * clears the field (ValidateIf guards the regex).
 */
export class UpdateSettingsDto {
  @IsOptional()
  @IsString()
  companyName?: string;

  @IsOptional()
  @IsString()
  @ValidateIf((o: UpdateSettingsDto) => o.companyUEN !== '')
  @Matches(/^\d{9}[A-Z]$/, { message: 'UEN must be 9 digits followed by one uppercase letter' })
  companyUEN?: string;

  @IsOptional()
  @IsString()
  payNowMobile?: string;

  @IsOptional()
  @IsBoolean()
  paynowEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  razorpayEnabled?: boolean;

  @IsOptional()
  @IsString()
  razorpayKeyId?: string;

  @IsOptional()
  @IsString()
  razorpayKeySecret?: string;

  @IsOptional()
  @IsBoolean()
  clearRazorpayKeySecret?: boolean;

  @IsOptional()
  @IsString()
  razorpayWebhookSecret?: string;

  @IsOptional()
  @IsBoolean()
  clearRazorpayWebhookSecret?: boolean;
}
