import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  Matches,
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
   * The message, as WhatsApp markup.
   *
   * Optional ONLY because `messageHtml` may carry it instead: the composer
   * sends HTML, the service converts it, and the converted text becomes this.
   * One of the two must be present — the service enforces that, because
   * class-validator cannot express "either this or that" without a custom
   * constraint for one rule.
   *
   * Capped at 4096, WhatsApp's own limit for a text body. A longer one is
   * rejected by the network, and finding that out half-way through a campaign
   * is worse than finding it out in the form.
   */
  @IsOptional()
  @IsString()
  @MaxLength(4096)
  message?: string;

  /**
   * What the Quill composer produced. Converted server-side rather than in
   * the browser, so the stored `message` is provably the thing that was sent.
   *
   * Capped well above the text limit because HTML carries tag overhead; the
   * converted result is checked against 4096 after conversion.
   */
  @IsOptional()
  @IsString()
  @MaxLength(60000)
  messageHtml?: string;

  /**
   * An image to send, as the path returned by POST /uploads/whatsapp.
   *
   * Pinned by pattern to that one directory with a uuid filename, because the
   * server READS this path off its own disk to send the bytes. A free-form
   * string here would be a file-read primitive; the service resolves and
   * re-checks it as well, since a regex alone is a poor place to rest that.
   */
  @IsOptional()
  @Matches(/^\/uploads\/whatsapp\/[0-9a-f-]{36}\.(jpe?g|png|webp|gif)$/i, {
    message: 'imageUrl must be an upload returned by /uploads/whatsapp',
  })
  imageUrl?: string;

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
