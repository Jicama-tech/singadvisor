import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { LandingService } from './landing.service';
import { LandingSectionKey } from './entities/landing-section.entity';
import { UpdateHeroSectionDto } from './dto/update-hero-section.dto';
import { UpdateStatsSectionDto } from './dto/update-stats-section.dto';
import { UpdatePillarsSectionDto } from './dto/update-pillars-section.dto';
import { UpdateConsultancySectionDto } from './dto/update-consultancy-section.dto';
import { UpdateCtaSectionDto } from './dto/update-cta-section.dto';
import { UpdateListSectionDto } from './dto/update-list-section.dto';
import { SetVisibilityDto } from './dto/set-visibility.dto';
import { MoveSectionDto } from './dto/move-section.dto';
import { SetVariantDto } from './dto/set-variant.dto';

/**
 * Content editing here requires only a signed-in admin session — same
 * permission level as Trainings/Events/etc. today. Unlike /admin (account
 * management), this is deliberately NOT owner-only.
 */
@Controller('landing/sections')
export class LandingController {
  constructor(private readonly landingService: LandingService) {}

  /** Public — this is what the homepage itself fetches. */
  @Get()
  findAllPublic() {
    return this.landingService.findAllPublic();
  }

  @Get('all')
  @UseGuards(JwtAuthGuard)
  findAllForAdmin() {
    return this.landingService.findAllForAdmin();
  }

  @Get(':key')
  @UseGuards(JwtAuthGuard)
  findOne(@Param('key') key: LandingSectionKey) {
    return this.landingService.findOneForAdmin(key);
  }

  @Patch('hero')
  @UseGuards(JwtAuthGuard)
  updateHero(@Body() dto: UpdateHeroSectionDto) {
    return this.landingService.updateContent('hero', dto);
  }

  @Patch('stats')
  @UseGuards(JwtAuthGuard)
  updateStats(@Body() dto: UpdateStatsSectionDto) {
    return this.landingService.updateContent('stats', dto);
  }

  @Patch('pillars')
  @UseGuards(JwtAuthGuard)
  updatePillars(@Body() dto: UpdatePillarsSectionDto) {
    return this.landingService.updateContent('pillars', dto);
  }

  @Patch('consultancy')
  @UseGuards(JwtAuthGuard)
  updateConsultancy(@Body() dto: UpdateConsultancySectionDto) {
    return this.landingService.updateContent('consultancy', dto);
  }

  @Patch('cta')
  @UseGuards(JwtAuthGuard)
  updateCta(@Body() dto: UpdateCtaSectionDto) {
    return this.landingService.updateContent('cta', dto);
  }

  @Patch('trainings')
  @UseGuards(JwtAuthGuard)
  updateTrainingsList(@Body() dto: UpdateListSectionDto) {
    return this.landingService.updateContent('trainings', dto);
  }

  @Patch('events')
  @UseGuards(JwtAuthGuard)
  updateEventsList(@Body() dto: UpdateListSectionDto) {
    return this.landingService.updateContent('events', dto);
  }

  @Patch('careers')
  @UseGuards(JwtAuthGuard)
  updateCareersList(@Body() dto: UpdateListSectionDto) {
    return this.landingService.updateContent('careers', dto);
  }

  @Patch('blog')
  @UseGuards(JwtAuthGuard)
  updateBlogList(@Body() dto: UpdateListSectionDto) {
    return this.landingService.updateContent('blog', dto);
  }

  @Patch(':key/visibility')
  @UseGuards(JwtAuthGuard)
  setVisibility(@Param('key') key: LandingSectionKey, @Body() dto: SetVisibilityDto) {
    return this.landingService.setVisibility(key, dto.visible);
  }

  @Patch(':key/move')
  @UseGuards(JwtAuthGuard)
  move(@Param('key') key: LandingSectionKey, @Body() dto: MoveSectionDto) {
    return this.landingService.move(key, dto.direction);
  }

  @Patch(':key/variant')
  @UseGuards(JwtAuthGuard)
  setVariant(@Param('key') key: LandingSectionKey, @Body() dto: SetVariantDto) {
    return this.landingService.setVariant(key, dto.variant);
  }
}
