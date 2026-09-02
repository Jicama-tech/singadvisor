import { IsString, MinLength } from 'class-validator';

/** The ID token Google Identity Services hands the browser after a
 * successful sign-in. Verified server-side against GOOGLE_CLIENT_ID — the
 * browser's copy is never trusted for identity. */
export class GoogleLoginDto {
  @IsString()
  @MinLength(1, { message: 'A Google credential is required.' })
  credential!: string;
}
