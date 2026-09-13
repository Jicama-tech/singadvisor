import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { randomUUID } from 'crypto';
import { AnyBulkWriteOperation, FilterQuery, Model, Types } from 'mongoose';
import { pickFields } from '../../common/utils/pick-fields';
import { Training, TrainingDocument } from '../trainings/entities/training.entity';
import {
  CourseModule,
  CourseModuleDocument,
} from './entities/course-module.entity';
import {
  CourseAttachment,
  CourseItem,
  CourseItemDocument,
  CourseItemKind,
} from './entities/course-item.entity';
import { CreateCourseModuleDto } from './dto/create-course-module.dto';
import { UpdateCourseModuleDto } from './dto/update-course-module.dto';
import { CreateCourseItemDto } from './dto/create-course-item.dto';
import { UpdateCourseItemDto } from './dto/update-course-item.dto';
import { ReorderOutlineDto } from './dto/reorder-outline.dto';
import { SetPublishedDto } from './dto/set-published.dto';

/** Fields copied from a DTO as sent — see pickFields. */
const MODULE_NULLABLE: string[] = [];
const MODULE_REQUIRED = ['title', 'summary', 'published'];

const ITEM_NULLABLE = ['lessonHeading', 'releaseOnDay', 'videoUrl', 'dueOnDay'];
const ITEM_REQUIRED = [
  'title',
  'summary',
  'estimatedMins',
  'releaseRule',
  'optional',
  'previewFree',
  'published',
  'graded',
  'gradeWeight',
  'passMarkPct',
  'videoProvider',
  'body',
  'attemptsAllowed',
  'shuffleQuestions',
  'submissionType',
];

/** Ordered reads always break the sortOrder tie the same way — sortOrder is
 * deliberately not unique (see CourseModule.sortOrder), so without _id a
 * duplicate would render in a different order on every load. */
const ORDERED = { sortOrder: 1 as const, _id: 1 as const };

/** The reorder payload has to name exactly what the course holds today — see
 * reorder() for why a partial one is not accepted. */
function assertSameSet(sent: string[], held: string[], message: string) {
  if (sent.length !== held.length || new Set(sent).size !== sent.length) {
    throw new BadRequestException(message);
  }
  const heldSet = new Set(held);
  for (const id of sent) if (!heldSet.has(id)) throw new BadRequestException(message);
}

type CourseModuleLean = CourseModule & { _id: Types.ObjectId };
type CourseItemLean = CourseItem & { _id: Types.ObjectId };

/**
 * One item's fields ready to be written as a new row. The _id and the
 * timestamps Mongo mints fresh are dropped, and every embedded id is minted
 * again rather than shared with the original: an option id is what a future
 * answer record points at, and two rows both answering "option abc" would be
 * indistinguishable. The copy always arrives unpublished — the point of
 * duplicating something is to edit it first.
 *
 * `title` and `lessonHeading` are left to the callers, because the two
 * duplicate endpoints want different things from them.
 */
function detachedItem(item: CourseItemLean & { __v?: number }) {
  const { _id, __v, createdAt, updatedAt, ...rest } = item;
  return {
    ...rest,
    published: false,
    questions: rest.questions.map((q) => ({
      ...q,
      id: randomUUID(),
      options: q.options.map((o) => ({ ...o, id: randomUUID() })),
    })),
    attachments: rest.attachments.map((a) => ({ ...a, id: randomUUID() })),
  };
}

/** The five figures the Content tab shows against a course, and the footer of
 * the builder: the same numbers either way, so the same shape. */
type CurriculumTotals = {
  moduleCount: number;
  itemCount: number;
  publishedItemCount: number;
  totalMins: number;
  gradeWeightTotal: number;
};

type CurriculumSummary = CurriculumTotals & { trainingId: string };

type CurriculumTree = {
  /** Read-only, and `modules` here is the brochure "Session outline", not this
   * curriculum: the builder's empty state offers to seed from it. Nothing in
   * this module ever writes Training.modules back — see seedFromOutline. */
  training: {
    _id: Types.ObjectId;
    title: string;
    slug: string;
    published: boolean;
    durationHrs: number;
    modules: string[];
  };
  modules: (CourseModuleLean & { items: CourseItemLean[] })[];
  totals: CurriculumTotals;
};

