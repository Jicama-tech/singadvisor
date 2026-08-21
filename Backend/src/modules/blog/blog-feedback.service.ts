import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { OAuth2Client } from 'google-auth-library';
import { BlogPost, BlogPostDocument } from './entities/blog-post.entity';
import { BlogFeedback, BlogFeedbackDocument } from './entities/blog-feedback.entity';
import { SubmitFeedbackDto } from './dto/submit-feedback.dto';

@Injectable()
export class BlogFeedbackService {
  private oauthClient: OAuth2Client;

  constructor(
    @InjectModel(BlogPost.name) private readonly postModel: Model<BlogPostDocument>,
    @InjectModel(BlogFeedback.name)
    private readonly feedbackModel: Model<BlogFeedbackDocument>,
    private readonly configService: ConfigService,
  ) {
    this.oauthClient = new OAuth2Client(this.configService.get<string>('GOOGLE_CLIENT_ID'));
  }

  private async verifyGoogleCredential(credential: string) {
    const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
    if (!clientId || clientId === 'your-google-oauth-client-id') {
      throw new InternalServerErrorException(
        'GOOGLE_CLIENT_ID is not configured. Add a real OAuth client ID to Backend/.env to enable blog feedback.',
      );
    }

    let ticket;
    try {
      ticket = await this.oauthClient.verifyIdToken({ idToken: credential, audience: clientId });
    } catch (err) {
      throw new BadRequestException(
        `Invalid Google sign-in: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    const payload = ticket.getPayload();
    if (!payload?.sub || !payload?.email) {
      throw new BadRequestException('Google sign-in did not return the expected profile data.');
    }

    return { sub: payload.sub, email: payload.email, name: payload.name || '' };
  }

  async submitFeedback(slug: string, dto: SubmitFeedbackDto) {
    const post = await this.postModel.findOne({ slug, published: true }).exec();
    if (!post) throw new NotFoundException('Post not found');

    const identity = await this.verifyGoogleCredential(dto.credential);

    return this.feedbackModel
      .findOneAndUpdate(
        { postId: post._id, googleSub: identity.sub },
        {
          postId: post._id,
          googleSub: identity.sub,
          email: identity.email,
          name: identity.name,
          rating: dto.rating,
          message: dto.message || '',
        },
        { upsert: true, new: true },
      )
      .exec();
  }

  /** Admin: full detail including the authenticated email, for the Blog
   * editor's feedback panel. */
  async findAllByPostId(postId: string) {
    if (!Types.ObjectId.isValid(postId)) throw new BadRequestException('Invalid post id');
    return this.feedbackModel
      .find({ postId: new Types.ObjectId(postId) })
      .sort({ createdAt: -1 })
      .exec();
  }

  /** Admin: approve/unapprove one entry for public display. */
  async setFeatured(feedbackId: string, featured: boolean) {
    if (!Types.ObjectId.isValid(feedbackId)) throw new BadRequestException('Invalid feedback id');
    const feedback = await this.feedbackModel
      .findByIdAndUpdate(feedbackId, { featured }, { new: true })
      .exec();
    if (!feedback) throw new NotFoundException('Feedback not found');
    return feedback;
  }

  /** Public: only admin-approved entries, ratings/messages only — no email
   * addresses or Google subject ids. */
  async findPublicFeaturedBySlug(slug: string) {
    const post = await this.postModel.findOne({ slug, published: true }).exec();
    if (!post) throw new NotFoundException('Post not found');

    return this.feedbackModel
      .find({ postId: post._id, featured: true })
      .select('-email -googleSub')
      .sort({ createdAt: -1 })
      .exec();
  }
}
