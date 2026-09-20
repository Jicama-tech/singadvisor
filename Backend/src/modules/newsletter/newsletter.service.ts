import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { slugify } from '../../common/utils/slugify';
import {
  Newsletter,
  NewsletterDocument,
  NewsletterItem,
} from './entities/newsletter.entity';
import { SaveNewsletterDto } from './dto/save-newsletter.dto';
import { ANONYMOUS, PRIVILEGED, type Viewer } from '../../common/viewer';
import { announceToMembers } from '../../common/member-announcement';
import { MailService } from '../mail/mail.service';
import { MembershipsService } from '../memberships/memberships.service';

/** What every read endpoint returns: the stored issue with `items` guaranteed
 * to be present and non-empty, and the deprecated single-story fields dropped
 * so no client has two places to look. */
export type NewsletterResponse = {
  _id: Types.ObjectId | string;
  slug: string;
  title: string;
  items: NewsletterItem[];
  published: boolean;
  featured: boolean;
  membersOnly: boolean;
  createdAt?: Date;
  updatedAt?: Date;
};

@Injectable()
export class NewsletterService {
  private readonly logger = new Logger(NewsletterService.name);

  constructor(
    @InjectModel(Newsletter.name)
    private readonly model: Model<NewsletterDocument>,
    private readonly memberships: MembershipsService,
    private readonly mail: MailService,
  ) {}

  /**
   * Presents a stored issue in the one shape clients handle.
   *
   * Issues written before an issue could hold several stories have their
   * image/message/referenceLink at the top level and no `items` at all —
   * folded into a single story here so the public pages and the admin form
   * only ever deal with `items`. The stored document is not touched; `save()`
   * migrates it properly the next time the issue is edited.
   */
  private present(doc: NewsletterDocument, viewer: Viewer = ANONYMOUS): NewsletterResponse {
    const raw = doc.toObject<Newsletter & { _id: Types.ObjectId }>();
    const items =
      raw.items && raw.items.length > 0
        ? raw.items
        : legacyItem(raw);

    // The gate. Anonymous by default, so every caller that does not ask for a
    // member's view gets the withheld one — including ShareService, which calls
    // findBySlugPublic in-process (share.service.ts:83) and would sail past a
    // gate bolted to the controller. A gated issue keeps each story's heading
    // and image, so the locked page and a shared link still show what is behind
    // the lock; only the words go.
    const gated = (raw.membersOnly ?? false) && !viewer.isMember;
    const shown = gated
      ? items.map((item) => ({ ...item, message: '', referenceLink: '' }))
      : items;

    return {
      _id: raw._id,
      slug: raw.slug,
      title: raw.title,
      items: shown,
      published: raw.published,
      // Issues predating the flag have no such field — unfeatured by default.
      featured: raw.featured ?? false,
      membersOnly: raw.membersOnly ?? false,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    };
  }

  /** Public list: published only, featured issues pinned to the top and the
   * rest newest first — same ordering rule the blog listing uses. */
  async findPublished(): Promise<NewsletterResponse[]> {
    const docs = await this.model
      .find({ published: true })
      .sort({ featured: -1, createdAt: -1 })
      .exec();
    return docs.map((doc) => this.presentForList(doc));
  }

  /**
   * An issue as the PUBLIC LIST may see it.
   *
   * The list used to return every story of every issue in full, so a
   * members-only issue would have been readable from /newsletter without ever
   * opening it — the detail gate would have guarded a door with no wall.
   *
   * The card needs exactly two things from the stories: the lead image and a
   * few lines of the lead message (NewsletterIndex line-clamps it to three).
   * So the lead keeps a capped excerpt and every other body goes. The cap is
   * applied to EVERY issue, not just gated ones: a projection that varied by
   * flag would be two shapes for the frontend and one more way round the gate,
   * and at three clamped lines no card can tell the difference.
   */
  private presentForList(doc: NewsletterDocument): NewsletterResponse {
    // Gated FIRST, then capped — and the order is the whole point.
    //
    // The cap was briefly the only protection here, on the reasoning that three
    // clamped lines of a lead story are a teaser like a blog post's excerpt. A
    // test on a gated issue disproved it: the cap keeps the OPENING of the lead
    // story, and for a members-only issue that opening is the paid content. A
    // blog post gets away with publishing a teaser because `excerpt` is a
    // separate field somebody wrote to be public; a newsletter has no such
    // field, so there is nothing to show but the heading.
    //
    // So an anonymous viewer sees a gated issue with every message already
    // blank, and the cap below then applies to open issues only.
    const full = this.present(doc);
    return {
      ...full,
      items: full.items.map((item, index) => ({
        ...item,
        message: index === 0 ? excerptOf(item.message) : '',
        // Only the article page offers these; a card has nowhere to put one.
        referenceLink: '',
      })),
    };
  }

  /** Admin list: everything, newest first. Behind JwtAuthGuard, so the gate is
   * deliberately open — an editor must be able to read what they wrote. */
  async findAll(): Promise<NewsletterResponse[]> {
    const docs = await this.model.find().sort({ createdAt: -1 }).exec();
    return docs.map((doc) => this.present(doc, PRIVILEGED));
  }

  /** Admin single — the edit form's source. Gated open for the same reason as
   * findAll: without it, opening a members-only issue in the editor would show
   * empty stories and saving would write them back blank. */
  async findById(id: string): Promise<NewsletterResponse | null> {
    const doc = await this.model.findById(id).exec();
    return doc ? this.present(doc, PRIVILEGED) : null;
  }

  /** Public detail — unpublished issues 404, same convention as blog. */
  async findBySlugPublic(
    slug: string,
    viewer: Viewer = ANONYMOUS,
  ): Promise<NewsletterResponse> {
    const doc = await this.model.findOne({ slug, published: true }).exec();
    if (!doc) throw new NotFoundException(`No newsletter with slug "${slug}"`);
    return this.present(doc, viewer);
  }

