import {
  BadGatewayException,
  BadRequestException,
  Controller,
  Get,
  Param,
  Res,
} from '@nestjs/common';
import { Response as ExpressResponse } from 'express';

/**
 * Public (unauthenticated) forwarder for eventsh's organizer-scoped read
 * routes — the SPA's public pages (event listings/detail) call these from
 * the browser, and the dedicated eventsh instance does not send permissive
 * CORS headers, so calling eventsh directly fails cross-origin. Routing
 * through the Backend keeps every fetch same-origin and needs zero CORS
 * configuration anywhere.
 *
 * Deliberately NOT the catch-all `/eventsh/*` proxy (that one is
 * JWT-guarded and attaches the organizer API key): this is a plain GET
 * forwarder, locked to the two public read paths and the configured
 * organizer id only — an arbitrary path or organizer id is rejected, so the
 * Backend cannot be used as a general eventsh scanner.
 *
 * Image files are NOT forwarded here — public pages render event images
 * through plain <img> tags, which are not subject to CORS at all, and keep
 * loading straight from the eventsh origin (media-url.ts).
 */
@Controller('eventsh-public')
export class EventshPublicController {
  private config() {
    const url = process.env.EVENTSH_BACKEND_URL;
    const organizerId = process.env.EVENTSH_ORGANIZER_ID;
    if (!url || !organizerId) {
      throw new BadGatewayException(
        'EVENTSH_BACKEND_URL / EVENTSH_ORGANIZER_ID are not configured on the Backend.',
      );
    }
    return { url, organizerId };
  }

  private async forward(path: string, res: ExpressResponse) {
    const { url } = this.config();
    let upstream: Awaited<ReturnType<typeof fetch>>;
    try {
      upstream = await fetch(`${url}${path}`);
    } catch (cause) {
      throw new BadGatewayException(`eventsh is unreachable: ${(cause as Error).message}`);
    }
    const data = Buffer.from(await upstream.arrayBuffer());
    res.status(upstream.status);
    res.set('Content-Type', upstream.headers.get('content-type') ?? 'application/json');
    res.send(data);
  }

  @Get('events/organizer/:organizerId')
  list(@Param('organizerId') organizerId: string, @Res() res: ExpressResponse) {
    const { organizerId: configured } = this.config();
    if (organizerId !== configured) {
      throw new BadRequestException('Unknown organizer.');
    }
    // publicOnly=true is load-bearing: the public listing page must never
    // see drafts — eventsh's organizer list returns everything when the
    // query param is absent.
    return this.forward(`/events/organizer/${organizerId}?publicOnly=true`, res);
  }

  @Get('events/organizer/:organizerId/slug/:slug')
  bySlug(
    @Param('organizerId') organizerId: string,
    @Param('slug') slug: string,
    @Res() res: ExpressResponse,
  ) {
    const { organizerId: configured } = this.config();
    if (organizerId !== configured) {
      throw new BadRequestException('Unknown organizer.');
    }
    return this.forward(
      `/events/organizer/${organizerId}/slug/${encodeURIComponent(slug)}`,
      res,
    );
  }
}