/** What a public caller may see of an item. Everything below `attachmentCount`
 * is present only on a previewFree row — see publicItem. */
type PublicItem = {
  _id: Types.ObjectId;
  sortOrder: number;
  lessonHeading: string | null;
  kind: CourseItemKind;
  title: string;
  summary: string;
  estimatedMins: number;
  optional: boolean;
  graded: boolean;
  gradeWeight: number;
  previewFree: boolean;
  releaseRule: string;
  releaseOnDay: number | null;
  dueOnDay: number | null;
  submissionType: string;
  questionCount: number;
  attachmentCount: number;
  videoUrl?: string | null;
  videoProvider?: string;
  body?: string;
  attachments?: CourseAttachment[];
  questions?: {
    id: string;
    type: string;
    prompt: string;
    points: number;
    options: { id: string; text: string }[];
  }[];
};

type PublicCurriculum = {
  trainingId: string;
  title: string;
  slug: string;
  modules: {
    _id: Types.ObjectId;
    title: string;
    summary: string;
    sortOrder: number;
    items: PublicItem[];
  }[];
};

/**
 * The curriculum authored under Trainings → Content: modules and their
 * polymorphic items.
 *
 * Admin editing needs a signed-in session and nothing more, the same
 * permission model as TrainingsService. Every rule that spans fields is
 * enforced here rather than in the DTOs, because it has to be checked against
 * the item as it will be after the write, not just the fields in the request —
 * the CourseRunsService.assertRunCoherent precedent.
 */
@Injectable()
export class CourseContentService {
  constructor(
    @InjectModel(CourseModule.name)
    private readonly moduleModel: Model<CourseModuleDocument>,
    @InjectModel(CourseItem.name)
    private readonly itemModel: Model<CourseItemDocument>,
    @InjectModel(Training.name)
    private readonly trainingModel: Model<TrainingDocument>,
  ) {}

  /** The Content tab's list: one row per course that has any curriculum at
   * all. Two aggregations merged in memory — never a query per course. */
  async summary(): Promise<CurriculumSummary[]> {
    const [modules, items] = await Promise.all([
      this.moduleModel.aggregate<{ _id: Types.ObjectId; moduleCount: number }>([
        { $group: { _id: '$trainingId', moduleCount: { $sum: 1 } } },
      ]),
      this.itemModel.aggregate<
        { _id: Types.ObjectId } & Omit<CurriculumTotals, 'moduleCount'>
      >([
        {
          $group: {
            _id: '$trainingId',
            itemCount: { $sum: 1 },
            publishedItemCount: { $sum: { $cond: ['$published', 1, 0] } },
            totalMins: { $sum: '$estimatedMins' },
            gradeWeightTotal: { $sum: { $cond: ['$graded', '$gradeWeight', 0] } },
          },
        },
      ]),
    ]);

    const moduleCounts = new Map(modules.map((m) => [String(m._id), m.moduleCount]));
    const itemCounts = new Map(items.map((i) => [String(i._id), i]));
    // A course with modules but no items yet still gets a row, and so does one
    // whose modules were all deleted mid-edit but whose items linger.
    return [...new Set([...moduleCounts.keys(), ...itemCounts.keys()])].map((trainingId) => {
      const counts = itemCounts.get(trainingId);
      return {
        trainingId,
        moduleCount: moduleCounts.get(trainingId) ?? 0,
        itemCount: counts?.itemCount ?? 0,
        publishedItemCount: counts?.publishedItemCount ?? 0,
        totalMins: counts?.totalMins ?? 0,
        gradeWeightTotal: counts?.gradeWeightTotal ?? 0,
      };
    });
  }

