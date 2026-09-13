import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Trainer, TrainerDocument } from './entities/trainer.entity';
import { SaveTrainerDto } from './dto/save-trainer.dto';

type TrainerWithCounts = Trainer & {
  _id: Types.ObjectId;
  trainingCount: number;
  postCount: number;
};

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;
const listOf = (items: string[]) =>
  items.length > 1 ? `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}` : items[0];

/**
 * Facilitators — the people a Training names as its facilitator, a course run
 * or session names as its trainer on the day, and older blog posts credit as
 * author. Same permission model as TrainingsService: a signed-in session.
 */
@Injectable()
export class TrainersService {
  constructor(
    @InjectModel(Trainer.name)
    private readonly model: Model<TrainerDocument>,
  ) {}

  /** Everyone, by name, with how many trainings and blog posts point at each —
   * the admin list shows these so a blocked delete is no surprise. The
   * Training form's Facilitator picker reads this list too. */
  async findAll(): Promise<TrainerWithCounts[]> {
    const db = this.model.db;
    const [docs, trainings, posts] = await Promise.all([
      this.model.find().sort({ name: 1 }).lean<(Trainer & { _id: Types.ObjectId })[]>().exec(),
      db
        .collection('trainings')
        // One row per facilitator credited, so a course naming three counts
        // for all three. $unwind yields nothing for a course whose list is
        // empty or missing, which is exactly what such a course contributes.
        .aggregate([
          { $unwind: '$trainerIds' },
          { $group: { _id: '$trainerIds', count: { $sum: 1 } } },
        ])
        .toArray(),
      db
        .collection('blog-posts')
        .aggregate([{ $group: { _id: '$authorId', count: { $sum: 1 } } }])
        .toArray(),
    ]);
    // Keyed by the string form, and summed rather than set: on a Mixed path
    // (see usage() below) one person can come back as two groups — once as an
    // ObjectId and once as its string.
    const tally = (rows: { _id: unknown; count: number }[]) => {
      const byId = new Map<string, number>();
      for (const r of rows) byId.set(String(r._id), (byId.get(String(r._id)) ?? 0) + r.count);
      return byId;
    };
    const trainingsById = tally(trainings as { _id: unknown; count: number }[]);
    const postsById = tally(posts as { _id: unknown; count: number }[]);
    return docs.map((d) => ({
      ...d,
      trainingCount: trainingsById.get(String(d._id)) ?? 0,
      postCount: postsById.get(String(d._id)) ?? 0,
    }));
  }

  findById(id: string) {
    return this.load(id);
  }

  async save(dto: SaveTrainerDto, id?: string) {
    const name = dto.name?.trim();
    if ((!id || dto.name !== undefined) && !name) {
      throw new BadRequestException('Name is required.');
    }

    const data = {
      ...(name && { name }),
      ...(dto.title !== undefined && { title: dto.title?.trim() ?? '' }),
      ...(dto.bio !== undefined && { bio: dto.bio?.trim() ?? '' }),
      ...(dto.photo !== undefined && { photo: dto.photo ?? '' }),
      // An empty field on the form means "no profile", stored as null.
      ...(dto.linkedin !== undefined && { linkedin: dto.linkedin || null }),
    };

    if (id) {
      const doc = Types.ObjectId.isValid(id)
        ? await this.model.findByIdAndUpdate(id, data, { new: true, runValidators: true }).exec()
        : null;
      if (!doc) throw new NotFoundException(`No facilitator with id "${id}"`);
      return doc;
    }
    return this.model.create(data);
  }

  /**
   * Refused while anything still names this person, since each of those pages
   * would otherwise render a facilitator or author card with nobody in it.
   * Trainings and course runs can be reassigned from their own forms first.
   * Blog posts cannot — the editor's Author picker was retired for free-text
   * "Written by" fields — so a facilitator credited on an older post stays.
   */
  async remove(id: string) {
    const doc = await this.load(id);
    const used = await this.usage(doc._id);
    const reasons = [
      used.trainings && `the facilitator on ${plural(used.trainings, 'training')}`,
      used.runs && `the trainer for ${plural(used.runs, 'course run')}`,
      used.sessions && `the stand-in trainer for ${plural(used.sessions, 'session')}`,
      used.posts && `credited as author on ${plural(used.posts, 'blog post')}`,
    ].filter((r): r is string => Boolean(r));
    if (reasons.length) {
      const advice = [
        (used.trainings || used.runs || used.sessions) &&
          'Choose someone else on those trainings and course runs first.',
        used.posts && "A blog post's author can't be changed from the blog editor.",
      ].filter(Boolean);
      throw new BadRequestException(
        `${doc.name} can't be deleted while they are ${listOf(reasons)}. ${advice.join(' ')}`,
      );
    }
    await doc.deleteOne();
    return doc;
  }

  private async load(id: string) {
    const doc = Types.ObjectId.isValid(id) ? await this.model.findById(id).exec() : null;
    if (!doc) throw new NotFoundException(`No facilitator with id "${id}"`);
    return doc;
  }

  private async usage(id: Types.ObjectId) {
    // BlogPost.authorId is declared `type: Types.ObjectId`, which
    // @nestjs/mongoose builds as a Mixed path (see course-run.entity.ts), so a
    // reference may be stored as either an ObjectId or its string — and these
    // counts go through the raw driver, which casts neither. Match both rather
    // than trust one form.
    const ref = { $in: [id, String(id)] };
    const db = this.model.db;
    const [trainings, runs, sessions, posts] = await Promise.all([
      // A course credits a list of facilitators now, and this person is in use
      // if they appear anywhere in it. Counting the `trainerId` it replaced
      // would be worse than useless: nothing writes that field any more, so it
      // would miss every facilitator added since and go on refusing the delete
      // for courses they have already been taken off.
      db.collection('trainings').countDocuments({ trainerIds: ref }),
      db.collection('courseruns').countDocuments({ trainerId: ref }),
      db.collection('courserunsessions').countDocuments({ trainerId: ref }),
      db.collection('blog-posts').countDocuments({ authorId: ref }),
    ]);
    return { trainings, runs, sessions, posts };
  }
}
