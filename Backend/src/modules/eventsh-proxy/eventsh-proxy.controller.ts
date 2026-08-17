import {
  All,
  BadGatewayException,
  Controller,
  Post,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Request, Response } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

/**
 * Transparent forwarder to the dedicated eventsh instance, so the browser
 * SPA never has to hold eventsh's organizer API key (a secret that lived in
 * server-only env vars when the Next app called eventsh directly). Every
 * route here is JWT-guarded — the SPA authenticates with its normal session
 * token — and the upstream status code + body pass through verbatim, so the
 * SPA's existing error handling (EventsServiceError with status) works
 * unchanged.
 *
 * The catch-all below forwards any method/path/JSON body. The one exception
 * is multipart uploads: express parses JSON bodies before the handler runs
 * but leaves multipart alone, so a dedicated route with memoryStorage
 * re-wraps the file into a fresh FormData server-side instead of trying to
 * stream an unparsed body through fetch.
 */
@Controller('eventsh')
@UseGuards(JwtAuthGuard)
export class EventshProxyController {
  private config() {
    const url = process.env.EVENTSH_BACKEND_URL;
    const organizerId = process.env.EVENTSH_ORGANIZER_ID;
    const apiKey = process.env.EVENTSH_API_KEY;
    if (!url || !organizerId || !apiKey) {
      throw new BadGatewayException(
        'EVENTSH_BACKEND_URL / EVENTSH_ORGANIZER_ID / EVENTSH_API_KEY are not configured on the Backend.',
      );
    }
    return { url, organizerId, apiKey };
  }

  /** Multipart passthrough — declared before the catch-all so it wins. */
  @Post('uploads/events')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 50 * 1024 * 1024 },
    }),
  )
  async forwardUpload(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Res() res: Response,
  ) {
    const { url, organizerId, apiKey } = this.config();
    if (!file) {
      res.status(400).json({ message: 'No file uploaded' });
      return;
    }

    const body = new FormData();
    body.append('file', new Blob([file.buffer], { type: file.mimetype }), file.originalname);

    let upstream: Response;
    try {
      upstream = await fetch(`${url}/uploads/events`, {
        method: 'POST',
        headers: { 'x-organizer-id': organizerId, 'x-api-key': apiKey },
        body,
      });
    } catch (cause) {
      throw new BadGatewayException(`eventsh is unreachable: ${(cause as Error).message}`);
    }

    const data = Buffer.from(await upstream.arrayBuffer());
    res.status(upstream.status);
    res.set('Content-Type', upstream.headers.get('content-type') ?? 'application/json');
    res.send(data);
  }

  /** Everything else — same method, same path suffix, JSON body passthrough. */
  @All('*')
  async forward(@Req() req: Request, @Res() res: Response) {
    const { url, organizerId, apiKey } = this.config();

    const suffix = req.originalUrl.replace(/^\/eventsh/, '') || '/';

    const hasBody =
      req.body !== undefined &&
      req.body !== null &&
      typeof req.body === 'object' &&
      Object.keys(req.body).length > 0;

    let upstream: Response;
    try {
      upstream = await fetch(`${url}${suffix}`, {
        method: req.method,
        headers: {
          'x-organizer-id': organizerId,
          'x-api-key': apiKey,
          ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
        },
        ...(hasBody ? { body: JSON.stringify(req.body) } : {}),
      });
    } catch (cause) {
      throw new BadGatewayException(`eventsh is unreachable: ${(cause as Error).message}`);
    }

    const data = Buffer.from(await upstream.arrayBuffer());
    res.status(upstream.status);
    res.set('Content-Type', upstream.headers.get('content-type') ?? 'application/json');
    res.send(data);
  }
}
