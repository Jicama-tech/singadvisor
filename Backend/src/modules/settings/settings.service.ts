import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Settings, SettingsDocument } from './entities/settings.entity';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { decryptSecret, encryptSecret, hasEncryptionKey } from '../../common/secret-crypto.util';

const SINGLETON_KEY = 'singleton';

/** The safe, secret-free shape GET /settings returns. */
export interface SettingsPublicView {
  companyName: string;
  companyUEN: string;
  payNowMobile: string;
  paynowEnabled: boolean;
  razorpayEnabled: boolean;
  razorpayKeyId: string;
  razorpayConfigured: boolean;
  paynowPayeeConfigured: boolean;
  whatsappEnabled: boolean;
  whatsappNumber: string;
  contactEmailEnabled: boolean;
  contactEmail: string;
}

/** The shape the PUBLIC endpoint returns to the public event pages — only
 * what a buyer's browser is allowed to know. */
export interface SettingsPublicPayload {
  paynowEnabled: boolean;
  paynowPayeeId: string;
  paynowPayeeName: string;
  razorpayEnabled: boolean;
  /** Site-wide "Chat on WhatsApp" button + Footer/Contact page email — off
   * (and number/email omitted) unless the admin has explicitly enabled
   * each one in Settings. */
  whatsappEnabled: boolean;
  whatsappNumber: string;
  contactEmailEnabled: boolean;
  contactEmail: string;
}

@Injectable()
export class SettingsService {
  constructor(
    @InjectModel(Settings.name) private readonly model: Model<SettingsDocument>,
  ) {}

  /** Internal full read (includes decrypted secrets) — callers are
   * RazorpayService/PaynowService, never the controller. */
  async getForInternalUse(): Promise<SettingsDocument> {
    const doc = await this.model.findOneAndUpdate(
      { key: SINGLETON_KEY },
      { $setOnInsert: { key: SINGLETON_KEY } },
      { upsert: true, new: true },
    ).exec();
    return doc;
  }

  async getPublicView(): Promise<SettingsPublicView> {
    const s = await this.getForInternalUse();
    const keySecret = decryptSecret(s.razorpayKeySecret);
    return {
      companyName: s.companyName,
      companyUEN: s.companyUEN,
      payNowMobile: s.payNowMobile,
      paynowEnabled: s.paynowEnabled,
      razorpayEnabled: s.razorpayEnabled,
      razorpayKeyId: s.razorpayKeyId,
      razorpayConfigured: !!s.razorpayKeyId && !!keySecret,
      paynowPayeeConfigured: !!(s.companyUEN || s.payNowMobile),
      whatsappEnabled: s.whatsappEnabled,
      whatsappNumber: s.whatsappNumber,
      contactEmailEnabled: s.contactEmailEnabled,
      contactEmail: s.contactEmail,
    };
  }

  /** Buyer-facing: which payment methods exist, and the PayNow payee the QR
   * should carry. No secrets, no config details beyond what the checkout
   * itself needs. */
  async getPublicPayload(): Promise<SettingsPublicPayload> {
    const s = await this.getForInternalUse();
    const keySecret = decryptSecret(s.razorpayKeySecret);
    const payeeId = s.companyUEN || s.payNowMobile;
    return {
      paynowEnabled: s.paynowEnabled && !!payeeId && !!s.companyName,
      paynowPayeeId: payeeId,
      paynowPayeeName: s.companyName || 'SingAdvisor',
      razorpayEnabled: s.razorpayEnabled && !!s.razorpayKeyId && !!keySecret,
      whatsappEnabled: s.whatsappEnabled && !!s.whatsappNumber,
      whatsappNumber: s.whatsappEnabled ? s.whatsappNumber : '',
      contactEmailEnabled: s.contactEmailEnabled && !!s.contactEmail,
      contactEmail: s.contactEmailEnabled ? s.contactEmail : '',
    };
  }

  async update(dto: UpdateSettingsDto, updatedBy: string): Promise<SettingsPublicView> {
    const current = await this.getForInternalUse();

    const update: Record<string, unknown> = { updatedBy };
    if (dto.companyName !== undefined) update.companyName = dto.companyName;
    if (dto.companyUEN !== undefined) update.companyUEN = dto.companyUEN.toUpperCase();
    if (dto.payNowMobile !== undefined) update.payNowMobile = dto.payNowMobile;
    if (dto.paynowEnabled !== undefined) update.paynowEnabled = dto.paynowEnabled;
    if (dto.razorpayEnabled !== undefined) update.razorpayEnabled = dto.razorpayEnabled;
    if (dto.razorpayKeyId !== undefined) update.razorpayKeyId = dto.razorpayKeyId;
    if (dto.whatsappEnabled !== undefined) update.whatsappEnabled = dto.whatsappEnabled;
    if (dto.whatsappNumber !== undefined) update.whatsappNumber = dto.whatsappNumber;
    if (dto.contactEmailEnabled !== undefined) update.contactEmailEnabled = dto.contactEmailEnabled;
    if (dto.contactEmail !== undefined) update.contactEmail = dto.contactEmail;

    // Secrets: blank = keep existing, clear flags wipe, otherwise encrypt.
    // encryptSecret throws without SETTINGS_ENC_KEY — fail-safe, never
    // persist a real key under a default key.
    if (dto.clearRazorpayKeySecret) {
      update.razorpayKeySecret = '';
    } else if (dto.razorpayKeySecret) {
      update.razorpayKeySecret = encryptSecret(dto.razorpayKeySecret);
    }
    if (dto.clearRazorpayWebhookSecret) {
      update.razorpayWebhookSecret = '';
    } else if (dto.razorpayWebhookSecret) {
      update.razorpayWebhookSecret = encryptSecret(dto.razorpayWebhookSecret);
    }

    // UEN is the anchor of the PayNow QR — a config with only a mobile
    // number is fine, but a malformed UEN must never reach the QR builder.
    const newUEN = (update.companyUEN as string) ?? current.companyUEN;
    if (newUEN && !/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z0-9]{8,10}$/.test(newUEN)) {
      throw new BadRequestException('UEN must be 8-10 letters/digits, e.g. 202012345K or T08LL1234K');
    }

    await this.model.updateOne({ key: SINGLETON_KEY }, { $set: update }).exec();
    return this.getPublicView();
  }
}
