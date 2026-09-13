import { IsOptional, IsString, IsUrl, ValidateIf } from 'class-validator';

/**
 * One DTO serves both create and update, as SaveTrainingDto does — the
 * service requires `name` on create and, on update, only overwrites the
 * fields actually present.
 */
export class SaveTrainerDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  bio?: string;

  /** A Backend upload path (/uploads/content/…) or a /public asset path. */
  @IsOptional()
  @IsString()
  photo?: string;

  /** An empty string clears it, the same as null. */
  @ValidateIf((o: SaveTrainerDto) => o.linkedin != null && o.linkedin !== '')
  @IsUrl({ require_protocol: true }, { message: 'LinkedIn must be a full URL, starting with https://' })
  linkedin?: string | null;
}
