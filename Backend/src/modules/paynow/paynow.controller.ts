import { BadRequestException, Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PaynowService } from './paynow.service';

@Controller('paynow')
export class PaynowController {
  constructor(private readonly paynowService: PaynowService) {}

  /** Admin preview QR (S$1.00 test scan) — verifies the configured UEN
   * actually resolves in a banking app before real purchases rely on it. */
  @Get('preview-qr')
  @UseGuards(JwtAuthGuard)
  preview(@Query('amount') amount?: string) {
    const value = amount ? Number(amount) : 1;
    if (!Number.isFinite(value) || value <= 0) {
      throw new BadRequestException('Amount must be a positive number');
    }
    return this.paynowService.generateQr(value, 'PREVIEW');
  }
}
