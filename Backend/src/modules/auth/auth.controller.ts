import { Body, Controller, Get, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { AdminService } from '../admin/admin.service';
import { OperatorsService } from '../operators/operators.service';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { SessionPayload } from './session-payload';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly adminService: AdminService,
    private readonly operatorsService: OperatorsService,
  ) {}

  /**
   * One endpoint for admins (owner/editor) AND operators — see
   * AuthService.login for the fallback chain. Returns a JWT shaped like
   * SessionPayload; the SPA stores it and uses the role to decide what to
   * render.
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

  /** Settings → Profile: update the logged-in user's own display name. */
  @Patch('profile')
  @UseGuards(JwtAuthGuard)
  updateProfile(
    @Req() req: Request & { user: SessionPayload },
    @Body() body: { name: string },
  ) {
    if (req.user.role === 'operator') {
      return this.operatorsService.update(req.user.sub, { name: body.name });
    }
    return this.adminService.updateOwnProfile(req.user.sub, body.name);
  }

  /** Settings → Profile: change own password (verifies the current one). */
  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  changePassword(
    @Req() req: Request & { user: SessionPayload },
    @Body() body: { currentPassword: string; newPassword: string },
  ) {
    if (req.user.role === 'operator') {
      return this.operatorsService.changePassword(
        req.user.sub,
        body.currentPassword,
        body.newPassword,
      );
    }
    return this.adminService.changeOwnPassword(
      req.user.sub,
      body.currentPassword,
      body.newPassword,
    );
  }
}
