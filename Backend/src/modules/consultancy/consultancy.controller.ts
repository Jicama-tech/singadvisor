import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ConsultancyService } from './consultancy.service';
import { SaveServiceDto } from './dto/save-service.dto';
import { SaveEnquiryDto } from './dto/save-enquiry.dto';
import { UpdateStatusDto } from './dto/update-status.dto';

/** Route order matters: `admin` and `id/:id` come before `:slug`. */
@Controller('consultancy-services')
export class ConsultancyServicesController {
  constructor(private readonly service: ConsultancyService) {}

  @Get()
  findPublished() {
    return this.service.findPublished();
  }

  @Get('admin')
  @UseGuards(JwtAuthGuard)
  findAll() {
    return this.service.findAll();
  }

  @Get('id/:id')
  @UseGuards(JwtAuthGuard)
  findById(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Get(':slug')
  findBySlug(@Param('slug') slug: string) {
    return this.service.findBySlugPublic(slug);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() dto: SaveServiceDto) {
    return this.service.save(dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(@Param('id') id: string, @Body() dto: SaveServiceDto) {
    return this.service.save(dto, id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}

@Controller('consultancy-enquiries')
export class ConsultancyEnquiriesController {
  constructor(private readonly service: ConsultancyService) {}

  /** Public — the contact/consultancy page submits this with no session. */
  @Post()
  create(@Body() dto: SaveEnquiryDto) {
    return this.service.createEnquiry(dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  list() {
    return this.service.findEnquiries();
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard)
  updateStatus(@Param('id') id: string, @Body() dto: UpdateStatusDto) {
    return this.service.updateEnquiryStatus(id, dto.status);
  }
}
