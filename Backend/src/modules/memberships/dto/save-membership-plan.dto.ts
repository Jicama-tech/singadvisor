import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { MEMBERSHIP_PERK_KEYS, type MembershipPerk } from '../membership-perks';

/**
 * Admin-only, behind the JWT guard — the one place a plan's price is set.
 *
 * Both create and update take this shape. Every field but `name` is optional
 * so a PATCH can carry only what changed, and the service writes only the keys
 * present, the same way TrainingsService.save does.
 */
export class SaveMembershipPlanDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  priceCents?: number;

  /** Three uppercase letters, nothing else. `currency` is copied onto a
   * booking, printed into a confirmation email and written into the PayNow
   * QR payload — a free-text field reaching all three is worth closing at
   * the source rather than escaping at each destination. */
  @IsOptional()
  @IsString()
  @Matches(/^[A-Z]{3}$/)
  currency?: string;

  /** Capped at ten years: a term longer than that is a data-entry slip, and an
   * endDate in 2075 is not one an admin would notice. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(3650)
  durationDays?: number;

  /** Only keys from the catalogue. `each` validates the members, not the
   * array, so one bad key rejects the request rather than being dropped. */
  @IsOptional()
  @IsArray()
  @IsIn(MEMBERSHIP_PERK_KEYS, { each: true })
  perks?: MembershipPerk[];

  @IsOptional()
  @IsBoolean()
  published?: boolean;
}
