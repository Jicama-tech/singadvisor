import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { createHmac } from 'crypto';
import Razorpay from 'razorpay';
import { SettingsService } from '../settings/settings.service';
import { decryptSecret } from '../../common/secret-crypto.util';

/**
 * Thin wrapper around the Razorpay SDK, isolated so the rest of the tickets
 * flow never touches the SDK or the secret directly. Keys resolve from the
 * Settings module first (the admin Settings page), then fall back to the
 * RAZORPAY_* env vars — "Payments are not configured" only when BOTH are
 * absent.
 */
@Injectable()
export class RazorpayService {
  private client: Razorpay | null = null;

  constructor(private readonly settings: SettingsService) {}

  private async resolveKeys(): Promise<{ keyId: string; keySecret: string }> {
    const s = await this.settings.getForInternalUse();
    const keyId = s.razorpayKeyId || process.env.RAZORPAY_KEY_ID || '';
    const keySecret =
      decryptSecret(s.razorpayKeySecret) || process.env.RAZORPAY_KEY_SECRET || '';
    return { keyId, keySecret };
  }

  private async getClient(): Promise<Razorpay> {
    if (this.client) return this.client;
    const { keyId, keySecret } = await this.resolveKeys();
    if (!keyId || !keySecret) {
      throw new ServiceUnavailableException(
        'Payments are not configured — add Razorpay keys in Settings (or set RAZORPAY_KEY_ID/RAZORPAY_KEY_SECRET in Backend/.env).',
      );
    }
    this.client = new Razorpay({ key_id: keyId, key_secret: keySecret });
    return this.client;
  }

  /** Public key the Frontend needs to open Razorpay Checkout.js — never the secret. */
  async publicKeyId(): Promise<string> {
    const { keyId } = await this.resolveKeys();
    if (!keyId) throw new ServiceUnavailableException('Razorpay key id is not configured');
    return keyId;
  }

  /** `amountMinorUnits` — smallest currency unit (e.g. cents), matching Razorpay's own convention. */
  async createOrder(input: {
    amountMinorUnits: number;
    currency: string;
    receipt: string;
    notes?: Record<string, string>;
  }) {
    const client = await this.getClient();
    return client.orders.create({
      amount: input.amountMinorUnits,
      currency: input.currency,
      receipt: input.receipt,
      notes: input.notes,
    });
  }

  /** Client-confirm path: verifies the checkout-handler signature after payment. */
  async verifyPaymentSignature(input: {
    orderId: string;
    paymentId: string;
    signature: string;
  }): Promise<boolean> {
    const { keySecret } = await this.resolveKeys();
    if (!keySecret) throw new ServiceUnavailableException('Razorpay key secret is not configured');
    const expected = createHmac('sha256', keySecret)
      .update(`${input.orderId}|${input.paymentId}`)
      .digest('hex');
    return expected === input.signature;
  }

  /** Webhook path: verifies the `X-Razorpay-Signature` header over the raw request body. */
  async verifyWebhookSignature(rawBody: Buffer, signature: string): Promise<boolean> {
    const s = await this.settings.getForInternalUse();
    const secret = decryptSecret(s.razorpayWebhookSecret) || process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!secret) throw new ServiceUnavailableException('Razorpay webhook secret is not configured');
    const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
    return expected === signature;
  }
}