  /** The whole outline for the builder. Two queries however deep the tree
   * gets, which is exactly what the denormalized CourseItem.trainingId buys —
   * a lookup per module would be N+1. */
  async findTree(trainingId: string): Promise<CurriculumTree> {
    const training = await this.loadTraining(trainingId);
    const [modules, items] = await Promise.all([
      this.moduleModel
        .find({ trainingId: training._id })
        .sort(ORDERED)
        .lean<CourseModuleLean[]>()
        .exec(),
      this.itemModel
        .find({ trainingId: training._id })
        .sort(ORDERED)
        .lean<CourseItemLean[]>()
        .exec(),
    ]);

    const byModule = new Map<string, CourseItemLean[]>();
    for (const item of items) {
      const key = String(item.courseModuleId);
      byModule.set(key, [...(byModule.get(key) ?? []), item]);
    }

    return {
      training: {
        _id: training._id,
        title: training.title,
        slug: training.slug,
        published: training.published,
        durationHrs: training.durationHrs,
        modules: training.modules,
      },
      modules: modules.map((m) => ({
        ...m,
        items: byModule.get(String(m._id)) ?? [],
      })),
      totals: {
        moduleCount: modules.length,
        itemCount: items.length,
        publishedItemCount: items.filter((i) => i.published).length,
        totalMins: items.reduce((sum, i) => sum + i.estimatedMins, 0),
        gradeWeightTotal: items.reduce((sum, i) => sum + (i.graded ? i.gradeWeight : 0), 0),
      },
    };
  }

  async createModule(trainingId: string, dto: CreateCourseModuleDto) {
    const training = await this.loadTraining(trainingId);
    return new this.moduleModel({
      ...this.moduleFields(dto),
      trainingId: training._id,
      sortOrder:
        dto.sortOrder ??
        (await this.nextSortOrder<CourseModuleDocument>(this.moduleModel, {
          trainingId: training._id,
        })),
    }).save();
  }

  async updateModule(id: string, dto: UpdateCourseModuleDto) {
    const mod = await this.loadModule(id);
    mod.set(this.moduleFields(dto));
    return mod.save();
  }

  /** Not refused, unlike a course run with enrolments: nothing downstream
   * points at a module. The admin's confirm dialog names the item count
   * instead, so the cascade is stated before it happens. */
  async removeModule(id: string) {
    const mod = await this.loadModule(id);
    await this.itemModel.deleteMany({ courseModuleId: mod._id }).exec();
    await mod.deleteOne();
    return mod;
  }

  /** A whole week copied to the end of the outline, items and all. The lesson
   * groupings come with it — a duplicated module is a template, and its
   * dividers are half of what makes it one. */
  async duplicateModule(id: string) {
    const source = await this.loadModule(id);
    const copy = await new this.moduleModel({
      trainingId: source.trainingId,
      sortOrder: await this.nextSortOrder<CourseModuleDocument>(this.moduleModel, {
        trainingId: source.trainingId,
      }),
      title: `${source.title} (copy)`,
      summary: source.summary,
      published: false,
    }).save();

    const items = await this.itemModel
      .find({ courseModuleId: source._id })
      .sort(ORDERED)
      .exec();
    await this.itemModel.insertMany(
      items.map((item) => ({
        ...detachedItem(item.toObject()),
        courseModuleId: copy._id,
      })),
    );
    // The copy starts canonical whatever state the original's numbering had
    // drifted into.
    await this.renumber(copy._id);
    return this.findTree(String(source.trainingId));
  }

  /**
   * Publishes (or unpublishes) a module and everything in it, and reports what
   * it could not take live. Partial with a report, never all-or-nothing:
   * refusing forty items because item seven has no video link is the wrong
   * tool for the end of a build. Unpublishing runs no coherence check at all,
   * so a broken item can always be taken back down.
   *
   * `published` in the result counts the items actually written, whichever way
   * they were written; `skipped` names the rest and says why.
   */
  async publishAllInModule(id: string, dto: SetPublishedDto) {
    const mod = await this.loadModule(id);
    mod.published = dto.published;
    await mod.save();

    const items = await this.itemModel
      .find({ courseModuleId: mod._id })
      .sort(ORDERED)
      .exec();
    const skipped: { title: string; reason: string }[] = [];
    let published = 0;
    for (const item of items) {
      try {
        if (dto.published) {
          this.assertItemCoherent({ ...item.toObject(), published: true });
        }
        item.published = dto.published;
        await item.save();
        published += 1;
      } catch (err) {
        if (!(err instanceof BadRequestException)) throw err;
        skipped.push({ title: item.title, reason: err.message });
      }
    }
    return { tree: await this.findTree(String(mod.trainingId)), published, skipped };
  }

