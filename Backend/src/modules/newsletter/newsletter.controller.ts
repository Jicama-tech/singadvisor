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
import { NewsletterService } from './newsletter.service';
import { SaveNewsletterDto } from './dto/save-newsletter.dto';

/** Route order matters: `admin` comes before `:slug`, otherwise it would be
 * swallowed by the GET :slug catch-all — same discipline as BlogController. */
@Controller('newsletter')
export class NewsletterController {
  constructor(private readonly newsletterService: NewsletterService) {}

  @Get()
  findPublished() {
    return this.newsletterService.findPublished();
  }

  @Get('admin')
  @UseGuards(JwtAuthGuard)
  findAll() {
    return this.newsletterService.findAll();
  }

  @Get('admin/:id')
  @UseGuards(JwtAuthGuard)
  findById(@Param('id') id: string) {
    return this.newsletterService.findById(id);
  }

  @Get(':slug')
  findBySlug(@Param('slug') slug: string) {
    return this.newsletterService.findBySlugPublic(slug);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() dto: SaveNewsletterDto) {
    return this.newsletterService.save(dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(@Param('id') id: string, @Body() dto: SaveNewsletterDto) {
    return this.newsletterService.save(dto, id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@Param('id') id: string) {
    return this.newsletterService.remove(id);
  }
}
