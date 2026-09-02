import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { SpaceBookingsService } from './space-bookings.service';
import { QuoteSpaceBookingDto } from './dto/quote-space-booking.dto';
import { ConfirmSpaceBookingDto } from './dto/confirm-space-booking.dto';

/**
 * Booking a space/court slot from the public event page.
 *
 * The two write routes are unauthenticated by design — someone booking a
 * badminton court has no account, exactly like the ticket purchase this
 * Backend already exposes. Nothing about the price is taken from the browser:
 * `quote` resolves every slot and its price against the event itself.
 */
@Controller('space-bookings')
export class SpaceBookingsController {
  constructor(private readonly service: SpaceBookingsService) {}

  /** Step 1 — price the selection and, if it costs anything, return a PayNow
   * QR built from the UEN in Settings. */
  @Post('quote')
  quote(@Body() dto: QuoteSpaceBookingDto) {
    return this.service.quote(dto);
  }

  /** Step 2 — after paying, hold the slots in eventsh and record the payer. */
  @Post('confirm')
  confirm(@Body() dto: ConfirmSpaceBookingDto) {
    return this.service.confirm(dto);
  }

  /** Admin: what has been booked and paid, for reconciling against the bank. */
  @Get()
  @UseGuards(JwtAuthGuard)
  findAll() {
    return this.service.findAll();
  }
}
