import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { slugify } from '../../common/utils/slugify';
import { Training, TrainingDocument } from './entities/training.entity';
import { Trainer, TrainerDocument } from './entities/trainer.entity';
import { SaveTrainingDto } from './dto/save-training.dto';
import { SaveTrainerDto } from './dto/save-trainer.dto';

/**
 * Content editing here requires a signed-in admin session, so ownership is
 * "the session exists" — same permission model as the old `saveTraining`
 * server action (`requireSession()`), which had no per-admin scoping either.
 */
@Injectable()
export class TrainingsService {
  constructor(
    @InjectModel(Training.name)
    private readonly model: Model<TrainingDocument>,
    @InjectModel(Trainer.name)
    private readonly trainerModel: Model<TrainerDocument>,
  ) {}

  /** Public list: published only, display order first (matches the Prisma
   * query the old `/trainings` page used). */
  findPublished() {
    return this.model.find({ published: true }).sort({ sortOrder: 1 }).exec();
  }

  /** Admin list: everything, newest edits first, trainer populated and
   * `registrationCount` attached (one aggregation — the old admin page
   * displayed both via Prisma's include/_count, the SPA list needs them in
   * the document). */
  async findAll(): Promise<(Training & { registrationCount: number; trainer?: { name: string } | null })[]> {
    const [docs, counts] = await Promise.all([
      this.model.find().sort({ updatedAt: -1 }).populate('trainerId', 'name').lean().exec(),
      this.model.db
        .collection('registrations')
        .aggregate([{ $group: { _id: '$trainingId', count: { $sum: 1 } } }])
        .toArray(),
    ]);
    const byId = new Map(counts.map((c) => [String(c._id), c.count]));
    return docs.map((d) => ({
      ...(d as Training & { trainer?: { name: string } | null }),
      registrationCount: byId.get(String(d._id)) ?? 0,
    }));
  }

  findById(id: string) {
    return this.model.findById(id).exec();
  }

  /** Public detail — unpublished trainings 404 just like the old page's
   * `published:true` Prisma where-clause did. Trainer is populated so the
   * public page can render the facilitator card. */
  async findBySlugPublic(slug: string) {
    const doc = await this.model
      .findOne({ slug, published: true })
      .populate('trainerId', 'name title bio photo linkedin')
      .exec();
    if (!doc) throw new NotFoundException(`No training with slug "${slug}"`);
    return doc;
  }

  /** Picker list for the admin form's "Facilitator"/"Author" select. */
  findTrainers() {
    return this.trainerModel.find().sort({ name: 1 }).select('name title').exec();
  }

  findTrainerById(id: string) {
    return this.trainerModel.findById(id).exec();
  }

  /** Create or update a Trainer — the "+ New author" flow in the Blog editor
   * (and, potentially, a future Facilitator editor) writes here. `title` is
   * the free-text role/company line ("AI Full Stack Developer, Jicama
   * Tech"), shown next to the name in both the byline and the author card. */
  async saveTrainer(dto: SaveTrainerDto, id?: string) {
    if (!id && !dto.name) {
      throw new BadRequestException('Name is required.');
    }

    const data: Record<string, unknown> = {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.title !== undefined && { title: dto.title }),
      ...(dto.bio !== undefined && { bio: dto.bio }),
      ...(dto.photo !== undefined && { photo: dto.photo }),
      ...(dto.linkedin !== undefined && { linkedin: dto.linkedin }),
    };

    if (id) {
      const doc = await this.trainerModel
        .findByIdAndUpdate(id, data, { new: true, runValidators: true })
        .exec();
      if (!doc) throw new NotFoundException(`No author with id "${id}"`);
      return doc;
    }

    return this.trainerModel.create(data);
  }

  /** Blocked while any Training or BlogPost still references this author —
   * silently orphaning `trainerId`/`authorId` would leave a dangling
   * populate() on the public pages that referenced them. */
  async removeTrainer(id: string) {
    const [trainingCount, postCount] = await Promise.all([
      this.model.countDocuments({ trainerId: id }),
      this.trainerModel.db.collection('blog-posts').countDocuments({ authorId: new Types.ObjectId(id) }),
    ]);
    if (trainingCount > 0 || postCount > 0) {
      throw new BadRequestException(
        'This author is still assigned to a training or blog post — reassign those first.',
      );
    }
    const doc = await this.trainerModel.findByIdAndDelete(id).exec();
    if (!doc) throw new NotFoundException(`No author with id "${id}"`);
    return doc;
  }

  async save(dto: SaveTrainingDto, id?: string) {
    if (!id && !dto.title) {
      throw new BadRequestException('Title is required.');
    }

    let slug: string | undefined;
    if (dto.title || dto.slug) {
      slug = slugify(dto.slug || dto.title!);
      // Slugs are the public URL; a collision would silently break an
      // existing page (same guard the old server action had).
      const clash = await this.model.findOne({
        slug,
        ...(id ? { _id: { $ne: new Types.ObjectId(id) } } : {}),
      });
      if (clash) throw new BadRequestException('That slug is already in use.');
    }

    const trainerId =
      dto.trainerId && Types.ObjectId.isValid(dto.trainerId)
        ? new Types.ObjectId(dto.trainerId)
        : null;

    const data: Record<string, unknown> = {
      ...(slug !== undefined && { slug }),
      ...(dto.title !== undefined && { title: dto.title }),
      ...(dto.summary !== undefined && { summary: dto.summary }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.image !== undefined && { image: dto.image }),
      ...(dto.category !== undefined && { category: dto.category }),
      ...(dto.level !== undefined && { level: dto.level }),
      ...(dto.durationHrs !== undefined && { durationHrs: dto.durationHrs }),
      ...(dto.format !== undefined && { format: dto.format }),
      ...(dto.priceCents !== undefined && { priceCents: dto.priceCents }),
      ...(dto.currency !== undefined && { currency: dto.currency }),
      ...(dto.outcomes !== undefined && { outcomes: dto.outcomes }),
      ...(dto.modules !== undefined && { modules: dto.modules }),
      ...(dto.published !== undefined && { published: dto.published }),
      ...(dto.featured !== undefined && { featured: dto.featured }),
      ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
      ...(dto.trainerId !== undefined && { trainerId }),
    };

    if (id) {
      const doc = await this.model
        .findByIdAndUpdate(id, data, { new: true, runValidators: true })
        .exec();
      if (!doc) throw new NotFoundException(`No training with id "${id}"`);
      return doc;
    }

    return this.model.create({
      ...data,
      slug: data.slug ?? slugify(dto.title!),
      title: data.title ?? dto.title,
    });
  }

  async remove(id: string) {
    const doc = await this.model.findByIdAndDelete(id).exec();
    if (!doc) throw new NotFoundException(`No training with id "${id}"`);
    return doc;
  }
}
