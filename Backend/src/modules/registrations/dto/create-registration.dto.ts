import { Type } from 'class-transformer';
import {
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

/** Public training enrolment — mirrors Frontend's `registrationSchema` in
 * `src/lib/validation.ts` (the Zod schema was the gate; these decorators are
 * its class-validator mirror), with the address no longer among the fields a
 * caller gets to state: see `credential` and `email` below. */
export class CreateRegistrationDto {
  /**
   * Google Identity Services ID token (JWT) — verified server-side against
   * Google's public keys + our client ID before anything in it is trusted.
   * This, not the body, is where the stored email comes from.
   *
   * Optional only because a deployment with no GOOGLE_CLIENT_ID cannot produce
   * one (Frontend-vite's <GoogleSignInButton> renders nothing there). Wherever
   * sign-in is configured, RegistrationsService rejects a request without it.
   */
  @IsOptional()
  @IsString()
  credential?: string;

  /** Prefilled from the Google account and then editable — a display name is
   * not an identity claim, so the typed one wins. */
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  /**
   * The typed address, read ONLY on a deployment with no GOOGLE_CLIENT_ID,
   * where there is no token to take one from and the form falls back to what it
   * always did (see RegistrationsService.identify for the full reasoning).
   *
   * Where sign-in is configured this field is never read — the address comes
   * from the verified token — so no request can book a seat under someone
   * else's email. Declared rather than dropped for one reason: the global
   * ValidationPipe whitelists, so an undeclared field is silently stripped and
   * an unconfigured deployment could not take a registration at all.
   */
  @IsOptional()
  @IsEmail()
  @MaxLength(200)
  email?: string;

  @IsString()
  @MinLength(6)
  @MaxLength(30)
  @Matches(/^[+\d][\d\s()-]*$/)
  phone!: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  company?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  seats?: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  message?: string;
}
