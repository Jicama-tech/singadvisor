import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CourseRunsService } from './course-runs.service';
import { CreateCourseRunDto } from './dto/create-course-run.dto';
import { UpdateCourseRunDto } from './dto/update-course-run.dto';
import { CreateSessionDto } from './dto/create-session.dto';
import { UpdateSessionDto } from './dto/update-session.dto';

/**
 * Admin detail lives at `id/:id`, as on TrainingsController, so the admin
 * client addresses both resources the same way.
 */
@Controller('course-runs')
export class CourseRunsController {
  constructor(private readonly courseRunsService: CourseRunsService) {}

  /** Public — upcoming published runs, optionally for one training. */
  @Get()
  findPublic(@Query('trainingId') trainingId?: string) {
    return this.courseRunsService.findPublic(trainingId);
  }

  @Get('admin')
  @UseGuards(JwtAuthGuard)
  findAll(
    @Query('trainingId') trainingId?: string,
    @Query('status') status?: string,
  ) {
    return this.courseRunsService.findAll({ trainingId, status });
  }

  @Get('id/:id')
  @UseGuards(JwtAuthGuard)
  findById(@Param('id') id: string) {
    return this.courseRunsService.findById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() dto: CreateCourseRunDto) {
    return this.courseRunsService.create(dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(@Param('id') id: string, @Body() dto: UpdateCourseRunDto) {
    return this.courseRunsService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@Param('id') id: string) {
    return this.courseRunsService.remove(id);
  }

  @Post(':id/sessions')
  @UseGuards(JwtAuthGuard)
  addSession(@Param('id') id: string, @Body() dto: CreateSessionDto) {
    return this.courseRunsService.addSession(id, dto);
  }

  @Patch(':id/sessions/:sessionId')
  @UseGuards(JwtAuthGuard)
  updateSession(
    @Param('id') id: string,
    @Param('sessionId') sessionId: string,
    @Body() dto: UpdateSessionDto,
  ) {
    return this.courseRunsService.updateSession(id, sessionId, dto);
  }

  @Delete(':id/sessions/:sessionId')
  @UseGuards(JwtAuthGuard)
  removeSession(@Param('id') id: string, @Param('sessionId') sessionId: string) {
    return this.courseRunsService.removeSession(id, sessionId);
  }
}
