import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { slugify } from '../../common/utils/slugify';
import { Training, TrainingDocument } from './entities/training.entity';
import { SaveTrainingDto } from './dto/save-training.dto';

/** As much of a facilitator as each reader credits: a name for the admin
 * list's column, a whole card for the public page. */
type TrainerName = { _id: Types.ObjectId; name: string };
type TrainerCard = TrainerName & {
  title: string;
  bio: string;
  photo: string;
  linkedin: string | null;
};

/**
 * What the two detail readers hand back. Both are spelled out rather than
 * inferred because this module is compiled with `declaration: true`, and the
 * type of a spread lean() document is far too large for the compiler to write
 * into a .d.ts (TS7056) — the same reason findAll() below is annotated.
 */
type AdminTraining = Omit<Training, 'trainerIds'> & {
  _id: Types.ObjectId;
  trainerIds: string[];
};
type PublicTraining = Omit<Training, 'trainerIds'> & {
  _id: Types.ObjectId;
  trainers: (Omit<TrainerCard, '_id'> & { _id: string })[];
};

/**
 * populate() keeps the path's own name, so facilitators come back sitting on
 * `trainerIds` where ids used to be. Both readers re-key them to `trainers`
 * and hand the id back as a plain string, so no caller has to tell a populated
 * document from the id it replaced — and the same row never ships the same
 * people twice.
 *
 * The `?? []` is not belt-and-braces: lean() reads what is stored and applies
 * no schema default, so a training written before the facilitators became a
 * list — one that has not been through `npm run migrate:trainers` — has no
 * array at all.
 */
const asTrainers = <T extends { _id: Types.ObjectId }>(rows: T[] | undefined) =>
  (rows ?? []).map(({ _id, ...rest }) => ({ _id: String(_id), ...rest }));

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
  ) {}

  /** Public list: published only, display order first (matches the Prisma
   * query the old `/trainings` page used). */
  findPublished() {
    return this.model.find({ published: true }).sort({ sortOrder: 1 }).exec();
  }

  /** Admin list: everything, newest edits first, facilitators populated and
   * `registrationCount` attached (one aggregation — the old admin page
   * displayed both via Prisma's include/_count, the SPA list needs them in
   * the document). `enrolmentCount` is the seats actually allocated across the
   * training's runs, withdrawn ones excluded: an enquiry and the seat later
   * allocated from it are the same person, so the two are kept apart rather
   * than summed. */
  async findAll(): Promise<
    (Omit<Training, 'trainerIds'> & {
      registrationCount: number;
      enrolmentCount: number;
      trainers: { _id: string; name: string }[];
    })[]
  > {
    const [docs, registrations, enrolments] = await Promise.all([
      this.model
        .find()
        .sort({ updatedAt: -1 })
        .populate<{ trainerIds: TrainerName[] }>('trainerIds', 'name')
        .lean()
        .exec(),
      this.model.db
        .collection('registrations')
        .aggregate([{ $group: { _id: '$trainingId', count: { $sum: 1 } } }])
        .toArray(),
      this.model.db
        .collection('enrolments')
        .aggregate([
          { $match: { status: { $ne: 'withdrawn' } } },
          { $group: { _id: '$trainingId', count: { $sum: 1 } } },
        ])
        .toArray(),
    ]);
    const countsById = (rows: { _id: unknown; count: number }[]) =>
      new Map(rows.map((c) => [String(c._id), c.count]));
    const registrationsById = countsById(registrations as { _id: unknown; count: number }[]);
    const enrolmentsById = countsById(enrolments as { _id: unknown; count: number }[]);
    return docs.map(({ trainerIds, ...d }) => ({
      ...d,
      registrationCount: registrationsById.get(String(d._id)) ?? 0,
      enrolmentCount: enrolmentsById.get(String(d._id)) ?? 0,
      trainers: asTrainers(trainerIds),
    }));
  }

  /** Admin detail, read by the edit form — `trainerIds` as plain string ids,
   * because that is what the picker compares its options against. */
  async findById(id: string): Promise<AdminTraining | null> {
    const doc = await this.model.findById(id).lean().exec();
    if (!doc) return null;
    return { ...doc, trainerIds: (doc.trainerIds ?? []).map((t) => String(t)) };
  }

  /** Public detail — unpublished trainings 404 just like the old page's
   * `published:true` Prisma where-clause did. Facilitators are populated so
   * the public page can render a card for each, in the stored order. */
  async findBySlugPublic(slug: string): Promise<PublicTraining> {
    const doc = await this.model
      .findOne({ slug, published: true })
      .populate<{ trainerIds: TrainerCard[] }>('trainerIds', 'name title bio photo linkedin')
      .lean()
      .exec();
    if (!doc) throw new NotFoundException(`No training with slug "${slug}"`);
    const { trainerIds, ...training } = doc;
    return { ...training, trainers: asTrainers(trainerIds) };
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

    // Order is carried through exactly as sent — it is the order the public
    // page credits them in. An id that isn't one is dropped rather than
    // refused, as the single `trainerId` was: a facilitator deleted between
    // the form loading and saving should not cost the admin the whole edit.
    const trainerIds = dto.trainerIds
      ?.filter((t) => Types.ObjectId.isValid(t))
      .map((t) => new Types.ObjectId(t));

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
      ...(dto.trainerIds !== undefined && { trainerIds }),
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

  /** Sweeps the curriculum with it. Reached by raw collection name, the same
   * way findAll() above counts registrations and enrolments — this module
   * does not register the course-content schemas, and requiring it to would
   * couple the two for one deleteMany. */
  async remove(id: string) {
    const doc = await this.model.findByIdAndDelete(id).exec();
    if (!doc) throw new NotFoundException(`No training with id "${id}"`);
    const db = this.model.db;
    await Promise.all([
      db.collection('coursemodules').deleteMany({ trainingId: doc._id }),
      db.collection('courseitems').deleteMany({ trainingId: doc._id }),
    ]);
    return doc;
  }
}