  async createItem(moduleId: string, dto: CreateCourseItemDto) {
    const mod = await this.loadModule(moduleId);
    // `new` rather than create() so the schema defaults are in place before
    // the coherence check reads them.
    const item = new this.itemModel({
      ...this.itemFields(dto),
      // Create-only; the update DTO omits it. See UpdateCourseItemDto.
      kind: dto.kind,
      courseModuleId: mod._id,
      // Copied from the parent, never taken from the client.
      trainingId: mod.trainingId,
      sortOrder:
        dto.sortOrder ??
        (await this.nextSortOrder<CourseItemDocument>(this.itemModel, {
          courseModuleId: mod._id,
        })),
    });
    this.assertItemCoherent(item);
    await item.save();
    await this.renumber(mod._id);
    return item;
  }

  async updateItem(id: string, dto: UpdateCourseItemDto) {
    const item = await this.loadItem(id);
    item.set(this.itemFields(dto));
    this.assertItemCoherent(item);
    return item.save();
  }

  async removeItem(id: string) {
    const item = await this.loadItem(id);
    await this.bequeathHeading(item.courseModuleId, new Set([String(item._id)]));
    await item.deleteOne();
    await this.renumber(item.courseModuleId);
    return item;
  }

  /** A variation on the item, landing directly beneath it. */
  async duplicateItem(id: string) {
    const source = await this.loadItem(id);
    await new this.itemModel({
      ...detachedItem(source.toObject()),
      title: `${source.title} (copy)`,
      // The copy joins whatever lesson the original belongs to rather than
      // opening one of its own.
      lessonHeading: null,
      // Slots in immediately after the original; renumber() turns the halves
      // back into 1..n.
      sortOrder: source.sortOrder + 0.5,
    }).save();
    await this.renumber(source.courseModuleId);
    return this.findTree(String(source.trainingId));
  }

  /** The one structural write: the whole outline as the builder now has it,
   * modules renumbered and every item placed under the module it now sits in. */
  async reorder(trainingId: string, dto: ReorderOutlineDto) {
    const training = await this.loadTraining(trainingId);
    const [modules, items] = await Promise.all([
      this.moduleModel.find({ trainingId: training._id }).select('_id').lean().exec(),
      this.itemModel.find({ trainingId: training._id }).exec(),
    ]);

    const STALE =
      'This course changed somewhere else while you were reordering it. Reload the page and try again.';
    // The payload must name exactly what the course holds today. A stale tab
    // that omits a row someone else just added would otherwise strand it at
    // whatever sortOrder it had, invisible between two groups.
    assertSameSet(
      dto.modules.map((m) => m.id),
      modules.map((m) => String(m._id)),
      STALE,
    );
    assertSameSet(
      dto.modules.flatMap((m) => m.itemIds),
      items.map((i) => String(i._id)),
      STALE,
    );

    const byId = new Map(items.map((i) => [String(i._id), i]));
    // Heading migration reads the OLD layout, so it has to run before the
    // bulkWrites move anything.
    const leavingPerModule = new Map<string, Set<string>>();
    for (const m of dto.modules)
      for (const itemId of m.itemIds) {
        const item = byId.get(itemId)!;
        if (String(item.courseModuleId) !== m.id) {
          const key = String(item.courseModuleId);
          leavingPerModule.set(key, (leavingPerModule.get(key) ?? new Set()).add(itemId));
        }
      }
    // One call per SOURCE module, never one per departing row: the whole set
    // has to be resolved against the same view of the module — see
    // bequeathHeading.
    for (const [moduleId, leaving] of leavingPerModule)
      await this.bequeathHeading(new Types.ObjectId(moduleId), leaving);

    const moduleWrites: AnyBulkWriteOperation<CourseModule>[] = dto.modules.map((m, mi) => ({
      updateOne: {
        filter: { _id: new Types.ObjectId(m.id) },
        update: { sortOrder: mi + 1 },
      },
    }));
    const itemWrites: AnyBulkWriteOperation<CourseItem>[] = dto.modules.flatMap((m) =>
      m.itemIds.map((itemId, ii) => ({
        updateOne: {
          filter: { _id: new Types.ObjectId(itemId) },
          update: { courseModuleId: new Types.ObjectId(m.id), sortOrder: ii + 1 },
        },
      })),
    );
    // Two bulkWrites, not a transaction — standalone mongod (see
    // app.module.ts). A failure between them leaves modules renumbered and
    // items not; the next reorder fixes it, and no row is lost either way
    // because every row is named in the payload.
    if (moduleWrites.length) await this.moduleModel.bulkWrite(moduleWrites);
    if (itemWrites.length) await this.itemModel.bulkWrite(itemWrites);
    return this.findTree(trainingId);
  }

