import { IsIn } from 'class-validator';

export class SetStatusDto {
  @IsIn(['draft', 'published', 'cancelled'])
  status!: 'draft' | 'published' | 'cancelled';
}
