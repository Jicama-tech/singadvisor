import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { slugify } from '../../common/utils/slugify';
import {
  Newsletter,
  NewsletterDocument,
  NewsletterItem,
} from './entities/newsletter.entity';
import { SaveNewsletterDto } from './dto/save-newsletter.dto';

/** What every read endpoint returns: the stored issue with `items` guaranteed
 * to be present and non-empty, and the deprecated single-story fields dropped
 * so no client has two places to look. */
export type NewsletterResponse = {
  _id: Types.ObjectId | string;
  slug: string;
  title: string;
  items: NewsletterItem[];
  published: boolean;
  createdAt?: Date;
  updatedAt?: Date;
};

@Injectable()
export class NewsletterService {
  constructor(
    @InjectModel(Newsletter.name)
    private readonly model: Model<NewsletterDocument>,
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
  private present(doc: NewsletterDocument): NewsletterResponse {
    const raw = doc.toObject<Newsletter & { _id: Types.ObjectId }>();
    const items =
      raw.items && raw.items.length > 0
        ? raw.items
        : legacyItem(raw);

    return {
      _id: raw._id,
      slug: raw.slug,
      title: raw.title,
      items,
      published: raw.published,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    };
  }

  /** Public list: published only, newest first. */
  async findPublished(): Promise<NewsletterResponse[]> {
    const docs = await this.model.find({ published: true }).sort({ createdAt: -1 }).exec();
    return docs.map((doc) => this.present(doc));
  }

  /** Admin list: everything, newest first. */
  async findAll(): Promise<NewsletterResponse[]> {
    const docs = await this.model.find().sort({ createdAt: -1 }).exec();
    return docs.map((doc) => this.present(doc));
  }

  async findById(id: string): Promise<NewsletterResponse | null> {
    const doc = await this.model.findById(id).exec();
    return doc ? this.present(doc) : null;
  }

  /** Public detail — unpublished issues 404, same convention as blog. */
  async findBySlugPublic(slug: string): Promise<NewsletterResponse> {
    const doc = await this.model.findOne({ slug, published: true }).exec();
    if (!doc) throw new NotFoundException(`No newsletter with slug "${slug}"`);
    return this.present(doc);
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
      return this.present(doc);
    }

    const created = await this.model.create({
      ...data,
      slug: data.slug ?? slugify(dto.title!),
    });
    return this.present(created);
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