  /**
   * Bootstraps a curriculum from the brochure "Session outline" — one empty
   * module per line, so the admin starts from the promise the marketing page
   * already makes rather than a blank page.
   *
   * The one bridge between the two, and it runs ONE WAY: this reads
   * Training.modules and nothing here ever writes it. That field stays the
   * brochure's, and the training form blanks whatever it was not shown.
   */
  async seedFromOutline(trainingId: string) {
    const training = await this.loadTraining(trainingId);
    if (await this.moduleModel.exists({ trainingId: training._id })) {
      throw new BadRequestException(
        'This course already has content. The Session outline can only seed an empty curriculum.',
      );
    }
    await this.moduleModel.insertMany(
      training.modules.map((title, i) => ({
        trainingId: training._id,
        title,
        sortOrder: i + 1,
        published: false,
      })),
    );
    return this.findTree(trainingId);
  }

  /** Public — the curriculum as it appears on a training's page. Unpublished
   * trainings, modules and items are all absent, and everything a visitor has
   * not paid for is stripped row by row in publicItem. */
  async findPublicBySlug(slug: string): Promise<PublicCurriculum> {
    const training = await this.trainingModel
      .findOne({ slug, published: true })
      .select('_id title slug')
      .lean<{ _id: Types.ObjectId; title: string; slug: string } | null>()
      .exec();
    if (!training) throw new NotFoundException(`No training with slug "${slug}"`);

    const modules = await this.moduleModel
      .find({ trainingId: training._id, published: true })
      .sort(ORDERED)
      .lean<CourseModuleLean[]>()
      .exec();
    const items = await this.itemModel
      .find({ courseModuleId: { $in: modules.map((m) => m._id) }, published: true })
      .sort(ORDERED)
      .lean<CourseItemLean[]>()
      .exec();

    const byModule = new Map<string, CourseItemLean[]>();
    for (const item of items) {
      const key = String(item.courseModuleId);
      byModule.set(key, [...(byModule.get(key) ?? []), item]);
    }

    return {
      trainingId: String(training._id),
      title: training.title,
      slug: training.slug,
      modules: modules.map((m) => ({
        _id: m._id,
        title: m.title,
        summary: m.summary,
        sortOrder: m.sortOrder,
        items: (byModule.get(String(m._id)) ?? []).map((i) => this.publicItem(i)),
      })),
    };
  }

  /** Path ids that are not ObjectIds would otherwise surface as a Mongoose
   * CastError (a 500); they can only ever name nothing, so they 404. */
  private async loadTraining(id: string) {
    const doc = Types.ObjectId.isValid(id)
      ? await this.trainingModel.findById(id).exec()
      : null;
    if (!doc) throw new NotFoundException(`No training with id "${id}"`);
    return doc;
  }

  private async loadModule(id: string) {
    const doc = Types.ObjectId.isValid(id)
      ? await this.moduleModel.findById(id).exec()
      : null;
    if (!doc) throw new NotFoundException(`No course module with id "${id}"`);
    return doc;
  }

  private async loadItem(id: string) {
    const doc = Types.ObjectId.isValid(id)
      ? await this.itemModel.findById(id).exec()
      : null;
    if (!doc) throw new NotFoundException(`No course item with id "${id}"`);
    return doc;
  }

