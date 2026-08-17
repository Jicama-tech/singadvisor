import { IsIn } from 'class-validator';
import { LANDING_VARIANTS, LandingVariant } from '../entities/landing-section.entity';

export class SetVariantDto {
  @IsIn(LANDING_VARIANTS)
  variant!: LandingVariant;
}
