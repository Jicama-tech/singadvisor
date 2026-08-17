import { IsIn, IsString } from 'class-validator';

/** Generic `{ status }` patch used by every admin status dropdown. */
export class UpdateStatusDto {
  @IsString()
  @IsIn(['new', 'contacted', 'won', 'lost'])
  status!: string;
}