  private moduleFields(dto: UpdateCourseModuleDto) {
    return pickFields(dto, MODULE_NULLABLE, MODULE_REQUIRED);
  }

  private itemFields(dto: UpdateCourseItemDto) {
    return {
      ...pickFields(dto, ITEM_NULLABLE, ITEM_REQUIRED),
      // Empty strings from the form mean "cleared", stored as null.
      ...(dto.videoUrl !== undefined && { videoUrl: dto.videoUrl || null }),
      ...(dto.lessonHeading !== undefined && {
        lessonHeading: dto.lessonHeading || null,
      }),
      // A brand-new question, option or attachment arrives with no id — the
      // service mints it, as EventsService does for ticket tiers.
      ...(dto.questions !== undefined && {
        questions: dto.questions.map((q) => ({
          ...q,
          id: q.id || randomUUID(),
          options: (q.options ?? []).map((o) => ({ ...o, id: o.id || randomUUID() })),
        })),
      }),
      ...(dto.attachments !== undefined && {
        attachments: dto.attachments.map((a) => ({ ...a, id: a.id || randomUUID() })),
      }),
    };
  }

  /**
   * Everything `kind` implies about the rest of the document, checked against
   * the item as it will be after the write. Nothing here is a DTO rule: which
   * fields matter depends on a field the update DTO cannot even change.
   *
   * gradeWeight is checked only for being above zero on a graded item — the
   * course-wide total is deliberately NOT required to reach 100, because every
   * intermediate state of a legitimate re-weighting would fail it. The builder
   * warns instead.
   */
  private assertItemCoherent(item: CourseItem) {
    if (item.optional && item.graded) {
      throw new BadRequestException('An optional item cannot be graded.');
    }
    if (item.graded && item.gradeWeight <= 0) {
      throw new BadRequestException('A graded item needs a weight above 0%.');
    }
    if (item.releaseRule === 'on-day' && item.releaseOnDay == null) {
      throw new BadRequestException(
        'Choose which day of the run this item is released on.',
      );
    }
    if (!item.published) return;

    if (item.kind === 'video' && !item.videoUrl) {
      throw new BadRequestException(
        'A video item needs a video link before it can be published.',
      );
    }
    if (item.kind === 'resource' && item.attachments.length === 0) {
      throw new BadRequestException(
        'A resource item needs at least one file or link before it can be published.',
      );
    }
    if (item.kind !== 'quiz') return;

    if (item.questions.length === 0) {
      throw new BadRequestException(
        'A quiz needs at least one question before it can be published.',
      );
    }
    item.questions.forEach((question, index) => {
      const n = index + 1;
      const correct = question.options.filter((o) => o.correct).length;
      if (question.type === 'true-false' && question.options.length !== 2) {
        throw new BadRequestException(`Question ${n} must have exactly two options.`);
      }
      if (
        (question.type === 'single' || question.type === 'true-false') &&
        correct !== 1
      ) {
        throw new BadRequestException(`Question ${n} needs exactly one correct answer.`);
      }
      if (question.type === 'multiple' && correct === 0) {
        throw new BadRequestException(`Question ${n} has no correct answer.`);
      }
    });
  }

