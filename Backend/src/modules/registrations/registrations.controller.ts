import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RegistrationsService } from './registrations.service';
import { CreateRegistrationDto } from './dto/create-registration.dto';
import { ClaimPaymentDto } from './dto/claim-payment.dto';
import { UpdateRegistrationStatusDto } from './dto/update-registration-status.dto';

@Controller('registrations')
export class RegistrationsController {
  constructor(private readonly registrationsService: RegistrationsService) {}

  /** Public — the training detail page's enrolment form submits this with no
   * session. Event RSVPs deliberately have no equivalent here: they were
   * superseded by eventsh's ticket flow (see registration.entity.ts). */
  @Post('training/:trainingId')
  create(
    @Param('trainingId') trainingId: string,
    @Body() dto: CreateRegistrationDto,
  ) {
    return this.registrationsService.create(trainingId, dto);
  }

  /** Public — the QR for the amount this booking was taken at, for a
   * registrant who has just enrolled and has no session, exactly as the
   * sponsor flow's own paynow-qr route. */
  @Get(':id/paynow-qr')
  paynowQr(@Param('id') id: string) {
    return this.registrationsService.paynowQr(id);
  }

  /** Public — the "I have paid" click. Records the claim and nothing else:
   * confirming it is the admin route below, and only that. */
  @Post(':id/payment-claimed')
  claimPayment(@Param('id') id: string, @Body() dto: ClaimPaymentDto) {
    return this.registrationsService.claimPayment(id, dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  list() {
    return this.registrationsService.findForAdmin();
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard)
  updateStatus(@Param('id') id: string, @Body() dto: UpdateRegistrationStatusDto) {
    return this.registrationsService.updateStatus(id, dto.status);
  }

  /** Admin — the money arrived. Guarded, because it is the one place a
   * claim becomes a payment and a place becomes confirmed. */
  @Patch(':id/verify-payment')
  @UseGuards(JwtAuthGuard)
  verifyPayment(@Param('id') id: string) {
    return this.registrationsService.verifyPayment(id);
  }
}
