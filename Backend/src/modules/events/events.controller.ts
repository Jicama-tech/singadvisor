import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { SetStatusDto } from './dto/set-status.dto';
import { SetPublishedDto } from './dto/set-published.dto';

/**
 * Route table per the event-ops port plan — public reads (what the
 * marketing site and the ticket-purchase flow fetch), everything else
 * behind `JwtAuthGuard` (same admin-session bar as Landing/Trainings/etc.).
 * No `organizer/:organizerId` route — SingAdvisor is single-tenant, there's
 * only ever one implicit owner.
 */
@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get()
  findPublished(@Query('includePast') includePast?: string) {
    return this.eventsService.findPublished({ includePast: includePast === 'true' });
  }

  @Get('showcase')
  showcase(@Query('limit') limit?: string) {
    const n = Number(limit);
    return this.eventsService.showcase(Number.isFinite(n) && n > 0 ? n : undefined);
  }

  @Get('search')
  search(@Query('q') q: string) {
    return this.eventsService.search(q ?? '');
  }

  @Get('slug/:slug')
  findBySlug(@Param('slug') slug: string) {
    return this.eventsService.findBySlug(slug);
  }

  @Get('admin')
  @UseGuards(JwtAuthGuard)
  findAllForAdmin() {
    return this.eventsService.findAllForAdmin();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findById(@Param('id') id: string) {
    return this.eventsService.findById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() dto: CreateEventDto) {
    return this.eventsService.create(dto);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  update(@Param('id') id: string, @Body() dto: UpdateEventDto) {
    return this.eventsService.update(id, dto);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard)
  setStatus(@Param('id') id: string, @Body() dto: SetStatusDto) {
    return this.eventsService.setStatus(id, dto.status);
  }

  @Patch(':id/publish')
  @UseGuards(JwtAuthGuard)
  setPublished(@Param('id') id: string, @Body() dto: SetPublishedDto) {
    return this.eventsService.setPublished(id, dto.published);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@Param('id') id: string) {
    return this.eventsService.remove(id);
  }
}
