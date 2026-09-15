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
import { MemberViewDto } from '../../common/dto/member-view.dto';
import { MembershipsService } from '../memberships/memberships.service';

/** Route order matters: `admin` comes before `:slug`, otherwise it would be
 * swallowed by the GET :slug catch-all — same discipline as BlogController. */
@Controller('newsletter')
export class NewsletterController {
  constructor(
    private readonly newsletterService: NewsletterService,
    private readonly memberships: MembershipsService,
  ) {}

  /**
   * The member's view of an issue. A POST because the credential travels in
   * a body and a GET has none — not because anything is written.
   *
   * A non-member gets exactly what the public GET gives: the headings and
   * images with the words withheld, so the locked page has something to
   * show rather than an error.
   */
  @Post(':slug/members')
  findBySlugForMember(@Param('slug') slug: string, @Body() dto: MemberViewDto) {
    return this.memberships
      .viewerFor(dto.credential)
      .then((viewer) => this.newsletterService.findBySlugPublic(slug, viewer));
  }

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
