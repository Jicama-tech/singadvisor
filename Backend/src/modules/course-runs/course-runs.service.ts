import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { pickFields } from '../../common/utils/pick-fields';
import { onDuplicate } from '../../common/utils/on-duplicate';
import { Training, TrainingDocument } from '../trainings/entities/training.entity';
import {
  Enrolment,
  EnrolmentDocument,
} from '../enrolments/entities/enrolment.entity';
import {
  SessionAttendance,
  SessionAttendanceDocument,
} from '../enrolments/entities/session-attendance.entity';
import { sfcClaimWindowClosesAt } from '../enrolments/sfc-claim-window';
import { CourseRun, CourseRunDocument } from './entities/course-run.entity';
import {
  CourseRunSession,
  CourseRunSessionDocument,
} from './entities/course-run-session.entity';
import {
  COURSE_RUN_STATUSES,
  CreateCourseRunDto,
} from './dto/create-course-run.dto';
import { UpdateCourseRunDto } from './dto/update-course-run.dto';
import { CreateSessionDto } from './dto/create-session.dto';
import { UpdateSessionDto } from './dto/update-session.dto';

/** Statuses a published run is listed under publicly. Draft is never public;
 * completed and cancelled runs stay on record but leave the listing. */
const PUBLIC_STATUSES = ['open', 'closed', 'running'];

/** Never sent to a public caller: the join link is for enrolled learners only
 * (see CourseRun.joinUrl), notes are internal, and the SSG ids and signature
 * sheet are reconciliation records, not something a learner quotes. */
const PRIVATE_RUN_FIELDS = '-notes -joinUrl -ssgCourseRunId';
const PRIVATE_SESSION_FIELDS = '-joinUrl -ssgSessionId -hardcopySheetPath';

type PublicSession = Omit<
  CourseRunSession,
  'joinUrl' | 'ssgSessionId' | 'hardcopySheetPath'
> & { _id: Types.ObjectId };

type PublicCourseRun = Omit<CourseRun, 'notes' | 'joinUrl' | 'ssgCourseRunId'> & {
  _id: Types.ObjectId;
  seatsLeft: number;
  sessions: PublicSession[];
};

/** Fields copied from a DTO as sent — see pickFields. */
const RUN_NULLABLE = [
  'venue',
  'address',
  'joinUrl',
  'registrationOpensAt',
  'registrationClosesAt',
  'tgsCourseRef',
  'ssgCourseRunId',
  'versionLabel',
  'notes',
];
const RUN_REQUIRED = [
  'status',
  'mode',
  'capacity',
  'fundingScheme',
  'currency',
  'fullFeeCents',
  'subsidyCents',
  'gstCents',
  'published',
];
const SESSION_NULLABLE = ['venue', 'joinUrl'];
const SESSION_REQUIRED = [
  'sequence',
  'title',
  'startsAt',
  'endsAt',
  'durationHours',
  'mode',
  'cancelled',
];

function toIdOrNull(id: string | null) {
  return id ? new Types.ObjectId(id) : null;
}

/**
 * Admin editing needs a signed-in session and nothing more, the same
 * permission model as TrainingsService. Every rule that spans fields is
 * enforced here rather than in the DTOs, because it has to be checked against
 * the run as it will be after the write, not just the fields in the request.
 */
@Injectable()
export class CourseRunsService {
  constructor(
    @InjectModel(CourseRun.name)
    private readonly model: Model<CourseRunDocument>,
    @InjectModel(CourseRunSession.name)
    private readonly sessionModel: Model<CourseRunSessionDocument>,
    @InjectModel(Training.name)
    private readonly trainingModel: Model<TrainingDocument>,
    @InjectModel(Enrolment.name)
    private readonly enrolmentModel: Model<EnrolmentDocument>,
    @InjectModel(SessionAttendance.name)
    private readonly attendanceModel: Model<SessionAttendanceDocument>,
  ) {}

