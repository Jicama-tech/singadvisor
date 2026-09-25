import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type WhatsappBroadcastDocument = HydratedDocument<WhatsappBroadcast>;

/** Who a campaign went to. Resolved to a fixed list the moment it is sent, so
 * the record says who was actually messaged rather than who a query would
 * return today. */
export const BROADCAST_AUDIENCES = ['members', 'contacts', 'tag', 'selected', 'manual'] as const;
export type BroadcastAudience = (typeof BROADCAST_AUDIENCES)[number];

/**
 * `sent` is the finished state (kept under that name so campaigns stored
 * before pausing existed still read correctly). `paused` is a campaign that
 * stopped with people still pending — the daily limit, a dropped session, a
 * restart — and can be resumed. `cancelled` was stopped by an admin.
 */
export const BROADCAST_STATUSES = ['queued', 'sending', 'paused', 'sent', 'failed', 'cancelled'] as const;
export type BroadcastStatus = (typeof BROADCAST_STATUSES)[number];

export const RECIPIENT_STATUSES = ['pending', 'sent', 'failed', 'skipped'] as const;
export type RecipientStatus = (typeof RECIPIENT_STATUSES)[number];

@Schema({ _id: false })
export class BroadcastRecipient {
  /**
   * Blank is legitimate, so this is NOT required.
   *
   * A recipient row is the record of what happened to one person in the
   * audience, including "we had no number for them" — buildAudience stores
   * exactly that, as a `skipped` row with an empty phone and a reason. Mongoose
   * counts an empty string as missing on a required String, so `required: true`
   * rejected the whole campaign the moment ONE contact in the audience had no
   * number: a 500 on send, after the audience preview had happily shown them as
   * a skip. Refusing to save the campaign is the wrong response to a contact
   * with no phone; recording it is the point.
   */
  @Prop({ type: String, required: false, default: '' })
  phone!: string;

  @Prop({ type: String, default: '' })
  name!: string;

  /** The address this went to, if it went. Kept because `phone` is what was
   * stored and this is what WhatsApp was actually given. */
  @Prop({ type: String, default: '' })
  email!: string;

  @Prop({ type: String, enum: RECIPIENT_STATUSES, default: 'pending' })
  status!: RecipientStatus;

  /** Why a recipient was skipped or failed — an opt-out, a number that is not
   * on WhatsApp, an error from the send. Shown per row in the admin, because
   * "42 of 50 sent" without the other 8 is not a report. */
  @Prop({ type: String, default: null })
  reason!: string | null;

  @Prop({ type: Date, default: null })
  sentAt!: Date | null;

  /** The CRM contact this row came from, when it came from one. What the
   * spintax seed is, and how an opt-out made mid-campaign is matched. */
  @Prop({ type: String, default: null })
  contactId!: string | null;

  /**
   * The exact message this person gets — placeholders filled, spintax picked.
   * Rendered once when the campaign is created, so the preview, the send and
   * the record are provably the same text. Empty on campaigns from before
   * personalisation; the runner falls back to the campaign's `message`.
   */
  @Prop({ type: String, default: '' })
  text!: string;

  /**
   * Set the moment this row is taken for sending, BEFORE the message goes
   * out; the outcome is written right after. A row found pending with this
   * set was taken by a run that died between the two — WhatsApp may have
   * delivered it — so it is closed as failed and never sent again. At most
   * once: a duplicate marketing message is worse than a missed one.
   */
  @Prop({ type: Date, default: null })
  attemptAt!: Date | null;
}
export const BroadcastRecipientSchema = SchemaFactory.createForClass(BroadcastRecipient);

/**
 * One WhatsApp campaign.
 *
 * Stored rather than fired and forgotten, for three reasons. A broadcast takes
 * minutes — it is paced on purpose — so the admin needs somewhere to watch it
 * from. A send that dies halfway has to be answerable about who already got
 * the message, or resending means messaging people twice. And a marketing
 * message to a personal number is the kind of thing somebody later asks "who
 * sent me this, and when" about.
 */
@Schema({ collection: 'whatsapp_broadcasts', timestamps: true })
export class WhatsappBroadcast {
  /** What the admin called it. Never sent; it is the label in the list. */
  @Prop({ type: String, required: true, trim: true })
  name!: string;

  /**
   * The message as WhatsApp markup — converted from the composer's HTML, with
   * its `{{placeholders}}` and `{spintax}` still in it. Each recipient's
   * rendered copy is on their row (`recipients.text`); this is the template
   * they were all made from.
   */
  @Prop({ type: String, required: true })
  message!: string;

  /**
   * What the composer produced, before conversion.
   *
   * Kept alongside rather than instead: `message` is the evidence of what was
   * sent, and this is what to reopen if the campaign is ever duplicated or
   * edited. Empty for a campaign written as plain text.
   */
  @Prop({ type: String, default: '' })
  messageHtml!: string;

  /**
   * One image, sent with the text as its caption.
   *
   * A path under /uploads/whatsapp and nothing else — the service resolves it
   * and refuses anything landing outside that directory, because this string
   * decides which file the server reads off its own disk.
   *
   * One, not many: WhatsApp attaches a caption to a single image, and a second
   * image would have to be a second message — which doubles the send rate the
   * pacing exists to hold down, and arrives out of order often enough to look
   * broken.
   */
  @Prop({ type: String, default: null })
  imageUrl!: string | null;

  @Prop({ type: String, enum: BROADCAST_AUDIENCES, required: true })
  audience!: BroadcastAudience;

  /** Set only when `audience` is 'tag'. */
  @Prop({ type: String, default: null })
  tag!: string | null;

  @Prop({ type: [BroadcastRecipientSchema], default: [] })
  recipients!: BroadcastRecipient[];

  @Prop({ type: String, enum: BROADCAST_STATUSES, default: 'queued' })
  status!: BroadcastStatus;

  /** The number it was sent FROM, snapshotted at send time. A site can re-pair
   * to a different phone, and then the campaign record would otherwise name
   * the wrong sender. */
  @Prop({ type: String, default: null })
  sentFrom!: string | null;

  @Prop({ type: Number, default: 0 })
  sentCount!: number;

  /** Rows still to be attempted. Kept as a counter so the list view can show
   * progress without loading every recipient. */
  @Prop({ type: Number, default: 0 })
  pendingCount!: number;

  @Prop({ type: Number, default: 0 })
  failedCount!: number;

  @Prop({ type: Number, default: 0 })
  skippedCount!: number;

  @Prop({ type: String, default: null })
  lastError!: string | null;

  @Prop({ type: String, default: '' })
  createdBy!: string;

  @Prop({ type: Date, default: null })
  startedAt!: Date | null;

  @Prop({ type: Date, default: null })
  finishedAt!: Date | null;
}

export const WhatsappBroadcastSchema = SchemaFactory.createForClass(WhatsappBroadcast);

// The list is shown newest first and nothing else queries this collection.
WhatsappBroadcastSchema.index({ createdAt: -1 });
