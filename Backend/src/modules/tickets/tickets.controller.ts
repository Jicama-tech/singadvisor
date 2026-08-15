import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TicketsService } from './tickets.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { ConfirmTicketDto } from './dto/confirm-ticket.dto';
import { ClaimFreeTicketDto } from './dto/claim-free-ticket.dto';
import { SetTicketStatusDto } from './dto/set-ticket-status.dto';

@Controller('tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  /** Step 1 of checkout — public, opens a Razorpay order for the Frontend to pay against. */
  @Post('checkout/order')
  createOrder(@Body() dto: CreateOrderDto) {
    return this.ticketsService.createOrder(dto);
  }

  /** Step 2 — public, but the payment signature is independently re-verified
   * server-side before any Ticket is ever written (see TicketsService). */
  @Post()
  confirm(@Body() dto: ConfirmTicketDto) {
    return this.ticketsService.confirmTicket(dto);
  }

  /** Free tiers only — bypasses Razorpay entirely (see TicketsService for why). */
  @Post('free')
  claimFree(@Body() dto: ClaimFreeTicketDto) {
    return this.ticketsService.claimFreeTicket(dto);
  }

  @Get('admin')
  @UseGuards(JwtAuthGuard)
  findAllForAdmin(@Query('eventId') eventId?: string) {
    return this.ticketsService.findAllForAdmin(eventId);
  }

  /** Door/QR-scan lookup — public by design, same as eventsh-v1 (the QR
   * payload itself is the secret, not the lookup endpoint). */
  @Get('verify/:ticketId')
  verify(@Param('ticketId') ticketId: string) {
    return this.ticketsService.findByTicketId(ticketId);
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.ticketsService.findById(id);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard)
  setStatus(@Param('id') id: string, @Body() dto: SetTicketStatusDto) {
    return this.ticketsService.setStatus(id, dto.status);
  }

  @Post(':id/resend-email')
  @UseGuards(JwtAuthGuard)
  resendEmail(@Param('id') id: string) {
    return this.ticketsService.resendEmail(id);
  }
}
