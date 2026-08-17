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
import { BlogService } from './blog.service';
import { SavePostDto } from './dto/save-post.dto';

/** Route order matters: `admin` and `id/:id` come before `:slug`. */
@Controller('blog')
export class BlogController {
  constructor(private readonly blogService: BlogService) {}

  @Get()
  findPublished() {
    return this.blogService.findPublished();
  }

  @Get('admin')
  @UseGuards(JwtAuthGuard)
  findAll() {
    return this.blogService.findAll();
  }

  @Get('id/:id')
  @UseGuards(JwtAuthGuard)
  findById(@Param('id') id: string) {
    return this.blogService.findById(id);
  }

  @Get(':slug')
  findBySlug(@Param('slug') slug: string) {
    return this.blogService.findBySlugPublic(slug);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() dto: SavePostDto) {
    return this.blogService.save(dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(@Param('id') id: string, @Body() dto: SavePostDto) {
    return this.blogService.save(dto, id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@Param('id') id: string) {
    return this.blogService.remove(id);
  }
}
