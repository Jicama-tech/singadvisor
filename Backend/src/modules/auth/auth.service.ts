import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { AdminService } from '../admin/admin.service';
import { OperatorsService } from '../operators/operators.service';
import { SessionPayload } from './session-payload';

// Compared against when the email does not exist, so a login attempt takes
// the same time either way and the response never reveals which emails are
// registered. Mirrors Frontend/src/lib/auth.ts's `authenticate()` exactly.
const DUMMY_HASH =
  '$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidinv';

@Injectable()
export class AuthService {
  constructor(
    private readonly adminService: AdminService,
    private readonly operatorsService: OperatorsService,
    private readonly jwtService: JwtService,
  ) {}

  /** One login endpoint for admins (owner/editor) AND operators: checks the
   * admin collection first, falls back to the operators collection — the
   * returned JWT's role tells the SPA which experience to render. */
  async login(email: string, password: string): Promise<{ token: string; user: SessionPayload }> {
    const normalized = email.toLowerCase().trim();

    // 1. Admins.
    const admin = await this.adminService.findByEmail(normalized);
    const adminValid = await bcrypt.compare(password, admin?.passwordHash ?? DUMMY_HASH);
    if (admin && adminValid) {
      await this.adminService.touchLastLogin(admin.id);
      const payload: SessionPayload = {
        sub: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
      };
      const token = await this.jwtService.signAsync(payload);
      return { token, user: payload };
    }

    // 2. Operators (Settings → Operators) — inactive operators cannot sign in.
    const operator = await this.operatorsService.findByEmailForAuth(normalized);
    const operatorValid = await bcrypt.compare(password, operator?.passwordHash ?? DUMMY_HASH);
    if (operator && operatorValid && operator.active) {
      const payload: SessionPayload = {
        sub: String(operator._id),
        email: operator.email,
        name: operator.name,
        role: 'operator',
        tabs: operator.accessTabs,
      };
      const token = await this.jwtService.signAsync(payload);
      return { token, user: payload };
    }

    throw new UnauthorizedException('Invalid email or password');
  }

  async verify(token: string): Promise<SessionPayload> {
    return this.jwtService.verifyAsync<SessionPayload>(token);
  }
}
