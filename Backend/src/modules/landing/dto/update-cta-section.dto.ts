import { IsString, MinLength } from 'class-validator';

/** The closing "Not sure which of the four you need?" band. */
export class UpdateCtaSectionDto {
  @IsString()
  @MinLength(1)
  title!: string;

  @IsString()
  @MinLength(1)
  description!: string;

  @IsString()
  @MinLength(1)
  primaryCtaLabel!: string;

  @IsString()
  @MinLength(1)
  primaryCtaHref!: string;

  @IsString()
  @MinLength(1)
  secondaryCtaLabel!: string;

  @IsString()
  @MinLength(1)
  secondaryCtaHref!: string;
}
