import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type NewsletterDocument = HydratedDocument<Newsletter>;

/**
 * One story inside an issue — an image, a <=1000-word message (enforced in
 * SaveNewsletterDto) and an optional link for "Read full article".
 *
 * These are exactly the fields an issue used to carry directly, moved down a
 * level so one issue ("All About September") can gather several stories
 * instead of being a single story with a title.
 */
@Schema({ _id: false })
export class NewsletterItem {
  /** Optional per-story headline. The issue's own `title` is the heading on
   * the page; this labels the individual story beneath it, and stories that
   * read fine without one simply leave it blank. */
  @Prop({ type: String, required: false, default: '' })
  heading!: string;

  @Prop({ type: String, required: true })
  image!: string;

  // Plain-text body, capped at 1000 words (enforced in the DTO).
  @Prop({ type: String, required: true })
  message!: string;

  // Where "Read full article" sends the reader — any URL, not necessarily one
  // of this site's own blog posts. Optional: a story with nothing to link to
  // simply shows no button.
  @Prop({ type: String, required: false, default: '' })
  referenceLink!: string;
}
export const NewsletterItemSchema = SchemaFactory.createForClass(NewsletterItem);

/**
 * One issue of the newsletter: a heading, a slug, and one or more stories.
 *
 * An issue used to BE a single story — image/message/referenceLink sat right
 * here on the document. Those fields are kept below, optional and deprecated,
 * purely so issues written before the change still read: NewsletterService
 * folds them into a one-entry `items` array on the way out, and rewrites them
 * into `items` properly the next time the issue is saved. Nothing new ever
 * writes them.
 */
@Schema({ collection: 'newsletters', timestamps: true })
export class Newsletter {
  @Prop({ type: String, required: true, unique: true })
  slug!: string;

  /** The issue heading — "All About September". */
  @Prop({ type: String, required: true })
  title!: string;

  @Prop({ type: [NewsletterItemSchema], required: true, default: [] })
  items!: NewsletterItem[];

  @Prop({ type: Boolean, required: true, default: false })
  published!: boolean;

  /**
   * Pins the issue to the top of the public newsletter listing.
   *
   * Has to be STORED on every issue, including those written before the flag
   * existed — `default: false` is not enough, because it is applied when
   * Mongoose hydrates a document, long after the server has sorted. In the
   * stored document the field is simply absent, and Mongo sorts an absent
   * field as null: a distinct BSON type that orders below the WHOLE of
   * Boolean. So it lands below `false`, not among the unfeatured, and the
   * listing gets three groups where it wanted two — with the date only
   * breaking ties inside a group. One issue saved with the toggle untouched
   * would outrank every issue nobody has edited, however new.
   *
   * scripts/backfill-featured.ts is what keeps that from happening.
   */
  @Prop({ type: Boolean, required: true, default: false })
  featured!: boolean;

  /**
   * Members only. The stories are withheld from everyone who cannot prove an
   * active membership, and the gate is enforced on the Backend — a flag the
   * SPA merely respects would be no gate at all, since the API is public.
   *
   * The issue still appears in the public listing, deliberately: a locked
   * headline is how anybody finds out membership is worth having. What the
   * listing must never carry is `items` — see the public list query.
   */
  @Prop({ type: Boolean, required: true, default: false, index: true })
  membersOnly!: boolean;

  /**
   * When the members' announcement went out, and the reason it only goes out
   * once. Publishing is not a single event here — an admin can save a
   * published issue any number of times — so without a stamp every edit would
   * mail the whole membership again.
   */
  @Prop({ type: Date, required: false, default: null })
  memberEmailSentAt!: Date | null;

  // ---- Deprecated single-story fields (pre-`items` issues only) ----------
  // Optional now: a saved issue has these $unset, so requiring them would
  // make every subsequent update fail validation.

  /** @deprecated read via NewsletterService's normalization; use `items`. */
  @Prop({ type: String, required: false })
  image?: string;

  /** @deprecated never rendered — the alt-text field was dropped from the form. */
  @Prop({ type: String, required: false })
  imageAlt?: string;

  /** @deprecated read via NewsletterService's normalization; use `items`. */
  @Prop({ type: String, required: false })
  message?: string;

  /** @deprecated read via NewsletterService's normalization; use `items`. */
  @Prop({ type: String, required: false })
  referenceLink?: string;

  @Prop({ type: Date })
  createdAt?: Date;

  @Prop({ type: Date })
  updatedAt?: Date;
}

export const NewsletterSchema = SchemaFactory.createForClass(Newsletter);
NewsletterSchema.index({ published: 1, featured: -1, createdAt: -1 });
