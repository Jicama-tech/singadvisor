import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { SponsorsService } from './sponsors.service';
import { ApplySponsorDto } from './dto/apply-sponsor.dto';
import { SubmitPaymentDto } from './dto/submit-payment.dto';
import { SetSponsorStatusDto } from './dto/set-sponsor-status.dto';

@Controller('sponsor-requests')
export class SponsorRequestsController {
  constructor(private readonly sponsorsService: SponsorsService) {}

  @Post('apply')
  apply(@Body() dto: ApplySponsorDto) {
    return this.sponsorsService.apply(dto);
  }

  /** So an applicant can check their own status without an admin session. */
  @Get('my-application')
  myApplication(@Query('eventId') eventId: string, @Query('email') email: string) {
    return this.sponsorsService.findMyApplication(eventId, email);
  }

  @Post(':id/payment-submit')
  submitPayment(@Param('id') id: string, @Body() dto: SubmitPaymentDto) {
    return this.sponsorsService.submitPayment(id, dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  findAllForAdmin(@Query('eventId') eventId: string) {
    return this.sponsorsService.findByEvent(eventId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findById(@Param('id') id: string) {
    return this.sponsorsService.findById(id);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard)
  setStatus(@Param('id') id: string, @Body() dto: SetSponsorStatusDto) {
    return this.sponsorsService.setStatus(id, dto.status, dto.note);
  }

  @Patch(':id/verify-payment')
  @UseGuards(JwtAuthGuard)
  verifyPayment(@Param('id') id: string) {
    return this.sponsorsService.verifyPayment(id);
  }
}
