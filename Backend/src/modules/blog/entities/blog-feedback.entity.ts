import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type BlogFeedbackDocument = HydratedDocument<BlogFeedback>;

/**
 * Reader feedback on a Blog post — ported from jicamaTech's blog engine
 * (same shape/flow), attached to this app's own `blog-posts` collection
 * rather than a separate one. Every submission requires a Google sign-in,
 * verified server-side (see BlogFeedbackService) so the recorded email
 * can never be spoofed by the client.
 */
@Schema({ collection: 'blog-feedback', timestamps: true })
export class BlogFeedback {
  @Prop({ type: Types.ObjectId, ref: 'BlogPost', required: true })
  postId!: Types.ObjectId;

  @Prop({ type: Number, required: true, min: 1, max: 5 })
  rating!: number;

  @Prop({ type: String, default: '' })
  message!: string;

  // Identity of the reader who left this feedback, taken from the Google ID
  // token verified server-side — never trust client-supplied values here.
  @Prop({ type: String, required: true })
  googleSub!: string;

  @Prop({ type: String, required: true })
  email!: string;

  @Prop({ type: String, default: '' })
  name!: string;

  // Admin-curated: only featured entries are shown on the public post page
  // — everything submitted lands here first, admin-only, until approved.
  @Prop({ type: Boolean, default: false })
  featured!: boolean;

  @Prop({ type: Date })
  createdAt?: Date;

  @Prop({ type: Date })
  updatedAt?: Date;
}

export const BlogFeedbackSchema = SchemaFactory.createForClass(BlogFeedback);

// One feedback entry per Google account per post — resubmitting updates the
// existing entry instead of creating a duplicate.
BlogFeedbackSchema.index({ postId: 1, googleSub: 1 }, { unique: true });
