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
  // Accepts every real Singapore UEN format: 12345678A (pre-2009
  // businesses), 202012345K (post-2009), 202312345K (local companies),
  // T08LL1234K (other entities). Case-insensitive — the service
  // normalizes to uppercase before persisting.
  @Matches(/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z0-9]{8,10}$/, { message: 'UEN must be 8-10 letters/digits, e.g. 202012345K or T08LL1234K' })
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

  @IsOptional()
  @IsBoolean()
  whatsappEnabled?: boolean;

  @IsOptional()
  @IsString()
  whatsappNumber?: string;

  @IsOptional()
  @IsBoolean()
  contactEmailEnabled?: boolean;

  @IsOptional()
  @IsString()
  contactEmail?: string;

  // ---- Contact page channels (see Settings entity) ----------------------

  @IsOptional()
  @IsBoolean()
  contactPhoneEnabled?: boolean;

  @IsOptional()
  @IsString()
  contactPhone?: string;

  @IsOptional()
  @IsBoolean()
  officeAddressEnabled?: boolean;

  @IsOptional()
  @IsString()
  officeAddress?: string;

  @IsOptional()
  @IsString()
  contactEmailNote?: string;

  @IsOptional()
  @IsString()
  contactPhoneNote?: string;

  @IsOptional()
  @IsString()
  whatsappNote?: string;

  @IsOptional()
  @IsString()
  officeAddressNote?: string;
}
