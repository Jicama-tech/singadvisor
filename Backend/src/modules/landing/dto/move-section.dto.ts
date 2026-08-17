import { IsIn } from 'class-validator';

export class MoveSectionDto {
  @IsIn(['up', 'down'])
  direction!: 'up' | 'down';
}
