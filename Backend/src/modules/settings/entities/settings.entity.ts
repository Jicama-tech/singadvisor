import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type SettingsDocument = HydratedDocument<Settings>;

/**
 * Platform settings singleton (one document, keyed `key: "singleton"`) —
 * the payment/identity configuration the Settings admin page edits and the
 * PayNow/Razorpay flows read. Secrets are stored AES-256-GCM encrypted
 * (see common/secret-crypto.util.ts) and are NEVER returned by GET.
 */
@Schema({ collection: 'settings', timestamps: true })
export class Settings {
  @Prop({ type: String, required: true, unique: true, default: 'singleton' })
  key!: string;

  /** Merchant name baked into the PayNow QR (TLV59, max 25 chars). */
  @Prop({ type: String, default: '' })
  companyName!: string;

  /** Singapore corporate PayNow proxy — UEN: 9 digits + 1 uppercase letter. */
  @Prop({ type: String, default: '' })
  companyUEN!: string;

  /** Fallback PayNow proxy when no UEN is set: +65 mobile number. */
  @Prop({ type: String, default: '' })
  payNowMobile!: string;

  @Prop({ type: Boolean, default: true })
  paynowEnabled!: boolean;

  /** Effective only when Razorpay keys are actually configured — the public
   * settings endpoint ANDs this with razorpayConfigured. */
  @Prop({ type: Boolean, default: true })
  razorpayEnabled!: boolean;

  /** Public key id — safe to return to the admin UI. */
  @Prop({ type: String, default: '' })
  razorpayKeyId!: string;

  /** Encrypted (enc:v1:...) — never echoed in responses. */
  @Prop({ type: String, default: '' })
  razorpayKeySecret!: string;

  /** Encrypted (enc:v1:...) — never echoed in responses. */
  @Prop({ type: String, default: '' })
  razorpayWebhookSecret!: string;

  /** Site-wide "Chat on WhatsApp" floating button — off by default; the
   * number is a combined "+65 9123 4567" string (PhoneField's own
   * convention, same as payNowMobile above). */
  @Prop({ type: Boolean, default: false })
  whatsappEnabled!: boolean;

  @Prop({ type: String, default: '' })
  whatsappNumber!: string;

  /** Public contact email shown on the site (Footer/Contact page) — off by
   * default, independent of the SMTP "send from" config on eventsh. */
  @Prop({ type: Boolean, default: false })
  contactEmailEnabled!: boolean;

  @Prop({ type: String, default: '' })
  contactEmail!: string;

  // ---- Contact page channels -------------------------------------------
  // Everything the public Contact page shows was hardcoded in the frontend's
  // SITE constant; these make it editable. Each channel has its own on/off
  // flag so a channel can be hidden without deleting what is in it, and its
  // own free-text note (the line under the value: opening hours, response
  // time, "visits by appointment"). A blank note falls back to the wording
  // the page shipped with, so an unconfigured site looks unchanged.

  /** Public phone number — a combined "+65 9123 4567" string, PhoneField's
   * own convention (same as payNowMobile / whatsappNumber above). */
  @Prop({ type: Boolean, default: false })
  contactPhoneEnabled!: boolean;

  @Prop({ type: String, default: '' })
  contactPhone!: string;

  @Prop({ type: Boolean, default: false })
  officeAddressEnabled!: boolean;

  @Prop({ type: String, default: '' })
  officeAddress!: string;

  @Prop({ type: String, default: '' })
  contactEmailNote!: string;

  @Prop({ type: String, default: '' })
  contactPhoneNote!: string;

  @Prop({ type: String, default: '' })
  whatsappNote!: string;

  @Prop({ type: String, default: '' })
  officeAddressNote!: string;

  @Prop({ type: String, default: '' })
  updatedBy!: string;

  @Prop({ type: Date })
  createdAt?: Date;

  @Prop({ type: Date })
  updatedAt?: Date;
}

export const SettingsSchema = SchemaFactory.createForClass(Settings);
