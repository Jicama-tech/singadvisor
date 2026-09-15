import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * Public — "buy this plan". Mirrors CreateRegistrationDto field for field
 * where the two overlap, because it is the same person filling in the same
 * details for the same reason, and two forms that ask differently for a phone
 * number is a bug the admin ends up cleaning.
 *
 * There is no money field here and there could not be one: the amount comes
 * off the plan the server loads, and the global whitelisting ValidationPipe
 * strips anything undeclared before the service sees it.
 */
export class PurchaseMembershipDto {
  /**
   * Google Identity Services ID token, verified server-side before anything in
   * it is trusted. This, not the body, is where the stored email comes from.
   *
   * Optional only because a deployment with no GOOGLE_CLIENT_ID cannot produce
   * one; wherever sign-in is configured the service rejects a purchase without
   * it. Same fork, same reasoning, as RegistrationsService.identify.
   */
  @IsOptional()
  @IsString()
  credential?: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  /**
   * The typed address, read ONLY where there is no client id configured and so
   * no token to take one from. Declared rather than omitted so that deployment
   * can still sell a membership — an undeclared field is silently stripped.
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
}
