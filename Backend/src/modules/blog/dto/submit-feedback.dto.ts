import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class SubmitFeedbackDto {
  // Google Identity Services ID token (JWT) — verified server-side against
  // Google's public keys + our client ID before anything in it is trusted.
  @IsString()
  credential!: string;

  @IsIn([1, 2, 3, 4, 5])
  rating!: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  message?: string;
}
