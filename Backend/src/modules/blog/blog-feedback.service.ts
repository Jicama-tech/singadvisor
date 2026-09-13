import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { googleClientId, verifyGoogleCredential } from '../../common/utils/google-identity';
import { BlogPost, BlogPostDocument } from './entities/blog-post.entity';
import { BlogFeedback, BlogFeedbackDocument } from './entities/blog-feedback.entity';
import { SubmitFeedbackDto } from './dto/submit-feedback.dto';
import { CrmService } from '../crm/crm.service';

@Injectable()
export class BlogFeedbackService {
  private readonly logger = new Logger(BlogFeedbackService.name);

  constructor(
    @InjectModel(BlogPost.name) private readonly postModel: Model<BlogPostDocument>,
    @InjectModel(BlogFeedback.name)
    private readonly feedbackModel: Model<BlogFeedbackDocument>,
    private readonly configService: ConfigService,
    private readonly crmService: CrmService,
  ) {}

  async submitFeedback(slug: string, dto: SubmitFeedbackDto) {
    const post = await this.postModel.findOne({ slug, published: true }).exec();
    if (!post) throw new NotFoundException('Post not found');

    // Reader feedback is Google-only by design — there is no anonymous path to
    // fall back to here, so an unconfigured deployment is a misconfiguration to
    // surface rather than a fork to take (unlike training enrolment, which
    // still has its typed-email form to fall back on).
    const clientId = googleClientId(this.configService);
    if (!clientId) {
      throw new InternalServerErrorException(
        'GOOGLE_CLIENT_ID is not configured. Add a real OAuth client ID to Backend/.env to enable blog feedback.',
      );
    }
    const identity = await verifyGoogleCredential(clientId, dto.credential);

    const feedback = await this.feedbackModel
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

    // Never let a CRM hiccup lose the reader's feedback. The email here comes
    // from a server-verified Google token, so it is a real address — the
    // strongest identity any of the CRM's sources supplies.
    this.crmService
      .upsertContact({
        email: feedback.email,
        name: feedback.name,
        source: {
          type: 'feedback',
          refId: feedback._id,
          label: `Left feedback on "${post.title}"`,
        },
      })
      .catch((err: unknown) =>
        this.logger.warn(`CRM upsert failed for blog feedback: ${(err as Error)?.message}`),
      );

    return feedback;
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
