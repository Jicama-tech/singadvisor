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
import { TrainingsService } from './trainings.service';
import { SaveTrainingDto } from './dto/save-training.dto';

/**
 * Route order matters: `admin` and `id/:id` are declared before `:slug` so
 * they win over a training that happened to be slugged "admin".
 */
@Controller('trainings')
export class TrainingsController {
  constructor(private readonly trainingsService: TrainingsService) {}

  /** Public — the public `/trainings` listing page fetches this. */
  @Get()
  findPublished() {
    return this.trainingsService.findPublished();
  }

  @Get('admin')
  @UseGuards(JwtAuthGuard)
  findAll() {
    return this.trainingsService.findAll();
  }

  @Get('id/:id')
  @UseGuards(JwtAuthGuard)
  findById(@Param('id') id: string) {
    return this.trainingsService.findById(id);
  }

  @Get(':slug')
  findBySlug(@Param('slug') slug: string) {
    return this.trainingsService.findBySlugPublic(slug);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() dto: SaveTrainingDto) {
    return this.trainingsService.save(dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(@Param('id') id: string, @Body() dto: SaveTrainingDto) {
    return this.trainingsService.save(dto, id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@Param('id') id: string) {
    return this.trainingsService.remove(id);
  }
}

/** Read-only today: the admin form's "Facilitator" picker needs the list, but
 * no trainer management page exists upstream, so nothing writes here — records
 * arrive via the import script (see scripts/import-content.ts). */
@Controller('trainers')
export class TrainersController {
  constructor(private readonly trainingsService: TrainingsService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  list() {
    return this.trainingsService.findTrainers();
  }
}
