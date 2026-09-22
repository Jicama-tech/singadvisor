import { Body, Controller, Get, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { SettingsService } from './settings.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { VerifyUenDto } from './dto/verify-uen.dto';

@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  /** Admin read — secret-free view (secrets are never echoed). */
  @Get()
  @UseGuards(JwtAuthGuard)
  getSettings() {
    return this.settingsService.getPublicView();
  }

  @Patch()
  @UseGuards(JwtAuthGuard)
  async updateSettings(@Req() req: Request & { user?: { sub?: string; email?: string } }, @Body() dto: UpdateSettingsDto) {
    const updatedBy = req.user?.email ?? req.user?.sub ?? 'unknown';
    return this.settingsService.update(dto, updatedBy);
  }

  /** Buyer-facing: which payment methods exist + the PayNow payee. Public —
   * the public event pages need this to render the right checkout options,
   * and it contains no secrets. */
  /**
   * Check a UEN against ACRA's public register and record the answer.
   *
   * Admin-only even though the register itself is public: this writes to the
   * settings document, and an unauthenticated route that makes the server
   * fetch a URL on request is a needless outbound-request primitive.
   */
  @Post('verify-uen')
  @UseGuards(JwtAuthGuard)
  verifyUen(@Body() dto: VerifyUenDto) {
    return this.settingsService.verifyUen(dto.uen);
  }

  @Get('public')
  getPublicPayload() {
    return this.settingsService.getPublicPayload();
  }
}
