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
import { TrainersService } from './trainers.service';
import { SaveTrainerDto } from './dto/save-trainer.dto';

/** Admin only. The public pages never list facilitators on their own — they
 * reach them through the training or post that names them. */
@Controller('trainers')
@UseGuards(JwtAuthGuard)
export class TrainersController {
  constructor(private readonly trainersService: TrainersService) {}

  @Get()
  list() {
    return this.trainersService.findAll();
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.trainersService.findById(id);
  }

  @Post()
  create(@Body() dto: SaveTrainerDto) {
    return this.trainersService.save(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: SaveTrainerDto) {
    return this.trainersService.save(dto, id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.trainersService.remove(id);
  }
}
