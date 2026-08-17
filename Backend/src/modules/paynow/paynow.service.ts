import { BadRequestException, Injectable } from '@nestjs/common';
import * as QRCode from 'qrcode';
import * as crc from 'crc';
import { SettingsService } from '../settings/settings.service';

/**
 * Singapore PayNow dynamic-QR generator — a port of eventsh-v1's
 * payments.service.ts buildPayload() (EMVCo TLV + CRC16), reduced to what
 * SingAdvisor needs: PAYNOW scheme only, payee from the Settings module
 * (UEN preferred, +65 mobile fallback), amount embedded and non-editable.
 *
 * The QR payload is fully standard: any Singapore banking app scans it and
 * pre-fills payee + amount + reference. Verification is trust-based (the
 * buyer clicks "I have paid") — the same model eventsh itself uses; there
 * is no PayNow callback API to listen to.
 */
@Injectable()
export class PaynowService {
  constructor(private readonly settings: SettingsService) {}

  private tlv(id: string, value: string): string {
    const len = value.length.toString().padStart(2, '0');
    return `${id}${len}${value}`;
  }

  private calculateCRC(payload: string): string {
    const data = Buffer.from(payload, 'utf-8');
    const crcValue = crc.crc16ccitt(data, 0xffff);
    return crcValue.toString(16).toUpperCase().padStart(4, '0');
  }

  private currencyCode(currency: string): string {
    const map: Record<string, string> = { SGD: '702', INR: '356', USD: '840' };
    return map[(currency || 'SGD').toUpperCase()] || '702';
  }

  /** Resolves the payee from settings: UEN (9 digits + letter, proxy type
   * 2) wins over a +65 mobile (proxy type 0). */
  private async resolvePayee(): Promise<{ payeeId: string; payeeName: string }> {
    const s = await this.settings.getForInternalUse();
    const payeeId = s.companyUEN || s.payNowMobile;
    if (!payeeId || !s.companyName) {
      throw new BadRequestException(
        'PayNow is not configured — set the company UEN and name in Settings.',
      );
    }
    return { payeeId, payeeName: s.companyName };
  }

  /** Builds the raw EMVCo payload string (no QR rendering) — exposed for
   * tests/verification. */
  async buildPayload(amount: number, refId: string, currency = 'SGD'): Promise<string> {
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException('Invalid amount');
    }
    const { payeeId, payeeName } = await this.resolvePayee();

    const payloadHeader = this.tlv('00', '01') + this.tlv('01', '12');

    // UEN vs mobile proxy: UENs come in several formats (12345678A,
    // 202012345K, T08LL1234K...) — classify by shape instead: a +65 mobile
    // or a bare 8-digit number is a phone (proxy 0), anything else is a UEN
    // (proxy 2).
    const isMobile = /^\+?65/.test(payeeId) || /^\d{8}$/.test(payeeId.replace(/\s/g, ''));
    const proxyType = isMobile ? '0' : '2';
    const proxyValue = payeeId.replace(/[\s+]/g, '');
    const merchantAccountInfo = this.tlv(
      '26',
      this.tlv('00', 'SG.PAYNOW') +
        this.tlv('01', proxyType) +
        this.tlv('02', proxyValue) +
        this.tlv('03', '1'), // editable = false: the payer cannot change the amount
    );

    const amountStr = amount.toFixed(2);
    const additionalData = refId ? this.tlv('62', this.tlv('01', refId.slice(0, 25))) : '';

    const payloadWithoutCRC =
      payloadHeader +
      merchantAccountInfo +
      this.tlv('52', '0000') + // merchant category — none
      this.tlv('53', this.currencyCode(currency)) +
      this.tlv('54', amountStr) +
      this.tlv('58', 'SG') +
      this.tlv('59', payeeName.slice(0, 25)) +
      this.tlv('60', 'UNKNOWN') +
      additionalData +
      '6304';

    return payloadWithoutCRC + this.calculateCRC(payloadWithoutCRC);
  }

  /** Full QR generation: payload + data-URL image the frontend renders. */
  async generateQr(amount: number, refId: string, currency = 'SGD') {
    const { payeeId, payeeName } = await this.resolvePayee();
    const payload = await this.buildPayload(amount, refId, currency);
    const qr = await QRCode.toDataURL(payload, {
      errorCorrectionLevel: 'M',
      margin: 2,
      scale: 6,
    });
    return { qr, payload, payeeId, payeeName, amount, refId, currency };
  }
}
