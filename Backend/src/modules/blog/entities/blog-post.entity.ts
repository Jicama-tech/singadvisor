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
BlogPostSchema.index({ published: 1, publishedAt: -1 });
BlogPostSchema.index({ category: 1 });