  /** Public catalogue: upcoming published runs of published trainings, soonest
   * first, each with its sessions and remaining seats. A run whose last session
   * has passed drops out even if nobody has marked it completed yet. */
  async findPublic(trainingId?: string): Promise<PublicCourseRun[]> {
    if (trainingId && !Types.ObjectId.isValid(trainingId)) {
      throw new BadRequestException('Invalid trainingId');
    }
    const trainingIds = await this.trainingModel.distinct('_id', {
      published: true,
      ...(trainingId && { _id: new Types.ObjectId(trainingId) }),
    });

    const runs = await this.model
      .find({
        trainingId: { $in: trainingIds },
        published: true,
        status: { $in: PUBLIC_STATUSES },
        $or: [{ endsAt: null }, { endsAt: { $gte: new Date() } }],
      })
      .select(PRIVATE_RUN_FIELDS)
      .sort({ startsAt: 1 })
      .lean<Omit<PublicCourseRun, 'seatsLeft' | 'sessions'>[]>()
      .exec();

    // One query for every listed run's sessions, not one per run.
    const sessions = await this.sessionModel
      .find({ courseRunId: { $in: runs.map((r) => r._id) } })
      .select(PRIVATE_SESSION_FIELDS)
      .sort({ sequence: 1 })
      .lean<PublicSession[]>()
      .exec();
    const byRun = new Map<string, PublicSession[]>();
    for (const s of sessions) {
      const key = String(s.courseRunId);
      byRun.set(key, [...(byRun.get(key) ?? []), s]);
    }

    return runs.map((r) => ({
      ...r,
      seatsLeft: Math.max(0, r.capacity - r.seatsTaken),
      sessions: byRun.get(String(r._id)) ?? [],
    }));
  }

  /** Admin list: every run, latest start first (runs with no sessions yet sort
   * last), optionally narrowed to one training or one status. */
  findAll(filter: { trainingId?: string; status?: string }) {
    const query: Record<string, unknown> = {};
    if (filter.trainingId) {
      if (!Types.ObjectId.isValid(filter.trainingId)) {
        throw new BadRequestException('Invalid trainingId');
      }
      query.trainingId = new Types.ObjectId(filter.trainingId);
    }
    if (filter.status) {
      if (!COURSE_RUN_STATUSES.includes(filter.status)) {
        throw new BadRequestException(`Unknown status "${filter.status}"`);
      }
      query.status = filter.status;
    }
    return this.model.find(query).sort({ startsAt: -1, createdAt: -1 }).exec();
  }

  /** Admin detail: the run with every session, private fields included. */
  async findById(id: string) {
    const run = await this.loadRun(id);
    const sessions = await this.sessionModel
      .find({ courseRunId: run._id })
      .sort({ sequence: 1 })
      .exec();
    return { ...run.toObject(), sessions };
  }

  async create(dto: CreateCourseRunDto) {
    const training = await this.trainingModel.findById(dto.trainingId).exec();
    if (!training) throw new BadRequestException('That training does not exist.');

    const fullFeeCents = dto.fullFeeCents ?? training.priceCents;
    const subsidyCents = dto.subsidyCents ?? 0;
    // `new` rather than create() so the schema defaults (draft, unfunded,
    // unpublished) are in place before the coherence check reads them.
    const run = new this.model({
      ...this.runFields(dto),
      trainingId: training._id,
      trainingTitle: training.title,
      // A run starts from its brochure — the same format, price and trainer —
      // and records only where it departs from it.
      mode: dto.mode ?? training.format,
      currency: dto.currency ?? training.currency,
      // A run has one trainer — whoever is in the room on the day — while the
      // brochure now credits a list. The default is the first of them, which
      // is the lead: Training.trainerIds is ordered, not a set. The rest stay
      // on the brochure; naming one of them for a given run is an edit.
      trainerId:
        dto.trainerId !== undefined
          ? toIdOrNull(dto.trainerId)
          : training.trainerIds[0] ?? null,
      fullFeeCents,
      subsidyCents,
      nettFeeCents: fullFeeCents - subsidyCents,
    });
    this.assertRunCoherent(run);
    return run.save().catch(onDuplicate('That run code is already in use.'));
  }

