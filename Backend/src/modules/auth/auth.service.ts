import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { AdminService } from '../admin/admin.service';
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
    private readonly jwtService: JwtService,
  ) {}

  async login(email: string, password: string): Promise<{ token: string; user: SessionPayload }> {
    const user = await this.adminService.findByEmail(email);
    const hash = user?.passwordHash ?? DUMMY_HASH;
    const valid = await bcrypt.compare(password, hash);

    if (!user || !valid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    await this.adminService.touchLastLogin(user.id);

    const payload: SessionPayload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };

    const token = await this.jwtService.signAsync(payload);
    return { token, user: payload };
  }

  async verify(token: string): Promise<SessionPayload> {
    return this.jwtService.verifyAsync<SessionPayload>(token);
  }
}
