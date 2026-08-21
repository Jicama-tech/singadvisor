import { IsString, MinLength } from 'class-validator';

export class GenerateBlogDto {
  @IsString()
  @MinLength(3)
  topic!: string;
}
