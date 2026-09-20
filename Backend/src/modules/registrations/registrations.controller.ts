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
import { TabsGuard } from '../../common/guards/tabs.guard';
import { Tabs } from '../../common/decorators/tabs.decorator';
import { RegistrationsService } from './registrations.service';
import { CreateRegistrationDto } from './dto/create-registration.dto';
import { ClaimPaymentDto } from './dto/claim-payment.dto';
import { UpdateRegistrationStatusDto } from './dto/update-registration-status.dto';

/**
 * Route order was checked before the resend below was added, and nothing here
 * shadows anything else. The three POSTs are the only ones that could: the
 * enrolment's path is `training/:trainingId`, a literal second segment, while
 * both `:id` POSTs end in a literal third segment that no ObjectId could be
 * mistaken for — so a booking id would have to be the word "training" for the
 * first to swallow either, and it cannot be. The GETs and PATCHes each own a
 * distinct trailing literal for the same reason. Guarded routes are grouped
 * below the public ones for reading only; Nest matches on the path, not the
 * guard.
 */
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
  @UseGuards(JwtAuthGuard, TabsGuard)
  @Tabs('registrations')
  list() {
    return this.registrationsService.findForAdmin();
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, TabsGuard)
  @Tabs('registrations')
  updateStatus(@Param('id') id: string, @Body() dto: UpdateRegistrationStatusDto) {
    return this.registrationsService.updateStatus(id, dto.status);
  }

  /** Admin — the money arrived. Guarded, because it is the one place a
   * claim becomes a payment and a place becomes confirmed. */
  @Patch(':id/verify-payment')
  @UseGuards(JwtAuthGuard, TabsGuard)
  @Tabs('registrations')
  verifyPayment(@Param('id') id: string) {
    return this.registrationsService.verifyPayment(id);
  }

  /** Admin — send the confirmation email again, and say whether it went this
   * time. Needed rather than nice: with no SMTP_HOST configured every
   * confirmation sent above fails, so this is the only way a registrant
   * confirmed today ever receives their joining details. */
  @Post(':id/resend-confirmation')
  @UseGuards(JwtAuthGuard, TabsGuard)
  @Tabs('registrations')
  resendConfirmation(@Param('id') id: string) {
    return this.registrationsService.resendConfirmation(id);
  }
}
