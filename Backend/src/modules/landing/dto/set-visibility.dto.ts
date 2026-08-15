import { IsBoolean } from 'class-validator';

export class SetVisibilityDto {
  @IsBoolean()
  visible!: boolean;
}
