import { IsIn, IsString } from 'class-validator';

export class UpdateRegistrationStatusDto {
  @IsString()
  @IsIn(['pending', 'confirmed', 'cancelled'])
  status!: string;
}
