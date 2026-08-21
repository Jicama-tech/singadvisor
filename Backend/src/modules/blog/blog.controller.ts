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
import { BlogFeedbackService } from './blog-feedback.service';
import { SavePostDto } from './dto/save-post.dto';
import { GenerateBlogDto } from './dto/generate-blog.dto';
import { SubmitFeedbackDto } from './dto/submit-feedback.dto';

/** Route order matters: `admin`, `generate`, and `id/:id` come before
 * `:slug`, otherwise they'd be swallowed by the GET :slug catch-all. */
@Controller('blog')
export class BlogController {
  constructor(
    private readonly blogService: BlogService,
    private readonly feedbackService: BlogFeedbackService,
  ) {}

  @Get()
  findPublished() {
    return this.blogService.findPublished();
  }

  @Get('admin')
  @UseGuards(JwtAuthGuard)
  findAll() {
    return this.blogService.findAll();
  }

  /** "Generate with AI" — draft-only, never touches the database. */
  @Post('generate')
  @UseGuards(JwtAuthGuard)
  generate(@Body() dto: GenerateBlogDto) {
    return this.blogService.generatePreview(dto);
  }

  @Get('id/:id')
  @UseGuards(JwtAuthGuard)
  findById(@Param('id') id: string) {
    return this.blogService.findById(id);
  }

  /** Admin: full feedback detail (email included) for the Blog editor's
   * feedback panel. */
  @Get('id/:id/feedback')
  @UseGuards(JwtAuthGuard)
  listFeedback(@Param('id') id: string) {
    return this.feedbackService.findAllByPostId(id);
  }

  /** Admin: approve/unapprove one feedback entry for public display. */
  @Patch('id/:id/feedback/:feedbackId')
  @UseGuards(JwtAuthGuard)
  setFeedbackFeatured(
    @Param('feedbackId') feedbackId: string,
    @Body('featured') featured: boolean,
  ) {
    return this.feedbackService.setFeatured(feedbackId, featured);
  }

  @Get(':slug')
  findBySlug(@Param('slug') slug: string) {
    return this.blogService.findBySlugPublic(slug);
  }

  /** Public: only admin-approved entries — no reader email/Google id. */
  @Get(':slug/feedback')
  listPublicFeedback(@Param('slug') slug: string) {
    return this.feedbackService.findPublicFeaturedBySlug(slug);
  }

  /** Public: submit (or update) this reader's own feedback — requires a
   * verified Google sign-in, see BlogFeedbackService. */
  @Post(':slug/feedback')
  submitFeedback(@Param('slug') slug: string, @Body() dto: SubmitFeedbackDto) {
    return this.feedbackService.submitFeedback(slug, dto);
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
