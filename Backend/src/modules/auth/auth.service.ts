import {
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { OAuth2Client } from 'google-auth-library';
import { AdminService } from '../admin/admin.service';
import { OperatorsService } from '../operators/operators.service';
import { SessionPayload } from './session-payload';

@Injectable()
export class AuthService {
  private readonly oauthClient: OAuth2Client;

  constructor(
    private readonly adminService: AdminService,
    private readonly operatorsService: OperatorsService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    // The same client id the blog's reader sign-in verifies against
    // (BlogFeedbackService) — one Google OAuth client for the whole app.
    this.oauthClient = new OAuth2Client(this.configService.get<string>('GOOGLE_CLIENT_ID'));
  }

  /**
   * The only way into the dashboard. Passwords were removed entirely — no hash
   * is stored for anyone, so there is nothing to phish, reuse, leak or reset.
   *
   * Identity is proven by Google; authorization is a separate question this
   * method answers on its own, and deliberately never by creating anything.
   * A Google account says who someone is, not that they are allowed in: the
   * address must ALREADY exist as an admin or as an active operator, added by
   * an admin in Settings -> Operators. Without that rule this endpoint would
   * be a self-registration door into the dashboard for anyone with a Gmail.
   *
   * Admins are checked before operators, matching the order the old password
   * login used, so someone who is both gets their admin role. The issued JWT
   * is the same SessionPayload as ever, so every guard and the SPA's role and
   * access-tab handling are untouched by the move off passwords.
   */
  async loginWithGoogle(credential: string): Promise<{ token: string; user: SessionPayload }> {
    const email = await this.emailFromGoogleCredential(credential);

    const admin = await this.adminService.findByEmail(email);
    if (admin) {
      await this.adminService.touchLastLogin(admin.id);
      const payload: SessionPayload = {
        sub: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
      };
      return { token: await this.jwtService.signAsync(payload), user: payload };
    }

    const operator = await this.operatorsService.findByEmailForAuth(email);
    if (operator && operator.active) {
      const payload: SessionPayload = {
        sub: String(operator._id),
        email: operator.email,
        name: operator.name,
        role: 'operator',
        tabs: operator.accessTabs,
      };
      return { token: await this.jwtService.signAsync(payload), user: payload };
    }

    // Names the rejected address on purpose: the person is looking at their
    // own Google account picker and needs to know they chose the wrong one.
    // It leaks nothing — they just proved they own this address.
    throw new UnauthorizedException(
      `${email} is not set up for dashboard access. Ask an admin to add it under Settings -> Operators.`,
    );
  }

  /** Verifies the Google ID token server-side and returns the address it
   * belongs to. The browser's copy of the email is never trusted. */
  private async emailFromGoogleCredential(credential: string): Promise<string> {
    const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
    if (!clientId || clientId === 'your-google-oauth-client-id') {
      // With no password fallback left, this is the difference between "sign
      // in" and "nobody can get in at all" — so it says exactly what is wrong.
      throw new ServiceUnavailableException(
        'Google sign-in is not configured on this server (GOOGLE_CLIENT_ID).',
      );
    }

    let ticket;
    try {
      ticket = await this.oauthClient.verifyIdToken({ idToken: credential, audience: clientId });
    } catch {
      // Never echo the library's message back: it is a verification failure on
      // a credential, and the detail is only useful to an attacker.
      throw new UnauthorizedException('That Google sign-in could not be verified.');
    }

    const payload = ticket.getPayload();
    if (!payload?.email) {
      throw new UnauthorizedException('Google sign-in did not return an email address.');
    }
    // An unverified address on a Google account is not proof of ownership, and
    // matching one against an operator record would hand over their access.
    if (payload.email_verified === false) {
      throw new UnauthorizedException('That Google account has an unverified email address.');
    }
    return payload.email.toLowerCase().trim();
  }

  async verify(token: string): Promise<SessionPayload> {
    return this.jwtService.verifyAsync<SessionPayload>(token);
  }
}