  async update(id: string, dto: UpdateCourseRunDto) {
    const run = await this.loadRun(id);
    const changes = this.runFields(dto);

    if (
      changes.runCode !== undefined &&
      changes.runCode !== run.runCode &&
      (run.published || run.seatsTaken > 0)
    ) {
      throw new BadRequestException(
        'The run code cannot change once the run has been published or has seats allocated.',
      );
    }
    if (changes.fullFeeCents !== undefined || changes.subsidyCents !== undefined) {
      changes.nettFeeCents =
        (changes.fullFeeCents ?? run.fullFeeCents) -
        (changes.subsidyCents ?? run.subsidyCents);
    }
    this.assertRunCoherent({ ...run.toObject(), ...changes });

    // Capacity is checked inside the same atomic write that changes it, for the
    // reason given on CourseRun.seatsTaken: a seat allocated between the read
    // above and this write must not end up over a capacity we just lowered.
    const updated = await this.model
      .findOneAndUpdate(
        {
          _id: run._id,
          ...(changes.capacity !== undefined && {
            seatsTaken: { $lte: changes.capacity },
          }),
        },
        changes,
        { new: true, runValidators: true },
      )
      .exec()
      .catch(onDuplicate('That run code is already in use.'));
    if (updated) return updated;

    const current = await this.loadRun(id);
    throw new BadRequestException(
      `Capacity cannot go below the ${current.seatsTaken} seats already allocated.`,
    );
  }

  /** Refused once anyone has held a seat: the roster, attendance and invoices
   * all hang off the run. A run that has sold is retired by cancelling it. */
  async remove(id: string) {
    const run = await this.loadRun(id);
    if (run.seatsTaken > 0 || (await this.enrolmentModel.exists({ courseRunId: run._id }))) {
      throw new BadRequestException(
        'This run has enrolments — set its status to "cancelled" instead of deleting it.',
      );
    }
    await this.sessionModel.deleteMany({ courseRunId: run._id }).exec();
    await run.deleteOne();
    return run;
  }

  async addSession(runId: string, dto: CreateSessionDto) {
    const run = await this.loadRun(runId);
    const sequence = dto.sequence ?? (await this.nextSequence(run._id));
    const session = new this.sessionModel({
      ...this.sessionFields(dto),
      courseRunId: run._id,
      sequence,
      // An Online run's sittings are online unless said otherwise; In-person
      // and Hybrid runs fall back to the schema default.
      mode: dto.mode ?? (run.mode === 'Online' ? 'Online' : 'In-person'),
    });
    this.assertSessionCoherent(session);
    await session
      .save()
      .catch(onDuplicate(`Session ${sequence} already exists on this run.`));
    await this.recomputeSchedule(run._id);
    return session;
  }

  async updateSession(runId: string, sessionId: string, dto: UpdateSessionDto) {
    const session = await this.loadSession(runId, sessionId);
    session.set(this.sessionFields(dto));
    this.assertSessionCoherent(session);
    await session
      .save()
      .catch(onDuplicate(`Session ${session.sequence} already exists on this run.`));
    await this.recomputeSchedule(session.courseRunId);
    return session;
  }

  /** Refused once attendance exists for the sitting — deleting it would pull
   * claimable hours out from under an Absentee Payroll claim. Cancel it instead
   * (`cancelled: true`), which also drops it from the run's totals. */
  async removeSession(runId: string, sessionId: string) {
    const session = await this.loadSession(runId, sessionId);
    if (await this.attendanceModel.exists({ courseRunSessionId: session._id })) {
      throw new BadRequestException(
        'Attendance has been recorded for this session — cancel it instead of deleting it.',
      );
    }
    await session.deleteOne();
    await this.recomputeSchedule(session.courseRunId);
    return session;
  }

  /** Path ids that are not ObjectIds would otherwise surface as a Mongoose
   * CastError (a 500); they can only ever name nothing, so they 404. */
  private async loadRun(id: string) {
    const run = Types.ObjectId.isValid(id) ? await this.model.findById(id).exec() : null;
    if (!run) throw new NotFoundException(`No course run with id "${id}"`);
    return run;
  }

