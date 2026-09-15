import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { slugify } from '../../common/utils/slugify';
import { normalizeSpaces } from '../../common/utils/normalize-spaces';
import { BlogPost, BlogPostDocument } from './entities/blog-post.entity';
import { SavePostDto } from './dto/save-post.dto';
import { GenerateBlogDto } from './dto/generate-blog.dto';
import { QwenService } from '../ai/qwen.service';
import { readingMinutes } from '../../common/utils/reading-time';
import { ANONYMOUS, type Viewer } from '../../common/viewer';
import { announceToMembers } from '../../common/member-announcement';
import { MailService } from '../mail/mail.service';
import { MembershipsService } from '../memberships/memberships.service';

@Injectable()
export class BlogService {
  private readonly logger = new Logger(BlogService.name);

  constructor(
    @InjectModel(BlogPost.name)
    private readonly model: Model<BlogPostDocument>,
    private readonly qwenService: QwenService,
    private readonly memberships: MembershipsService,
    private readonly mail: MailService,
  ) {}

  /** "Generate with AI" — draft content for the admin to edit before saving,
   * nothing is written to the database here. */
  generatePreview(dto: GenerateBlogDto) {
    return this.qwenService.generateBlogContent(dto.topic);
  }

  /** Public list: published only, featured posts pinned to the top and the
   * rest newest first. Newsletter-only posts are left out — they stay
   * reachable at /blog/<slug> for a reader following a newsletter link, but
   * never surface in the listing (nor, since every public surface reads this
   * one endpoint, in the home-page highlight).
   *
   * Sorting on `featured` before the dates is what puts a featured article at
   * the head of /blog, which is also the hero slot the listing gives its first
   * post. That sort needs the flag STORED on every post: Mongo orders an
   * absent field below `false` rather than among it, which would strand
   * older posts in a third group beneath the unfeatured and break the date
   * tiebreak between the two. scripts/backfill-featured.ts stores it.
   *
   * `$ne: false` rather than `true`: every post written before the flag
   * existed has no such field, and those must keep showing. */
  async findPublished(viewer: Viewer = ANONYMOUS) {
    const docs = await this.model
      .find({ published: true, listedOnBlog: { $ne: false } })
      .sort({ featured: -1, publishedAt: -1, createdAt: -1 })
      .lean()
      .exec();
    // A list never carries a body, member or not — see view().
    return docs.map((doc) => view(doc, viewer, { list: true }));
  }

  /** Admin list: everything, newest edits first. */
  findAll() {
    return this.model.find().sort({ updatedAt: -1 }).exec();
  }

  findById(id: string) {
    return this.model.findById(id).exec();
  }

  /**
   * Public detail — unpublished posts 404, author populated for the byline.
   *
   * The viewer defaults to anonymous, so every caller that does not ask for a
   * member's view gets the withheld one. ShareService (share.service.ts:52)
   * is exactly such a caller and inherits the gate without knowing it exists,
   * which is the whole reason the gate lives here rather than in the
   * controller it could be routed around.
   *
   * A gated post still returns: the title, excerpt, cover and dates. That is
   * the teaser the locked page shows, and it is what makes a crawler card and
   * a shared link still work. What it never returns is `content`.
   */
  async findBySlugPublic(slug: string, viewer: Viewer = ANONYMOUS) {
    const doc = await this.model
      .findOne({ slug, published: true })
      .populate('authorId', 'name title bio photo linkedin')
      .lean()
      .exec();
    if (!doc) throw new NotFoundException(`No post with slug "${slug}"`);
    return view(doc, viewer);
  }

  async save(dto: SavePostDto, id?: string) {
    if (!id && !dto.title) {
      throw new BadRequestException('Title is required.');
    }
    if (!id && !dto.content) {
      throw new BadRequestException('An article needs a body.');
    }

    let slug: string | undefined;
    if (dto.title || dto.slug) {
      slug = slugify(dto.slug || dto.title!);
      const clash = await this.model.findOne({
        slug,
        ...(id ? { _id: { $ne: new Types.ObjectId(id) } } : {}),
      });
      if (clash) throw new BadRequestException('That slug is already in use.');
    }

    // Stamp publishedAt the first time a post goes live and keep it stable
    // afterwards, so editing an old article does not move it to the top
    // (same logic the old server action had).
    const existing = id ? await this.model.findById(id).exec() : null;
    let publishedAt = existing?.publishedAt ?? null;
    if (dto.publishedAt) {
      publishedAt = dto.publishedAt;
    } else if (dto.published && !publishedAt) {
      publishedAt = new Date();
    }

    const authorId =
      dto.authorId && Types.ObjectId.isValid(dto.authorId)
        ? new Types.ObjectId(dto.authorId)
        : null;

    const data: Record<string, unknown> = {
      ...(slug !== undefined && { slug }),
      ...(dto.title !== undefined && { title: dto.title }),
      ...(dto.excerpt !== undefined && { excerpt: dto.excerpt }),
      ...(dto.content !== undefined && { content: normalizeSpaces(dto.content) }),
      ...(dto.coverImage !== undefined && { coverImage: dto.coverImage }),
      ...(dto.category !== undefined && { category: dto.category }),
      ...(dto.tags !== undefined && { tags: dto.tags }),
      ...(dto.published !== undefined && { published: dto.published }),
      ...(dto.featured !== undefined && { featured: dto.featured }),
      ...(dto.listedOnBlog !== undefined && { listedOnBlog: dto.listedOnBlog }),
      ...(dto.membersOnly !== undefined && { membersOnly: dto.membersOnly }),
      ...(dto.authorId !== undefined && { authorId }),
      ...(dto.writtenByName !== undefined && { writtenByName: dto.writtenByName }),
      ...(dto.writtenByPosition !== undefined && { writtenByPosition: dto.writtenByPosition }),
      publishedAt,
    };

    if (id) {
      const doc = await this.model
        .findByIdAndUpdate(id, data, { new: true, runValidators: true })
        .exec();
      if (!doc) throw new NotFoundException(`No post with id "${id}"`);
      void this.announceIfNewlyGated(doc);
      return doc;
    }

    const created = await this.model.create({
      ...data,
      slug: data.slug ?? slugify(dto.title!),
      title: data.title ?? dto.title,
      content: data.content ?? dto.content,
    });
    void this.announceIfNewlyGated(created);
    return created;
  }

