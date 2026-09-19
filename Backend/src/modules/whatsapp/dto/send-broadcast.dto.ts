import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { BROADCAST_AUDIENCES, type BroadcastAudience } from '../entities/whatsapp-broadcast.entity';

/** Starting a campaign, or previewing who it would reach. */
export class SendBroadcastDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;

  /**
   * The message. Capped at 4096 because that is WhatsApp's own limit for a
   * text body — a longer one is rejected by the network, and finding that out
   * half-way through a campaign is worse than finding it out in the form.
   */
  @IsString()
  @MinLength(1)
  @MaxLength(4096)
  message!: string;

  @IsIn(BROADCAST_AUDIENCES as unknown as string[])
  audience!: BroadcastAudience;

  /** Required when `audience` is 'tag'; ignored otherwise. */
  @IsOptional()
  @IsString()
  @MaxLength(80)
  tag?: string;

  /**
   * Required when `audience` is 'manual'. Capped at the same ceiling the
   * service enforces, so an oversized paste is a validation error on the
   * field rather than a 400 after the audience has been resolved.
   */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(500)
  numbers?: string[];
}