  private async loadSession(runId: string, sessionId: string) {
    const session =
      Types.ObjectId.isValid(runId) && Types.ObjectId.isValid(sessionId)
        ? await this.sessionModel.findOne({ _id: sessionId, courseRunId: runId }).exec()
        : null;
    if (!session) {
      throw new NotFoundException(`No session with id "${sessionId}" on course run "${runId}"`);
    }
    return session;
  }

  private runFields(dto: UpdateCourseRunDto): Partial<CourseRun> {
    return {
      ...pickFields(dto, RUN_NULLABLE, RUN_REQUIRED),
      ...(dto.runCode != null && { runCode: dto.runCode.toUpperCase() }),
      ...(dto.trainerId !== undefined && { trainerId: toIdOrNull(dto.trainerId) }),
    };
  }

  private sessionFields(dto: UpdateSessionDto): Partial<CourseRunSession> {
    return {
      ...pickFields(dto, SESSION_NULLABLE, SESSION_REQUIRED),
      ...(dto.trainerId !== undefined && { trainerId: toIdOrNull(dto.trainerId) }),
    };
  }

  private assertRunCoherent(run: CourseRun) {
    if (run.subsidyCents > run.fullFeeCents) {
      throw new BadRequestException('The subsidy cannot exceed the full fee.');
    }
    if (
      run.registrationOpensAt &&
      run.registrationClosesAt &&
      run.registrationClosesAt < run.registrationOpensAt
    ) {
      throw new BadRequestException('Registration cannot close before it opens.');
    }
    if (run.published && run.status === 'draft') {
      throw new BadRequestException(
        'A draft run cannot be published — set its status to "open" first.',
      );
    }
    if (run.published && run.fundingScheme !== 'none' && !run.tgsCourseRef) {
      throw new BadRequestException(
        'A funded run needs its TGS course reference before it can be published.',
      );
    }
  }

  /** Claimable hours may be fewer than the clock time (lunch, breaks) but never
   * more — an overstated figure flows straight into a funding claim. */
  private assertSessionCoherent(session: CourseRunSession) {
    if (session.endsAt <= session.startsAt) {
      throw new BadRequestException('A session must end after it starts.');
    }
    const clockHours =
      (session.endsAt.getTime() - session.startsAt.getTime()) / 3_600_000;
    if (session.durationHours > clockHours) {
      throw new BadRequestException(
        `Claimable hours (${session.durationHours}) exceed the session's ` +
          `${+clockHours.toFixed(2)} hours on the clock.`,
      );
    }
  }

  private async nextSequence(runId: Types.ObjectId) {
    const last = await this.sessionModel
      .findOne({ courseRunId: runId })
      .sort({ sequence: -1 })
      .select('sequence')
      .lean()
      .exec();
    return (last?.sequence ?? 0) + 1;
  }

  /** Re-derives the run's startsAt/endsAt/totalHours from its sessions, which
   * are the source of truth (see CourseRun.startsAt), and the claim deadline
   * each enrolment copies from endsAt. Cancelled sittings count towards none
   * of them. */
  private async recomputeSchedule(runId: Types.ObjectId) {
    const [totals] = await this.sessionModel.aggregate<{
      startsAt: Date;
      endsAt: Date;
      totalHours: number;
    }>([
      { $match: { courseRunId: runId, cancelled: false } },
      {
        $group: {
          _id: null,
          startsAt: { $min: '$startsAt' },
          endsAt: { $max: '$endsAt' },
          totalHours: { $sum: '$durationHours' },
        },
      },
    ]);
    await this.model
      .updateOne(
        { _id: runId },
        {
          startsAt: totals?.startsAt ?? null,
          endsAt: totals?.endsAt ?? null,
          // Summing 2.5 + 0.1-style fractions leaves float noise; hours are
          // never finer than a hundredth in practice.
          totalHours: Math.round((totals?.totalHours ?? 0) * 100) / 100,
        },
      )
      .exec();
    await this.enrolmentModel
      .updateMany(
        { courseRunId: runId },
        { sfcClaimWindowClosesAt: sfcClaimWindowClosesAt(totals?.endsAt ?? null) },
      )
      .exec();
  }
}
