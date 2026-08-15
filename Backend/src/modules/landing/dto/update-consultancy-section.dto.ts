import { IsString, MinLength } from 'class-validator';

export class UpdateConsultancySectionDto {
  @IsString()
  @MinLength(1)
  eyebrow!: string;

  @IsString()
  @MinLength(1)
  title!: string;

  @IsString()
  @MinLength(1)
  description!: string;

  @IsString()
  @MinLength(1)
  image!: string; // path under /public, same convention as Training/Event images

  @IsString()
  @MinLength(1)
  ctaLabel!: string;

  @IsString()
  @MinLength(1)
  ctaHref!: string;

  // The services list itself is NOT part of this section's content — it
  // stays exactly where it is today, live from ConsultancyService.
}
