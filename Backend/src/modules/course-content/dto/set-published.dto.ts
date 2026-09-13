import { IsBoolean } from 'class-validator';

export class SetPublishedDto {
  @IsBoolean()
  published!: boolean;
}
