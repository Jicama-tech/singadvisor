import { IsString, MinLength } from 'class-validator';

export class UpdateHeroSectionDto {
  @IsString()
  @MinLength(1)
  eyebrow!: string; // small badge above the title, e.g. "Singapore · Since 2016"

  @IsString()
  @MinLength(1)
  title!: string; // first line, e.g. "Skills that hold up"

  @IsString()
  @MinLength(1)
  titleAccent!: string; // second, differently-styled line, e.g. "under a real week."

  @IsString()
  @MinLength(1)
  description!: string;

  // "{count}" is replaced with the live published-training count at render
  // time — preserves the existing "Browse 8 programmes" behaviour.
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

  @IsString()
  @MinLength(1)
  videoSrc!: string;

  @IsString()
  @MinLength(1)
  posterSrc!: string;
}
