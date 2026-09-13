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
import { CourseContentService } from './course-content.service';
import { CreateCourseModuleDto } from './dto/create-course-module.dto';
import { UpdateCourseModuleDto } from './dto/update-course-module.dto';
import { CreateCourseItemDto } from './dto/create-course-item.dto';
import { UpdateCourseItemDto } from './dto/update-course-item.dto';
import { ReorderOutlineDto } from './dto/reorder-outline.dto';
import { SetPublishedDto } from './dto/set-published.dto';

/**
 * Guarded per method, the TrainingsController shape, because one route here is
 * public. Route order does not matter for once: every path's first segment
 * after the prefix is a literal (`summary`, `trainings`, `modules`, `items`,
 * `public`) and there is no single-segment param route, so the `@Get(':slug')`
 * hazard that constrains TrainingsController cannot arise.
 */
@Controller('course-content')
export class CourseContentController {
  constructor(private readonly courseContentService: CourseContentService) {}

  @Get('summary')
  @UseGuards(JwtAuthGuard)
  summary() {
    return this.courseContentService.summary();
  }

  @Get('trainings/:trainingId')
  @UseGuards(JwtAuthGuard)
  findTree(@Param('trainingId') trainingId: string) {
    return this.courseContentService.findTree(trainingId);
  }

  @Post('trainings/:trainingId/modules')
  @UseGuards(JwtAuthGuard)
  createModule(
    @Param('trainingId') trainingId: string,
    @Body() dto: CreateCourseModuleDto,
  ) {
    return this.courseContentService.createModule(trainingId, dto);
  }

  @Post('trainings/:trainingId/seed-from-outline')
  @UseGuards(JwtAuthGuard)
  seedFromOutline(@Param('trainingId') trainingId: string) {
    return this.courseContentService.seedFromOutline(trainingId);
  }

  @Patch('trainings/:trainingId/order')
  @UseGuards(JwtAuthGuard)
  reorder(@Param('trainingId') trainingId: string, @Body() dto: ReorderOutlineDto) {
    return this.courseContentService.reorder(trainingId, dto);
  }

  @Patch('modules/:moduleId')
  @UseGuards(JwtAuthGuard)
  updateModule(
    @Param('moduleId') moduleId: string,
    @Body() dto: UpdateCourseModuleDto,
  ) {
    return this.courseContentService.updateModule(moduleId, dto);
  }

  @Delete('modules/:moduleId')
  @UseGuards(JwtAuthGuard)
  removeModule(@Param('moduleId') moduleId: string) {
    return this.courseContentService.removeModule(moduleId);
  }

  @Post('modules/:moduleId/duplicate')
  @UseGuards(JwtAuthGuard)
  duplicateModule(@Param('moduleId') moduleId: string) {
    return this.courseContentService.duplicateModule(moduleId);
  }

  @Patch('modules/:moduleId/publish-all')
  @UseGuards(JwtAuthGuard)
  publishAllInModule(
    @Param('moduleId') moduleId: string,
    @Body() dto: SetPublishedDto,
  ) {
    return this.courseContentService.publishAllInModule(moduleId, dto);
  }

  @Post('modules/:moduleId/items')
  @UseGuards(JwtAuthGuard)
  createItem(@Param('moduleId') moduleId: string, @Body() dto: CreateCourseItemDto) {
    return this.courseContentService.createItem(moduleId, dto);
  }

  @Patch('items/:itemId')
  @UseGuards(JwtAuthGuard)
  updateItem(@Param('itemId') itemId: string, @Body() dto: UpdateCourseItemDto) {
    return this.courseContentService.updateItem(itemId, dto);
  }

  @Delete('items/:itemId')
  @UseGuards(JwtAuthGuard)
  removeItem(@Param('itemId') itemId: string) {
    return this.courseContentService.removeItem(itemId);
  }

  @Post('items/:itemId/duplicate')
  @UseGuards(JwtAuthGuard)
  duplicateItem(@Param('itemId') itemId: string) {
    return this.courseContentService.duplicateItem(itemId);
  }

  /** Public — the curriculum the training's own page renders. */
  @Get('public/:slug')
  findPublicBySlug(@Param('slug') slug: string) {
    return this.courseContentService.findPublicBySlug(slug);
  }
}
