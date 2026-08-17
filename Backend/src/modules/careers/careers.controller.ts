import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Response } from 'express';
import { readFileSync, statSync } from 'fs';
import { basename, extname, join } from 'path';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import {
  CareersService,
  RESUME_CONTENT_TYPES,
  RESUME_DIR,
} from './careers.service';
import { SaveJobDto } from './dto/save-job.dto';
import { SaveApplicationDto } from './dto/save-application.dto';
import { UpdateApplicationStatusDto } from './dto/update-application-status.dto';

const RESUME_MAX_BYTES = 5 * 1024 * 1024;
const RESUME_ACCEPTED_TYPES =
  /^(application\/pdf|application\/msword|application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document)$/;
const RESUME_ACCEPTED_EXTENSIONS = /\.(pdf|doc|docx)$/i;

/** Stored filenames are always `<uuid><ext>` — we generate them, never
 * trusting the uploader's name. Anything else is rejected before touching
 * the disk, which makes path traversal structurally impossible. */
const SAFE_NAME = /^[0-9a-f-]{36}\.(pdf|doc|docx)$/i;

/** Route order matters: `admin` and `id/:id` come before `:slug`. */
@Controller('careers/jobs')
export class CareersJobsController {
  constructor(private readonly service: CareersService) {}

  @Get()
  findPublished() {
    return this.service.findPublished();
  }

  @Get('admin')
  @UseGuards(JwtAuthGuard)
  findAll() {
    return this.service.findAll();
  }

  @Get('id/:id')
  @UseGuards(JwtAuthGuard)
  findById(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Get(':slug')
  findBySlug(@Param('slug') slug: string) {
    return this.service.findBySlugPublic(slug);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() dto: SaveJobDto) {
    return this.service.save(dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(@Param('id') id: string, @Body() dto: SaveJobDto) {
    return this.service.save(dto, id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

  /**
   * Public — no session, exactly like the old `submitApplication` server
   * action. `memoryStorage` + a 5MB limit means the résumé is validated (and
   * the application accepted) BEFORE anything is written to disk; the
   * service performs the write only once every check passes.
   */
  @Post(':jobId/applications')
  @UseInterceptors(
    FileInterceptor('resume', {
      storage: memoryStorage(),
      limits: { fileSize: RESUME_MAX_BYTES },
      fileFilter: (_req, file, cb) => {
        const ext = extname(file.originalname).toLowerCase();
        if (
          !RESUME_ACCEPTED_TYPES.test(file.mimetype) ||
          !RESUME_ACCEPTED_EXTENSIONS.test(ext)
        ) {
          cb(new BadRequestException('Please upload a PDF, DOC or DOCX file.'), false);
          return;
        }
        cb(null, true);
      },
    }),
  )
  createApplication(
    @Param('jobId') jobId: string,
    @Body() dto: SaveApplicationDto,
    @UploadedFile() resume?: Express.Multer.File,
  ) {
    return this.service.createApplication(jobId, dto, resume);
  }
}

@Controller('careers/applications')
export class CareersApplicationsController {
  constructor(private readonly service: CareersService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  list() {
    return this.service.findApplications();
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard)
  updateStatus(@Param('id') id: string, @Body() dto: UpdateApplicationStatusDto) {
    return this.service.updateApplicationStatus(id, dto.status);
  }

  /**
   * Streams a candidate résumé to a signed-in admin. Résumés are personal
   * data stored outside the statically-served `uploads/` tree, so this is
   * the only way to read one — and it re-checks the session itself rather
   * than assuming any middleware ran (direct port of the old Next route
   * handler's discipline).
   */
  @Get(':id/resume')
  @UseGuards(JwtAuthGuard)
  async streamResume(@Param('id') id: string, @Res() res: Response) {
    // `@Res()` takes over response handling, so nothing is thrown — every
    // branch ends in an explicit res call, including the not-found paths.
    try {
      const doc = await this.service.findApplicationById(id);
      if (!doc || !doc.resumePath || !SAFE_NAME.test(doc.resumePath)) {
        res.status(404).send('Not found');
        return;
      }
      const absolute = join(RESUME_DIR, basename(doc.resumePath));
      let data: Buffer;
      try {
        statSync(absolute);
        data = readFileSync(absolute);
      } catch {
        res.status(404).send('Not found');
        return;
      }
      const ext = extname(absolute).toLowerCase();
      const downloadName = (doc.resumeName ?? basename(absolute))
        .replace(/["\\\r\n]/g, '')
        .slice(0, 200);
      res.set({
        'Content-Type': RESUME_CONTENT_TYPES[ext] ?? 'application/octet-stream',
        'Content-Disposition': `inline; filename="${downloadName}"`,
        'Content-Length': String(data.byteLength),
        // Personal data: never cached by a proxy or indexed.
        'Cache-Control': 'private, no-store',
        'X-Robots-Tag': 'noindex, nofollow',
        'X-Content-Type-Options': 'nosniff',
      });
      res.send(data);
    } catch {
      res.status(404).send('Not found');
    }
  }
}
