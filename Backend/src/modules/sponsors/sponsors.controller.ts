import { Controller, Get, Param } from '@nestjs/common';
import { SponsorsService } from './sponsors.service';

/** Public reads that hang off an Event rather than a sponsor request —
 * tiers to show on the "Become a sponsor" section, and the confirmed-logo
 * strip. Kept separate from `SponsorRequestsController` below so the URL
 * shape matches the port plan's route table (`/sponsors/*` vs
 * `/sponsor-requests/*`). */
@Controller('sponsors')
export class SponsorsController {
  constructor(private readonly sponsorsService: SponsorsService) {}

  @Get('tiers/:eventId')
  tiers(@Param('eventId') eventId: string) {
    return this.sponsorsService.tiersForEvent(eventId);
  }

  @Get('confirmed-logos/:eventId')
  confirmedLogos(@Param('eventId') eventId: string) {
    return this.sponsorsService.confirmedLogos(eventId);
  }
}
