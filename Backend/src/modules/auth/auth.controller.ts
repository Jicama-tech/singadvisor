import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { SessionPayload } from './session-payload';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Verifies email/password against the migrated `admin-users` collection
   * and returns a JWT shaped exactly like Frontend's SessionPayload. The
   * Frontend mints its own httpOnly session cookie from this token — cookie
   * issuance itself stays where it is today (Phase 3 wires this in).
   */
  @Post('login')
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.password);
  }

  /** Round-trip check that a bearer token issued above verifies correctly. */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@Req() req: Request & { user: SessionPayload }) {
    return req.user;
  }
}
