import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Settings, SettingsDocument } from './entities/settings.entity';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { lookupUen, type UenLookupResult } from './uen-lookup';
import { decryptSecret, encryptSecret, hasEncryptionKey } from '../../common/secret-crypto.util';

const SINGLETON_KEY = 'singleton';

/** The safe, secret-free shape GET /settings returns. */
export interface SettingsPublicView {
  companyName: string;
  companyUEN: string;
  /** The ACRA check on the UEN above — admin view only, never public. */
  uenVerified: boolean;
  uenDetails: Record<string, unknown> | null;
  uenVerifiedAt: string | null;
  payNowMobile: string;
  paynowEnabled: boolean;
  razorpayEnabled: boolean;
  razorpayKeyId: string;
  razorpayConfigured: boolean;
  paynowPayeeConfigured: boolean;
  whatsappEnabled: boolean;
  whatsappNumber: string;
  /** The Baileys messaging session's toggle. Admin view only — never on the
   * public payload below. */
  whatsappMessagingEnabled: boolean;
  contactEmailEnabled: boolean;
  contactEmail: string;
  contactPhoneEnabled: boolean;
  contactPhone: string;
  officeAddressEnabled: boolean;
  officeAddress: string;
  contactEmailNote: string;
  contactPhoneNote: string;
  whatsappNote: string;
  officeAddressNote: string;
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
  /** Contact page channels. A disabled channel comes back with an empty
   * value so the page has nothing to render, same rule as the two above. */
  contactPhoneEnabled: boolean;
  contactPhone: string;
  officeAddressEnabled: boolean;
  officeAddress: string;
  contactEmailNote: string;
  contactPhoneNote: string;
  whatsappNote: string;
  officeAddressNote: string;
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
      uenVerified: s.uenVerified,
      uenDetails: s.uenDetails,
      uenVerifiedAt: s.uenVerifiedAt ? s.uenVerifiedAt.toISOString() : null,
      payNowMobile: s.payNowMobile,
      paynowEnabled: s.paynowEnabled,
      razorpayEnabled: s.razorpayEnabled,
      razorpayKeyId: s.razorpayKeyId,
      razorpayConfigured: !!s.razorpayKeyId && !!keySecret,
      paynowPayeeConfigured: !!(s.companyUEN || s.payNowMobile),
      whatsappEnabled: s.whatsappEnabled,
      whatsappNumber: s.whatsappNumber,
      whatsappMessagingEnabled: s.whatsappMessagingEnabled,
      contactEmailEnabled: s.contactEmailEnabled,
      contactEmail: s.contactEmail,
      contactPhoneEnabled: s.contactPhoneEnabled,
      contactPhone: s.contactPhone,
      officeAddressEnabled: s.officeAddressEnabled,
      officeAddress: s.officeAddress,
      contactEmailNote: s.contactEmailNote,
      contactPhoneNote: s.contactPhoneNote,
      whatsappNote: s.whatsappNote,
      officeAddressNote: s.officeAddressNote,
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
      contactPhoneEnabled: s.contactPhoneEnabled && !!s.contactPhone,
      contactPhone: s.contactPhoneEnabled ? s.contactPhone : '',
      officeAddressEnabled: s.officeAddressEnabled && !!s.officeAddress,
      officeAddress: s.officeAddressEnabled ? s.officeAddress : '',
      // Notes are captions on the channels above — harmless on their own, and
      // sent whether or not their channel is on, since the page only reads a
      // note when it is already rendering that channel.
      contactEmailNote: s.contactEmailNote,
      contactPhoneNote: s.contactPhoneNote,
      whatsappNote: s.whatsappNote,
      officeAddressNote: s.officeAddressNote,
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
    if (dto.whatsappMessagingEnabled !== undefined)
      update.whatsappMessagingEnabled = dto.whatsappMessagingEnabled;
    if (dto.contactEmailEnabled !== undefined) update.contactEmailEnabled = dto.contactEmailEnabled;
    if (dto.contactEmail !== undefined) update.contactEmail = dto.contactEmail;
    if (dto.contactPhoneEnabled !== undefined) update.contactPhoneEnabled = dto.contactPhoneEnabled;
    if (dto.contactPhone !== undefined) update.contactPhone = dto.contactPhone;
    if (dto.officeAddressEnabled !== undefined) {
      update.officeAddressEnabled = dto.officeAddressEnabled;
    }
    if (dto.officeAddress !== undefined) update.officeAddress = dto.officeAddress;
    if (dto.contactEmailNote !== undefined) update.contactEmailNote = dto.contactEmailNote;
    if (dto.contactPhoneNote !== undefined) update.contactPhoneNote = dto.contactPhoneNote;
    if (dto.whatsappNote !== undefined) update.whatsappNote = dto.whatsappNote;
    if (dto.officeAddressNote !== undefined) update.officeAddressNote = dto.officeAddressNote;

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

    // A verification belongs to the number it was run against. Changing the
    // UEN discards it, so the page can never show "verified" beside a number
    // nobody checked — which would read as reassurance and be the opposite.
    if (update.companyUEN !== undefined && update.companyUEN !== current.companyUEN) {
      update.uenVerified = false;
      update.uenDetails = null;
      update.uenVerifiedAt = null;
    }

    await this.model.updateOne({ key: SINGLETON_KEY }, { $set: update }).exec();
    return this.getPublicView();
  }

  /**
   * Check a UEN against ACRA and, if it is there, record the result.
   *
   * Saved immediately rather than handed back for the form to submit later:
   * the admin asked a question about a specific number and got an answer about
   * that number, and making the answer depend on them afterwards pressing Save
   * is how a page ends up showing a verification for a different UEN.
   *
   * Verifying a UEN that is not the saved one records the answer without
   * changing `companyUEN` — the field is the admin's to set. The next save
   * clears the verification if the two do not match, per the rule above.
   */
  async verifyUen(uen: string): Promise<UenLookupResult & { savedAgainst: string | null }> {
    const result = await lookupUen(uen);
    const current = await this.getForInternalUse();
    const normalized = (uen || '').trim().toUpperCase();

    if (!result.found) {
      // A failed check clears any stored one for the SAME number: the admin
      // now knows it does not verify, and leaving the old tick would hide that.
      if (current.companyUEN.toUpperCase() === normalized) {
        await this.model
          .updateOne(
            { key: SINGLETON_KEY },
            { $set: { uenVerified: false, uenDetails: null, uenVerifiedAt: null } },
          )
          .exec();
      }
      return { ...result, savedAgainst: null };
    }

    await this.model
      .updateOne(
        { key: SINGLETON_KEY },
        {
          $set: {
            companyUEN: result.details.uen,
            uenVerified: true,
            uenDetails: result.details,
            uenVerifiedAt: new Date(),
          },
        },
      )
      .exec();
    return { ...result, savedAgainst: result.details.uen };
  }
}
