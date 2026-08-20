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
import { SaveTrainerDto } from './dto/save-trainer.dto';

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

/** Trainers double as the Training "Facilitator" and the BlogPost "Author"
 * picker. Originally read-only (records arrived only via the import script,
 * see scripts/import-content.ts) — now writable so an admin can add/edit an
 * author (e.g. "Vansh Sharma, AI Full Stack Developer, Jicama Tech") straight
 * from the Blog editor instead of being limited to the imported set. */
@Controller('trainers')
export class TrainersController {
  constructor(private readonly trainingsService: TrainingsService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  list() {
    return this.trainingsService.findTrainers();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findById(@Param('id') id: string) {
    return this.trainingsService.findTrainerById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() dto: SaveTrainerDto) {
    return this.trainingsService.saveTrainer(dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(@Param('id') id: string, @Body() dto: SaveTrainerDto) {
    return this.trainingsService.saveTrainer(dto, id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@Param('id') id: string) {
    return this.trainingsService.removeTrainer(id);
  }
}
