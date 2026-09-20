import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type BlogPostDocument = HydratedDocument<BlogPost>;

/**
 * Mirrors Frontend/prisma/schema.prisma's `BlogPost` model 1:1, re-expressed
 * as a MongoDB document. `tags` is a real string array, `content` stays
 * Markdown (the public page renders it itself), `legacyId` is the import key.
 */
@Schema({ collection: 'blog-posts', timestamps: true })
export class BlogPost {
  @Prop({ type: String, required: false, unique: true, sparse: true })
  legacyId?: string;

  @Prop({ type: String, required: true, unique: true })
  slug!: string;

  @Prop({ type: String, required: true })
  title!: string;

  @Prop({ type: String, required: false, default: '' })
  excerpt!: string;

  /** Sanitized HTML from the rich-text editor (DOMPurify on render, never
   * trusted verbatim) — replaces the old Markdown convention. */
  @Prop({ type: String, required: false, default: '' })
  content!: string;

  @Prop({ type: String, required: false, default: '' })
  coverImage!: string;

  /** Freeform byline — "Written by <name>, <position>" on the public page.
   * Independent of `authorId`/Trainer below; either or both may be set. */
  @Prop({ type: String, required: false, default: '' })
  writtenByName!: string;

  @Prop({ type: String, required: false, default: '' })
  writtenByPosition!: string;

  /** One of the four practice areas, plus Insights. */
  @Prop({ type: String, required: true, default: 'Insights' })
  category!: string;

  @Prop({ type: [String], default: [] })
  tags!: string[];

  @Prop({ type: Boolean, required: true, default: true })
  published!: boolean;

  @Prop({ type: Boolean, required: true, default: false })
  featured!: boolean;

  /** Whether this post appears in the public blog listing. Unticked keeps it
   * out of /blog and the home-page highlight while leaving /blog/<slug>
   * reachable, so a newsletter-only article is read by following an issue's
   * "Read full article" link and no other way. Posts written before this
   * flag existed carry no such field, which is why the public query tests
   * `$ne: false` rather than `=== true` — see BlogService.findPublished. */
  @Prop({ type: Boolean, required: true, default: true })
  listedOnBlog!: boolean;

  /**
   * Members only. The body is withheld from everyone who cannot prove an
   * active membership, and the gate is enforced on the Backend — a flag the
   * SPA merely respects would be no gate at all, since the API is public.
   *
   * The item still appears in public listings, deliberately: a locked headline
   * is how anybody finds out membership is worth having. What the listing must
   * never carry is the body — `BlogService.view(..., { list: true })` drops it
   * after the query rather than a `.select()` excluding it before one. That is
   * deliberate and not an oversight: the body is fetched so `readingMinutes`
   * can be counted from it, and then discarded. Do not "optimise" it into a
   * projection without moving the reading-time count somewhere else.
   */
  @Prop({ type: Boolean, required: true, default: false, index: true })
  membersOnly!: boolean;

  /**
   * When the members' announcement went out, and the reason it only goes out
   * once. Publishing is not a single event in this codebase — an admin can
   * save a published item any number of times — so without a stamp every edit
   * would mail the whole membership again.
   *
   * Null means "not sent yet", which is also what every item written before
   * this existed reads as; nothing back-fills it, because nothing should
   * retroactively mail an old post.
   */
  @Prop({ type: Date, required: false, default: null })
  memberEmailSentAt!: Date | null;

  /** Null until first published; drives ordering and the visible date. */
  @Prop({ type: Date, required: false, default: null })
  publishedAt!: Date | null;

  @Prop({ type: Types.ObjectId, ref: 'Trainer', default: null })
  authorId!: Types.ObjectId | null;

  @Prop({ type: Date })
  createdAt?: Date;

  @Prop({ type: Date })
  updatedAt?: Date;
}

export const BlogPostSchema = SchemaFactory.createForClass(BlogPost);
BlogPostSchema.index({ published: 1, featured: -1, publishedAt: -1 });
BlogPostSchema.index({ category: 1 });
