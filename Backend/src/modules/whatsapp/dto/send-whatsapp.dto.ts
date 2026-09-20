import { IsString, MaxLength, MinLength } from 'class-validator';

/** One message to one number — the "send a test" box on the Settings page,
 * used to prove a freshly paired phone actually sends. */
export class SendWhatsappDto {
  @IsString()
  @MinLength(5)
  @MaxLength(32)
  phone!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(4096)
  message!: string;
}
