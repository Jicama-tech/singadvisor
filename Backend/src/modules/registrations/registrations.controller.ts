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
}
