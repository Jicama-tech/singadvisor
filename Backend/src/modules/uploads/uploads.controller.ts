import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { randomUUID } from 'crypto';
import { extname, join } from 'path';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

// Images for section copy (posters, banners) plus short video for the hero
// background — same allow-list shape as eventsh-v1's banner upload, with
// video added since SingAdvisor's hero has one.
const ALLOWED_MIME = /^(image\/(jpeg|png|webp|gif)|video\/(mp4|webm))$/;
const MAX_SIZE_BYTES = 50 * 1024 * 1024; // 50MB — generous for a short hero clip

// Event cover/gallery photos — images only, no video (unlike the hero).
const ALLOWED_IMAGE_MIME = /^image\/(jpeg|png|webp|gif)$/;

// Course content: images and short lesson video, plus PDF handouts. Same
// 50MB cap as `landing`. NOTE: everything under uploads/ is served by
// useStaticAssets with NO guard (main.ts), so this is fine for a marketing
// preview and wrong for gated paid video — the editor says so in a hint, and
// the real fix is the guarded RESUME_DIR + streamed-response pattern.
const ALLOWED_COURSE_MIME =
  /^(image\/(jpeg|png|webp|gif)|video\/(mp4|webm)|application\/pdf)$/;

@Controller('uploads')
export class UploadsController {
  /**
   * Stores under Backend/uploads/landing/, filename is always
   * `<uuid><ext>` — never the uploader's original filename, so path
   * traversal ("../../etc/passwd") is structurally impossible, same
   * discipline as the Frontend's own résumé upload (src/lib/uploads.ts).
   */
  @Post('landing')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: join(process.cwd(), 'uploads', 'landing'),
        filename: (_req, file, cb) => {
          cb(null, `${randomUUID()}${extname(file.originalname).toLowerCase()}`);
        },
      }),
      limits: { fileSize: MAX_SIZE_BYTES },
      fileFilter: (_req, file, cb) => {
        if (!ALLOWED_MIME.test(file.mimetype)) {
          cb(new BadRequestException('Only JPEG/PNG/WebP/GIF images or MP4/WebM video are allowed'), false);
          return;
        }
        cb(null, true);
      },
    }),
  )
  upload(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file uploaded');
    return { url: `/uploads/landing/${file.filename}` };
  }

  /** Cover image / gallery photos for events — same discipline as `landing`
   * above (uuid filename, no trusting the client's own filename). */
  @Post('events')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: join(process.cwd(), 'uploads', 'events'),
        filename: (_req, file, cb) => {
          cb(null, `${randomUUID()}${extname(file.originalname).toLowerCase()}`);
        },
      }),
      limits: { fileSize: MAX_SIZE_BYTES },
      fileFilter: (_req, file, cb) => {
        if (!ALLOWED_IMAGE_MIME.test(file.mimetype)) {
          cb(new BadRequestException('Only JPEG/PNG/WebP/GIF images are allowed'), false);
          return;
        }
        cb(null, true);
      },
    }),
  )
  uploadEventImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file uploaded');
    return { url: `/uploads/events/${file.filename}` };
  }

  /** Cover images for trainings/services/jobs/blog posts — guarded, images
   * only. The current admin forms for these domains use plain URL text
   * inputs, but this route exists so the SPA port can adopt real
   * cropped-upload widgets (CroppedImageField) without inventing a fourth
   * one-off upload path when it does. */
  @Post('content')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: join(process.cwd(), 'uploads', 'content'),
        filename: (_req, file, cb) => {
          cb(null, `${randomUUID()}${extname(file.originalname).toLowerCase()}`);
        },
      }),
      limits: { fileSize: MAX_SIZE_BYTES },
      fileFilter: (_req, file, cb) => {
        if (!ALLOWED_IMAGE_MIME.test(file.mimetype)) {
          cb(new BadRequestException('Only JPEG/PNG/WebP/GIF images are allowed'), false);
          return;
        }
        cb(null, true);
      },
    }),
  )
  uploadContentImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file uploaded');
    return { url: `/uploads/content/${file.filename}` };
  }

  /** The one image allowed per newsletter — same discipline as `content`
   * above (uuid filename, images only). */
  @Post('newsletters')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: join(process.cwd(), 'uploads', 'newsletters'),
        filename: (_req, file, cb) => {
          cb(null, `${randomUUID()}${extname(file.originalname).toLowerCase()}`);
        },
      }),
      limits: { fileSize: MAX_SIZE_BYTES },
      fileFilter: (_req, file, cb) => {
        if (!ALLOWED_IMAGE_MIME.test(file.mimetype)) {
          cb(new BadRequestException('Only JPEG/PNG/WebP/GIF images are allowed'), false);
          return;
        }
        cb(null, true);
      },
    }),
  )
  uploadNewsletterImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file uploaded');
    return { url: `/uploads/newsletters/${file.filename}` };
  }

  /** Lesson media for the course-content builder — video, images and PDF
   * handouts, guarded and uuid-named like `content` above. Wider allow-list
   * than the other content routes because an item's payload is a video as
   * often as it is a picture, and an attachment is usually a PDF. */
  @Post('course-media')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: join(process.cwd(), 'uploads', 'course-media'),
        filename: (_req, file, cb) => {
          cb(null, `${randomUUID()}${extname(file.originalname).toLowerCase()}`);
        },
      }),
      limits: { fileSize: MAX_SIZE_BYTES },
      fileFilter: (_req, file, cb) => {
        if (!ALLOWED_COURSE_MIME.test(file.mimetype)) {
          cb(
            new BadRequestException(
              'Only JPEG/PNG/WebP/GIF images, MP4/WebM video or PDF files are allowed',
            ),
            false,
          );
          return;
        }
        cb(null, true);
      },
    }),
  )
  uploadCourseMedia(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file uploaded');
    return { url: `/uploads/course-media/${file.filename}` };
  }

  /**
   * Sponsor logos and payment-proof screenshots — deliberately PUBLIC, no
   * guard. Unlike `landing`/`events` above, the uploader here is an
   * unauthenticated business applying to sponsor an event, not an admin —
   * matches eventsh-v1's own `apply`/`payment-submit` routes, which accept
   * multipart uploads with no auth for the same reason.
   */
  @Post('sponsors')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: join(process.cwd(), 'uploads', 'sponsors'),
        filename: (_req, file, cb) => {
          cb(null, `${randomUUID()}${extname(file.originalname).toLowerCase()}`);
        },
      }),
      limits: { fileSize: MAX_SIZE_BYTES },
      fileFilter: (_req, file, cb) => {
        if (!ALLOWED_IMAGE_MIME.test(file.mimetype)) {
          cb(new BadRequestException('Only JPEG/PNG/WebP/GIF images are allowed'), false);
          return;
        }
        cb(null, true);
      },
    }),
  )
  uploadSponsorFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file uploaded');
    return { url: `/uploads/sponsors/${file.filename}` };
  }
}
