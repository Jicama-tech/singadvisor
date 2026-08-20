import { IsOptional, IsString, MinLength } from 'class-validator';

/** Create/update shape for a Trainer — used both as the Training "Facilitator"
 * and the BlogPost "Author". `title` is the free-text role/company line shown
 * next to the name (e.g. "AI Full Stack Developer, Jicama Tech"), not a page
 * title. */
export class SaveTrainerDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsString()
  photo?: string;

  @IsOptional()
  @IsString()
  linkedin?: string | null;
}
