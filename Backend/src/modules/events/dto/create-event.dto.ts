import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class VisitorTypeDto {
  // Optional: a brand-new tier arrives with no id yet — the service fills
  // one in (`tier.id || randomUUID()`) rather than requiring the client to
  // mint it.
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  @MinLength(1)
  name!: string;

  @IsNumber()
  @Min(0)
  price!: number;

  @IsInt()
  @Min(0)
  maxCount!: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  soldCount?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  featureAccess?: string[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  description?: string;
}

export class AgendaItemDto {
  @IsString()
  @MinLength(1)
  time!: string;

  @IsString()
  @MinLength(1)
  title!: string;
}

export class CustomSectionDto {
  @IsString()
  @MinLength(1)
  id!: string;

  @IsString()
  @MinLength(1)
  heading!: string;

  @IsString()
  content!: string;
}

export class AgeRestrictionEntryDto {
  @IsString()
  @MinLength(1)
  heading!: string;

  @IsString()
  @MinLength(1)
  age!: string;
}

export class AdBarDto {
  @IsOptional()
  @IsBoolean()
  visible?: boolean;

  @IsOptional()
  @IsString()
  message?: string;

  @IsOptional()
  @IsString()
  bgColor?: string;

  @IsOptional()
  @IsString()
  textColor?: string;
}

export class SpeakerSocialLinksDto {
  @IsOptional()
  @IsString()
  linkedin?: string;

  @IsOptional()
  @IsString()
  instagram?: string;

  @IsOptional()
  @IsString()
  youtube?: string;

  @IsOptional()
  @IsString()
  facebook?: string;

  @IsOptional()
  @IsString()
  twitter?: string;

  @IsOptional()
  @IsString()
  website?: string;
}

export class SpeakerProfileDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsString()
  role?: string;

  @IsOptional()
  @IsString()
  company?: string;

  @IsOptional()
  @IsString()
  photo?: string;

  @IsString()
  @MinLength(1)
  topic!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  startTime?: string;

  @IsOptional()
  @IsString()
  endTime?: string;

  @IsOptional()
  @IsString()
  whatsApp?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => SpeakerSocialLinksDto)
  socialLinks?: SpeakerSocialLinksDto;
}

export class SponsorTypeDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsBoolean()
  collectPayment?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  customOptions?: string[];

  @IsOptional()
  @IsString()
  description?: string;
}

/**
 * `slug` is deliberately optional here — same convention as Trainings/Events
 * today (`saveEvent` in the Frontend's own actions.ts): left blank, the
 * service slugifies the title.
 */
export class CreateEventDto {
  @IsOptional()
  @IsString()
  slug?: string;

  @IsString()
  @MinLength(1)
  title!: string;

  @IsOptional()
  @IsString()
  summary?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  eventType?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsDateString()
  startDate!: string;

  @IsDateString()
  endDate!: string;

  @IsOptional()
  @IsString()
  time?: string;

  @IsOptional()
  @IsString()
  endTime?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  venue?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsIn(['public', 'private', 'unlisted'])
  visibility?: 'public' | 'private' | 'unlisted';

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsObject()
  features?: Record<string, boolean>;

  @IsOptional()
  @IsString()
  ageRestriction?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AgeRestrictionEntryDto)
  ageRestrictions?: AgeRestrictionEntryDto[];

  @IsOptional()
  @IsString()
  dresscode?: string;

  @IsOptional()
  @IsString()
  dressCodeTheme?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => AdBarDto)
  adBar?: AdBarDto;

  @IsOptional()
  @IsString()
  specialInstructions?: string;

  @IsOptional()
  @IsString()
  refundPolicy?: string;

  @IsOptional()
  @IsString()
  termsAndConditions?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CustomSectionDto)
  customSections?: CustomSectionDto[];

  @IsOptional()
  @IsString()
  image?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  gallery?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  reelLinks?: string[];

  @IsOptional()
  @IsObject()
  socialMedia?: Record<string, string>;

  @IsOptional()
  @IsIn(['draft', 'published', 'cancelled'])
  status?: 'draft' | 'published' | 'cancelled';

  @IsOptional()
  @IsBoolean()
  published?: boolean;

  @IsOptional()
  @IsBoolean()
  featured?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  speakers?: string[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SpeakerProfileDto)
  speakerProfiles?: SpeakerProfileDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AgendaItemDto)
  agenda?: AgendaItemDto[];

  @IsOptional()
  @IsString()
  currency?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VisitorTypeDto)
  visitorTypes!: VisitorTypeDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SponsorTypeDto)
  sponsorTypes?: SponsorTypeDto[];
}
