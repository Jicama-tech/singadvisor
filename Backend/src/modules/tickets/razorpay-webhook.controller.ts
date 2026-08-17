import { BadRequestException, Controller, Logger, Post, RawBodyRequest, Req } from '@nestjs/common';
import { Request } from 'express';
import { RazorpayService } from './razorpay.service';
import { TicketsService } from './tickets.service';

/**
 * Async fallback confirmation path — see the event-ops port plan's payment
 * hardening note. The client-confirm path (`POST /tickets`) is primary; this
 * exists only to catch the case where a customer paid but the browser never
 * made it back to call that endpoint (closed tab, network drop, etc). Needs
 * `RAZORPAY_WEBHOOK_SECRET` set to the value configured in the Razorpay
 * dashboard's webhook settings, and `main.ts`'s `rawBody: true` bootstrap
 * option so the raw bytes are available to verify the signature over —
 * verifying against the JSON-reparsed body would not reliably match.
 */
@Controller('payments/razorpay')
export class RazorpayWebhookController {
  private readonly logger = new Logger(RazorpayWebhookController.name);

  constructor(
    private readonly razorpay: RazorpayService,
    private readonly ticketsService: TicketsService,
  ) {}

  @Post('webhook')
  async handleWebhook(@Req() req: RawBodyRequest<Request>) {
    const signature = req.headers['x-razorpay-signature'];
    if (typeof signature !== 'string' || !req.rawBody) {
      throw new BadRequestException('Missing signature or body');
    }
    if (!(await this.razorpay.verifyWebhookSignature(req.rawBody, signature))) {
      throw new BadRequestException('Invalid webhook signature');
    }

    const event = req.body as {
      event?: string;
      payload?: { payment?: { entity?: { id: string; order_id: string; notes?: Record<string, string> } } };
    };

    if (event.event === 'payment.captured') {
      const payment = event.payload?.payment?.entity;
      if (payment) {
        await this.ticketsService
          .confirmFromWebhook(payment.order_id, payment.id, payment.notes ?? {})
          .catch((err) => {
            // Never surface this as a webhook failure — Razorpay retries on
            // non-2xx, and the client-confirm path is usually already ahead
            // of us here anyway (this is a fallback, not the primary path).
            this.logger.error(`Webhook confirm failed for order ${payment.order_id}: ${(err as Error).message}`);
          });
      }
    }

    return { received: true };
  }
}