  /**
   * The lesson-divider migration rule from CourseItem.lessonHeading: an item
   * that carries a heading and is about to leave its module hands it to the
   * item that follows it there, so the group survives its own opener. Called
   * before every delete and before every cross-module move.
   *
   * `leavingIds` is every row leaving THIS module in the same operation — a
   * heading handed to one of those would just leave with it — and all of them
   * are resolved against ONE read of the module, then written once. A query
   * per departing row cannot work: two openers can leave the same module in a
   * single reorder, and by the time the second is looked at the first bequest
   * is already on the heir, which reads as a heading of its own and drops the
   * nearer of the two. Resolved together, the heir's own heading is the only
   * thing that blocks a bequest, and the last opener above it wins — which is
   * the group the heir was already sitting in.
   *
   * Walking the module in memory also reads "the item that follows" the way
   * every other read here does, by { sortOrder, _id }: sortOrder is not unique
   * (see CourseModule.sortOrder), so `sortOrder > mine` would skip a tied
   * neighbour that genuinely follows.
   */
  private async bequeathHeading(courseModuleId: Types.ObjectId, leavingIds: Set<string>) {
    const items = await this.itemModel
      .find({ courseModuleId })
      .sort(ORDERED)
      .select('lessonHeading')
      .lean<{ _id: Types.ObjectId; lessonHeading?: string | null }[]>()
      .exec();

    const bequests = new Map<string, string>();
    items.forEach((item, index) => {
      if (!item.lessonHeading || !leavingIds.has(String(item._id))) return;
      const heir = items.find((f, fi) => fi > index && !leavingIds.has(String(f._id)));
      // An heir that already opens a group of its own keeps it — the departing
      // heading simply ends. Truthiness rather than `=== null` because a lean
      // read applies no schema default, so a row written before the field
      // existed comes back undefined rather than null.
      if (heir && !heir.lessonHeading) bequests.set(String(heir._id), item.lessonHeading);
    });
    if (!bequests.size) return;

    const writes: AnyBulkWriteOperation<CourseItem>[] = [...bequests].map(
      ([id, lessonHeading]) => ({
        updateOne: { filter: { _id: new Types.ObjectId(id) }, update: { lessonHeading } },
      }),
    );
    await this.itemModel.bulkWrite(writes);
  }

  /** The nextSequence idiom, over whichever of the two collections is being
   * appended to — hence the model argument, and hence the explicit type
   * argument at each call site: Mongoose's Model is invariant in its document
   * type, so nothing is inferred from the filter. A convenience rather than a
   * guarantee: sortOrder is not unique-indexed, for the reason
   * CourseModule.sortOrder gives. */
  private async nextSortOrder<T>(model: Model<T>, filter: FilterQuery<T>) {
    const last = await model
      .findOne(filter)
      .sort({ sortOrder: -1 })
      .select('sortOrder')
      .lean<{ sortOrder?: number } | null>()
      .exec();
    return (last?.sortOrder ?? 0) + 1;
  }

  /** Rewrites one module's items to 1..n in their current order, closing the
   * gap a delete leaves and resolving the half-step a duplicate inserts.
   * Called after every create, delete and duplicate. */
  private async renumber(courseModuleId: Types.ObjectId) {
    const items = await this.itemModel
      .find({ courseModuleId })
      .sort(ORDERED)
      .select('_id')
      .lean<{ _id: Types.ObjectId }[]>()
      .exec();
    if (!items.length) return;
    const writes: AnyBulkWriteOperation<CourseItem>[] = items.map((item, i) => ({
      updateOne: { filter: { _id: item._id }, update: { sortOrder: i + 1 } },
    }));
    await this.itemModel.bulkWrite(writes);
  }

  /**
   * The gated payload is stripped PER ROW in JS, not with a select-exclusion:
   * a Mongoose projection applies to every document in the query, and a
   * previewFree item must keep the very fields a paid one loses. The answer
   * key (`correct`, `explanation`) is stripped from EVERY item, preview
   * included — it must never ship in a page payload.
   */
  private publicItem(i: CourseItemLean): PublicItem {
    const base = {
      _id: i._id,
      sortOrder: i.sortOrder,
      lessonHeading: i.lessonHeading,
      kind: i.kind,
      title: i.title,
      summary: i.summary,
      estimatedMins: i.estimatedMins,
      optional: i.optional,
      graded: i.graded,
      gradeWeight: i.gradeWeight,
      previewFree: i.previewFree,
      releaseRule: i.releaseRule,
      releaseOnDay: i.releaseOnDay,
      dueOnDay: i.dueOnDay,
      submissionType: i.submissionType,
      questionCount: i.questions.length,
      attachmentCount: i.attachments.length,
    };
    if (!i.previewFree) return base;
    return {
      ...base,
      videoUrl: i.videoUrl,
      videoProvider: i.videoProvider,
      body: i.body,
      attachments: i.attachments,
      questions: i.questions.map((q) => ({
        id: q.id,
        type: q.type,
        prompt: q.prompt,
        points: q.points,
        options: q.options.map((o) => ({ id: o.id, text: o.text })),
      })),
    };
  }
}