  async save(dto: SaveNewsletterDto, id?: string): Promise<NewsletterResponse> {
    if (!id) {
      if (!dto.title) throw new BadRequestException('Title is required.');
      if (!dto.items || dto.items.length === 0) {
        throw new BadRequestException('An issue needs at least one story.');
      }
    }

    // Same slug flow as BlogService.save: generate from the slug field if
    // given, otherwise from the title; reject a clash against any other doc.
    let slug: string | undefined;
    if (dto.title || dto.slug) {
      slug = slugify(dto.slug || dto.title!);
      const clash = await this.model.findOne({
        slug,
        ...(id ? { _id: { $ne: new Types.ObjectId(id) } } : {}),
      });
      if (clash) throw new BadRequestException('That slug is already in use.');
    }

    const data: Record<string, unknown> = {
      ...(slug !== undefined && { slug }),
      ...(dto.title !== undefined && { title: dto.title }),
      ...(dto.items !== undefined && {
        items: dto.items.map((item) => ({
          heading: item.heading ?? '',
          image: item.image,
          message: item.message,
          referenceLink: item.referenceLink ?? '',
        })),
      }),
      ...(dto.published !== undefined && { published: dto.published }),
      ...(dto.featured !== undefined && { featured: dto.featured }),
      ...(dto.membersOnly !== undefined && { membersOnly: dto.membersOnly }),
    };

    if (id) {
      const doc = await this.model
        .findByIdAndUpdate(
          id,
          {
            $set: data,
            // Saving an issue is also its migration: once its stories live in
            // `items`, the deprecated top-level copies are removed so there is
            // exactly one source of truth. Only when items were actually sent —
            // a partial update that omits them must not strip a legacy issue's
            // only content.
            ...(dto.items !== undefined && {
              $unset: { image: '', imageAlt: '', message: '', referenceLink: '' },
            }),
          },
          { new: true, runValidators: true },
        )
        .exec();
      if (!doc) throw new NotFoundException(`No newsletter with id "${id}"`);
      void this.announceIfNewlyGated(doc);
      // PRIVILEGED: this is the admin's own save echoing back. Anonymous here
      // would hand the editor blank stories straight after writing them.
      return this.present(doc, PRIVILEGED);
    }

    const created = await this.model.create({
      ...data,
      slug: data.slug ?? slugify(dto.title!),
    });
    void this.announceIfNewlyGated(created);
    return this.present(created, PRIVILEGED);
  }

  /**
   * Announce a members-only issue to the membership, at most once.
   *
   * Guarded on the stored `memberEmailSentAt` rather than a previous-value
   * comparison, for the reason spelled out on BlogService.announceIfNewlyGated:
   * an issue can be saved repeatedly, and unpublished and published again.
   *
   * The stamp is claimed before the send and released if nothing went out, for
   * the other reason spelled out there: reading it, then sending, then writing
   * it lets a second save that lands mid-loop start a second announcement.
   */
  private async announceIfNewlyGated(doc: NewsletterDocument): Promise<void> {
    if (!doc.published || !doc.membersOnly || doc.memberEmailSentAt) return;

    const claimed = await this.model
      .findOneAndUpdate(
        { _id: doc._id, memberEmailSentAt: null },
        { memberEmailSentAt: new Date() },
      )
      .exec();
    if (!claimed) return;

    try {
      const { sent, total } = await announceToMembers(this.memberships, this.mail, {
        headline: 'New for members',
        title: doc.title,
        teaser: doc.items?.[0]?.heading,
        path: `/newsletter/${doc.slug}`,
      });

      if (total > 0 && sent === 0) {
        await this.releaseAnnouncementClaim(doc._id);
        this.logger.warn(
          `Announced "${doc.title}" to 0 of ${total} members — not marking it sent, ` +
            'so saving it again will try once more. Check SMTP_HOST.',
        );
      }
    } catch (err: unknown) {
      await this.releaseAnnouncementClaim(doc._id);
      this.logger.warn(
        `Could not announce "${doc.title}" to members: ${(err as Error)?.message}`,
      );
    }
  }

  /** Back to "never announced", so the next save tries again. Best-effort
   * itself — see BlogService.releaseAnnouncementClaim. */
  private async releaseAnnouncementClaim(id: NewsletterDocument['_id']): Promise<void> {
    try {
      await this.model.updateOne({ _id: id }, { memberEmailSentAt: null }).exec();
    } catch {
      this.logger.warn('Could not clear memberEmailSentAt after a failed announcement.');
    }
  }

  async remove(id: string) {
    const doc = await this.model.findByIdAndDelete(id).exec();
    if (!doc) throw new NotFoundException(`No newsletter with id "${id}"`);
    return doc;
  }
}

/**
 * The single story a pre-`items` issue carried at its top level.
 *
 * Returns an empty list rather than a half-built story when the legacy fields
 * are missing too — an issue with no content at all should render as empty,
 * not as a block with broken image and link.
 */
function legacyItem(raw: Newsletter): NewsletterItem[] {
  if (!raw.image && !raw.message && !raw.referenceLink) return [];
  return [
    {
      // The issue title was that single story's headline; it is already shown
      // as the page heading, so repeating it on the story would double it up.
      heading: '',
      image: raw.image ?? '',
      message: raw.message ?? '',
      referenceLink: raw.referenceLink ?? '',
    },
  ];
}

/** Enough for the three clamped lines a card shows and no more. Cut on a word
 * boundary so the excerpt does not end mid-word. */
function excerptOf(message: string, max = 300): string {
  const text = (message ?? '').trim();
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}
