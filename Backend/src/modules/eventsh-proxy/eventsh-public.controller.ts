import {
  BadGatewayException,
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Res,
} from '@nestjs/common';
import { Response as ExpressResponse } from 'express';

/** eventsh ids are Mongo ObjectIds. Checked before anything is forwarded so a
 * junk path segment is rejected here rather than becoming an upstream 500. */
const OBJECT_ID = /^[0-9a-fA-F]{24}$/;

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

  private async forward(
    path: string,
    res: ExpressResponse,
    init?: { method: string; body?: unknown },
  ) {
    const { url } = this.config();
    let upstream: Awaited<ReturnType<typeof fetch>>;
    try {
      upstream = await fetch(`${url}${path}`, {
        method: init?.method ?? 'GET',
        ...(init?.body === undefined
          ? {}
          : {
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(init.body),
            }),
      });
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

  // -------------------------------------------------------------------------
  // Scheduled-space (court/facility slot) booking.
  //
  // eventsh owns this flow end to end — a ScheduledSpaceRequest collection,
  // slot-availability tokens on the event, an organizer status workflow. The
  // events themselves already live there, so bookings are forwarded rather
  // than reimplemented against a second store that would immediately disagree
  // with the first.
  //
  // Unauthenticated by design, exactly like eventsh's own buyer-facing routes
  // and like the ticket purchase this Backend already forwards: a visitor
  // booking a badminton court has no account. The protections are that only
  // these four paths are reachable, ids are shape-checked, and `organizerId`
  // is set from configuration rather than the request body — without that
  // last one this endpoint would let anyone file requests against any
  // organizer on the eventsh instance.
  // -------------------------------------------------------------------------

  /** Which spaces exist and which of their slots are already taken. Every
   * slot comes back with an `isBooked` flag (eventsh derives it from the
   * event's own booked-slot tokens). */
  @Get('scheduled-spaces/available/:eventId')
  availableSpaces(@Param('eventId') eventId: string, @Res() res: ExpressResponse) {
    if (!OBJECT_ID.test(eventId)) throw new BadRequestException('Invalid event id.');
    return this.forward(`/scheduled-spaces/available/${eventId}`, res);
  }

  /** Has this email already booked for this event? Lets the page say so
   * instead of surfacing eventsh's 409 as a failure. */
  @Get('scheduled-spaces/check-request/:eventId/:email')
  checkRequest(
    @Param('eventId') eventId: string,
    @Param('email') email: string,
    @Res() res: ExpressResponse,
  ) {
    if (!OBJECT_ID.test(eventId)) throw new BadRequestException('Invalid event id.');
    return this.forward(
      `/scheduled-spaces/check-request/${eventId}/${encodeURIComponent(email)}`,
      res,
    );
  }

  /** Step 1 — create the booking request. `organizerId` is overwritten with
   * the configured one; whatever the client sent is ignored. */
  @Post('scheduled-spaces/register')
  register(@Body() body: Record<string, unknown>, @Res() res: ExpressResponse) {
    const { organizerId } = this.config();
    const eventId = String(body?.eventId ?? '');
    if (!OBJECT_ID.test(eventId)) throw new BadRequestException('Invalid event id.');
    return this.forward('/scheduled-spaces/register', res, {
      method: 'POST',
      body: { ...body, eventId, organizerId },
    });
  }

  /** Step 2 — attach the chosen slots to that request. eventsh re-resolves
   * every slot against the event's own placed spaces, so price, name and
   * times are never taken from the browser. */
  @Patch('scheduled-spaces/:requestId/select-slots')
  selectSlots(
    @Param('requestId') requestId: string,
    @Body() body: Record<string, unknown>,
    @Res() res: ExpressResponse,
  ) {
    if (!OBJECT_ID.test(requestId)) throw new BadRequestException('Invalid request id.');
    return this.forward(`/scheduled-spaces/${requestId}/select-slots`, res, {
      method: 'PATCH',
      body,
    });
  }
}
