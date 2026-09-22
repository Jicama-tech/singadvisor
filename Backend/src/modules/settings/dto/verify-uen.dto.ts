import { IsString, MaxLength, MinLength } from 'class-validator';

/** The UEN to check. Length-bounded here so a pasted essay never reaches the
 * outbound request; the shape itself is checked in uen-lookup, which owns what
 * a UEN looks like. */
export class VerifyUenDto {
  @IsString()
  @MinLength(1)
  @MaxLength(20)
  uen!: string;
}