  /**
   * Announce a members-only post to the membership, at most once.
   *
   * The guard is `memberEmailSentAt`, not a comparison against the previous
   * `published` value. Publishing is not one event in this codebase: a post
   * is born with `published: true` (see BlogPost.published's default), an
   * admin can save an already-live post any number of times, and a post can
   * be unpublished and published again. A stored stamp answers all three;
   * an old-versus-new comparison answers only the middle one.
   *
   * Stamped only once something actually went out.
   *
   * The stamp was originally written BEFORE sending, to make sure a retry could
   * never double-mail anybody. That is the wrong way round on a deployment
   * where SMTP is not configured — and this one is not: sendBestEffort swallows
   * the failure, returns false, and the post is left marked as announced with
   * every member never told and no way for it ever to retry.
   *
   * So: nothing owed (no members yet) or at least one send succeeded counts as
   * done. A total failure stays un-stamped and the next save tries again. The
   * accepted cost is the partial case — if half the sends fail, the half that
   * worked are not mailed twice, because the stamp goes down anyway.
   *
   * Fire-and-forget, like every other mail side effect here: saving a post
   * must not fail because SMTP is down.
   */
  private async announceIfNewlyGated(doc: BlogPostDocument): Promise<void> {
    if (!doc.published || !doc.membersOnly || doc.memberEmailSentAt) return;
    try {
      const { sent, total } = await announceToMembers(this.memberships, this.mail, {
        headline: 'New for members',
        title: doc.title,
        teaser: doc.excerpt,
        path: `/blog/${doc.slug}`,
      });

      if (total === 0 || sent > 0) {
        await this.model.updateOne({ _id: doc._id }, { memberEmailSentAt: new Date() }).exec();
      } else {
        this.logger.warn(
          `Announced "${doc.title}" to 0 of ${total} members — not marking it sent, ` +
            'so saving it again will try once more. Check SMTP_HOST.',
        );
      }
    } catch (err: unknown) {
      this.logger.warn(
        `Could not announce "${doc.title}" to members: ${(err as Error)?.message}`,
      );
    }
  }

  async remove(id: string) {
    const doc = await this.model.findByIdAndDelete(id).exec();
    if (!doc) throw new NotFoundException(`No post with id "${id}"`);
    return doc;
  }
}

/**
 * The one place a post leaves this service for a public reader.
 *
 * Two jobs, and they are separate on purpose:
 *
 * - **The body never travels with a list.** `GET /blog` used to return whole
 *   documents, so it handed every visitor the full text of every post. That
 *   was merely wasteful before members-only content existed and is a hole in
 *   the gate now: withholding a body on the detail route means nothing if the
 *   list already gave it away. `readingMinutes` is computed here because it is
 *   the only thing the cards ever needed the body for.
 *
 * - **A gated body needs a member.** `membersOnly` posts drop `content` unless
 *   the viewer has been verified as one. Everything else about the post —
 *   title, excerpt, cover, dates — still goes, because that teaser is what the
 *   locked page renders and what a shared link previews.
 *
 * `membersOnly` itself always travels, so the card can show a lock and the
 * page can tell "no body because you are not a member" apart from "no body
 * because this is a list".
 */
function view<T extends { content?: string; membersOnly?: boolean }>(
  doc: T,
  viewer: Viewer,
  opts: { list?: boolean } = {},
): Omit<T, 'content'> & { membersOnly: boolean; readingMinutes: number; content?: string } {
  const { content, ...rest } = doc;
  const gated = doc.membersOnly === true && !viewer.isMember;

  return {
    ...rest,
    // Absent on every post written before the flag; missing means open.
    membersOnly: doc.membersOnly === true,
    readingMinutes: readingMinutes(content ?? ''),
    // Generic so every other field keeps its type and callers such as
    // ShareService go on compiling — while `content` becomes optional, which
    // is what forces each of them to face the fact that it may not be there.
    ...(opts.list || gated ? {} : { content }),
  };
}
