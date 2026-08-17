import { IsIn, IsString } from 'class-validator';

export class UpdateApplicationStatusDto {
  @IsString()
  @IsIn(['received', 'screening', 'interview', 'offer', 'rejected'])
  status!: string;
}
