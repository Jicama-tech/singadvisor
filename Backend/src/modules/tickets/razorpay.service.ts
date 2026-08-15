import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { createHmac } from 'crypto';
import Razorpay from 'razorpay';

/**
 * Thin wrapper around the Razorpay SDK, isolated so the rest of the tickets
 * flow never touches the SDK or the secret directly. `RAZORPAY_KEY_ID`/
 * `RAZORPAY_KEY_SECRET` are unset by default in this repo (see the
 * event-ops port plan) — every method here throws a clear, immediate error
 * rather than the SDK's own opaque failure once real checkout is attempted,
 * so "why did this fail" is obvious in the Backend logs during setup.
 */
@Injectable()
export class RazorpayService {
  private client: Razorpay | null = null;

  private getClient(): Razorpay {
    if (this.client) return this.client;
    const key_id = process.env.RAZORPAY_KEY_ID;
    const key_secret = process.env.RAZORPAY_KEY_SECRET;
    if (!key_id || !key_secret) {
      throw new ServiceUnavailableException(
        'Payments are not configured — set RAZORPAY_KEY_ID/RAZORPAY_KEY_SECRET in Backend/.env (test-mode keys from https://dashboard.razorpay.com/app/keys are fine to start).',
      );
    }
    this.client = new Razorpay({ key_id, key_secret });
    return this.client;
  }

  /** Public key the Frontend needs to open Razorpay Checkout.js — never the secret. */
  get publicKeyId(): string {
    const key_id = process.env.RAZORPAY_KEY_ID;
    if (!key_id) throw new ServiceUnavailableException('RAZORPAY_KEY_ID is not set in Backend/.env');
    return key_id;
  }

  /** `amountMinorUnits` — smallest currency unit (e.g. cents), matching Razorpay's own convention. */
  async createOrder(input: {
    amountMinorUnits: number;
    currency: string;
    receipt: string;
    notes?: Record<string, string>;
  }) {
    return this.getClient().orders.create({
      amount: input.amountMinorUnits,
      currency: input.currency,
      receipt: input.receipt,
      notes: input.notes,
    });
  }

  /** Client-confirm path: verifies the checkout-handler signature after payment. */
  verifyPaymentSignature(input: {
    orderId: string;
    paymentId: string;
    signature: string;
  }): boolean {
    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!secret) throw new ServiceUnavailableException('RAZORPAY_KEY_SECRET is not set in Backend/.env');
    const expected = createHmac('sha256', secret)
      .update(`${input.orderId}|${input.paymentId}`)
      .digest('hex');
    return expected === input.signature;
  }

  /** Webhook path: verifies the `X-Razorpay-Signature` header over the raw request body. */
  verifyWebhookSignature(rawBody: Buffer, signature: string): boolean {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!secret) throw new ServiceUnavailableException('RAZORPAY_WEBHOOK_SECRET is not set in Backend/.env');
    const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
    return expected === signature;
  }
}
