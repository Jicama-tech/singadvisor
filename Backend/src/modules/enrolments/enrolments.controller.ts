import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { EnrolmentsService } from './enrolments.service';
import { CreateEnrolmentDto } from './dto/create-enrolment.dto';
import { UpdateEnrolmentDto } from './dto/update-enrolment.dto';
import { SubstituteEnrolmentDto } from './dto/substitute-enrolment.dto';

/** Admin only — see EnrolmentsService. There is deliberately no DELETE: a seat
 * that is no longer wanted is withdrawn, which frees it and keeps the record. */
@Controller('enrolments')
@UseGuards(JwtAuthGuard)
export class EnrolmentsController {
  constructor(private readonly enrolmentsService: EnrolmentsService) {}

  @Get()
  findAll(
    @Query('courseRunId') courseRunId?: string,
    @Query('email') email?: string,
    @Query('status') status?: string,
  ) {
    return this.enrolmentsService.findAll({ courseRunId, email, status });
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.enrolmentsService.findById(id);
  }

  @Post()
  create(@Body() dto: CreateEnrolmentDto) {
    return this.enrolmentsService.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateEnrolmentDto) {
    return this.enrolmentsService.update(id, dto);
  }

  @Post(':id/substitute')
  substitute(@Param('id') id: string, @Body() dto: SubstituteEnrolmentDto) {
    return this.enrolmentsService.substitute(id, dto);
  }
}
