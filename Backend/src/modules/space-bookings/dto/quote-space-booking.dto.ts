import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsMongoId,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class SelectedSlotDto {
  @IsString()
  positionId!: string;

  @IsString()
  templateId!: string;

  @IsString()
  slotId!: string;
}

/** Prices a slot selection. Deliberately carries no price of its own — the
 * amount is resolved from the event, so a tampered request cannot change what
 * is charged. */
export class QuoteSpaceBookingDto {
  @IsMongoId()
  eventId!: string;

  @IsArray()
  @ArrayMinSize(1, { message: 'Select at least one slot.' })
  @ValidateNested({ each: true })
  @Type(() => SelectedSlotDto)
  slots!: SelectedSlotDto[];

  @IsString()
  @MinLength(1, { message: 'A name is required.' })
  name!: string;

  @IsEmail({}, { message: 'A valid email is required.' })
  email!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  organization?: string;
}
