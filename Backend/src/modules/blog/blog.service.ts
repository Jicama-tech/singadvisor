import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { slugify } from '../../common/utils/slugify';
import { normalizeSpaces } from '../../common/utils/normalize-spaces';
import { BlogPost, BlogPostDocument } from './entities/blog-post.entity';
import { SavePostDto } from './dto/save-post.dto';
import { GenerateBlogDto } from './dto/generate-blog.dto';
import { QwenService } from '../ai/qwen.service';

@Injectable()
export class BlogService {
  constructor(
    @InjectModel(BlogPost.name)
    private readonly model: Model<BlogPostDocument>,
    private readonly qwenService: QwenService,
  ) {}

  /** "Generate with AI" — draft content for the admin to edit before saving,
   * nothing is written to the database here. */
  generatePreview(dto: GenerateBlogDto) {
    return this.qwenService.generateBlogContent(dto.topic);
  }

  /** Public list: published only, newest first (the old Prisma query's
   * publishedAt ordering). */
  findPublished() {
    return this.model
      .find({ published: true })
      .sort({ publishedAt: -1, createdAt: -1 })
      .exec();
  }

  /** Admin list: everything, newest edits first. */
  findAll() {
    return this.model.find().sort({ updatedAt: -1 }).exec();
  }

  findById(id: string) {
    return this.model.findById(id).exec();
  }

  /** Public detail — unpublished posts 404, author populated for the byline. */
  async findBySlugPublic(slug: string) {
    const doc = await this.model
      .findOne({ slug, published: true })
      .populate('authorId', 'name title bio photo linkedin')
      .exec();
    if (!doc) throw new NotFoundException(`No post with slug "${slug}"`);
    return doc;
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
      return doc;
    }

    return this.model.create({
      ...data,
      slug: data.slug ?? slugify(dto.title!),
      title: data.title ?? dto.title,
      content: data.content ?? dto.content,
    });
  }

  async remove(id: string) {
    const doc = await this.model.findByIdAndDelete(id).exec();
    if (!doc) throw new NotFoundException(`No post with id "${id}"`);
    return doc;
  }
}
