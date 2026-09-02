import { Body, Controller, Get, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { AdminService } from '../admin/admin.service';
import { OperatorsService } from '../operators/operators.service';
import { GoogleLoginDto } from './dto/google-login.dto';
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
   * The dashboard's only sign-in, for admins and operators alike. Passwords
   * were removed entirely: identity is proven by Google, and authorization by
   * the address already existing as an admin or an active operator. See
   * AuthService.loginWithGoogle.
   *
   * There is deliberately no POST /auth/login any more, and no
   * change-password route — leaving either behind would keep exactly the
   * attack surface this change removes.
   */
  @Post('google')
  async loginWithGoogle(@Body() dto: GoogleLoginDto) {
    return this.authService.loginWithGoogle(dto.credential);
  }

  /** Round-trip check that a bearer token issued above verifies correctly. */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@Req() req: Request & { user: SessionPayload }) {
    return req.user;
  }

  /** Settings → Profile: update the logged-in user's own display name. The
   * email is not editable here — it is the identity Google signs in against,
   * so changing it is an admin action on the account, not a profile edit. */
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
}
