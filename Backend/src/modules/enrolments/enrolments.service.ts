import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { pickFields } from '../../common/utils/pick-fields';
import { onDuplicate } from '../../common/utils/on-duplicate';
import { CrmService } from '../crm/crm.service';
import {
  CourseRun,
  CourseRunDocument,
} from '../course-runs/entities/course-run.entity';
import {
  Registration,
  RegistrationDocument,
} from '../registrations/entities/registration.entity';
import { Enrolment, EnrolmentDocument } from './entities/enrolment.entity';
import {
  SessionAttendance,
  SessionAttendanceDocument,
} from './entities/session-attendance.entity';
import {
  CreateEnrolmentDto,
  ENROLMENT_STATUSES,
} from './dto/create-enrolment.dto';
import { UpdateEnrolmentDto } from './dto/update-enrolment.dto';
import { SubstituteEnrolmentDto } from './dto/substitute-enrolment.dto';
import { sfcClaimWindowClosesAt } from './sfc-claim-window';

/** A run in either state has finished taking people: a completed one has
 * happened, a cancelled one never will. */
const CLOSED_RUN_STATUSES = ['completed', 'cancelled'];

/** See Enrolment.assessmentOutcome for why the vocabulary forks. */
const INTERNAL_OUTCOMES = ['pending', 'pass', 'fail'];
const WSQ_OUTCOMES = ['pending', 'competent', 'not-yet-competent'];

/** Fields copied from a DTO as sent — see pickFields. */
const NULLABLE = ['phone', 'company', 'jobTitle', 'externalId', 'notes'];
const REQUIRED = ['name', 'status', 'paymentStatus', 'assessmentOutcome'];

const normalizeEmail = (email: string) => email.trim().toLowerCase();

/**
 * The roster. Every write that moves a seat goes through takeSeat/releaseSeat —
 * the guarded atomic update on CourseRun.seatsTaken described on that entity —
 * in the order whose only failure mode is a seat counted but unused, never a
 * person without one: the seat is taken before the row is written, and given
 * back only after the row has let go of it.
 *
 * Admin only. The website's enrolment form still creates a Registration (an
 * enquiry); a seat is allocated from one here.
 */
@Injectable()
export class EnrolmentsService {
  private readonly logger = new Logger(EnrolmentsService.name);

  constructor(
    @InjectModel(Enrolment.name)
    private readonly model: Model<EnrolmentDocument>,
    @InjectModel(SessionAttendance.name)
    private readonly attendanceModel: Model<SessionAttendanceDocument>,
    @InjectModel(CourseRun.name)
    private readonly runModel: Model<CourseRunDocument>,
    @InjectModel(Registration.name)
    private readonly registrationModel: Model<RegistrationDocument>,
    private readonly crmService: CrmService,
  ) {}

  /** One run's roster (by name), one person's history (by email), or every
   * enrolment newest first. */
  findAll(filter: { courseRunId?: string; email?: string; status?: string }) {
    const query: Record<string, unknown> = {};
    if (filter.courseRunId) {
      if (!Types.ObjectId.isValid(filter.courseRunId)) {
        throw new BadRequestException('Invalid courseRunId');
      }
      query.courseRunId = filter.courseRunId;
    }
    if (filter.email) query.email = normalizeEmail(filter.email);
    if (filter.status) {
      if (!ENROLMENT_STATUSES.includes(filter.status)) {
        throw new BadRequestException(`Unknown status "${filter.status}"`);
      }
      query.status = filter.status;
    }
    return this.model
      .find(query)
      .sort(filter.courseRunId ? { name: 1 } : { createdAt: -1 })
      .exec();
  }

  findById(id: string) {
    return this.load(id);
  }

  async create(dto: CreateEnrolmentDto) {
    const run = await this.runModel.findById(dto.courseRunId).exec();
    if (!run) throw new BadRequestException('That course run does not exist.');

    let registration: RegistrationDocument | null = null;
    if (dto.registrationId) {
      registration = await this.registrationModel.findById(dto.registrationId).exec();
      if (!registration) throw new BadRequestException('That registration does not exist.');
      if (String(registration.trainingId) !== String(run.trainingId)) {
        throw new BadRequestException(
          `That registration is for ${registration.trainingTitle}, not ${run.trainingTitle}.`,
        );
      }
    }

    // The DTO guarantees name and email whenever there is no registration.
    const email = normalizeEmail(dto.email ?? registration!.email);
    const existing = await this.model.findOne({ courseRunId: run._id, email }).exec();
    if (existing) {
      throw new BadRequestException(
        existing.status === 'withdrawn'
          ? `${email} withdrew from this run — reinstate that enrolment (status "confirmed") instead.`
          : `${email} is already enrolled on this run.`,
      );
    }

    const seated = await this.takeSeat(run._id);
    const paymentStatus = dto.paymentStatus ?? 'unpaid';
    let enrolment: EnrolmentDocument;
    try {
      enrolment = await this.model.create({
        courseRunId: seated._id,
        trainingId: seated.trainingId,
        runCode: seated.runCode,
        name: dto.name ?? registration!.name,
        email,
        phone: dto.phone !== undefined ? dto.phone : (registration?.phone ?? null),
        company: dto.company !== undefined ? dto.company : (registration?.company ?? null),
        jobTitle: dto.jobTitle ?? null,
        externalId: dto.externalId ?? null,
        status: dto.status ?? 'confirmed',
        seatAllocatedAt: new Date(),
        // The snapshot described on the entity: what this seat was sold at.
        currency: seated.currency,
        fullFeeCents: seated.fullFeeCents,
        subsidyCents: seated.subsidyCents,
        nettFeeCents: seated.nettFeeCents,
        gstCents: seated.gstCents,
        paymentStatus,
        paidAt: paymentStatus === 'paid' ? new Date() : null,
        registrationId: registration?._id ?? null,
        sfcClaimWindowClosesAt: sfcClaimWindowClosesAt(seated.endsAt),
        notes: dto.notes ?? null,
      });
    } catch (err) {
      await this.releaseSeat(seated._id);
      return onDuplicate(`${email} is already enrolled on this run.`)(err);
    }

    // The enquiry has been answered — take it out of the pending inbox.
    if (registration?.status === 'pending') {
      await registration.updateOne({ status: 'confirmed' }).exec();
    }
    this.recordInCrm(enrolment, seated.trainingTitle);
    return enrolment;
  }

  async update(id: string, dto: UpdateEnrolmentDto) {
    const enrolment = await this.load(id);
    const changes = pickFields(dto, NULLABLE, REQUIRED);
    if (dto.email != null) changes.email = normalizeEmail(dto.email);
    const duplicate = onDuplicate(
      `${changes.email ?? enrolment.email} already has an enrolment on this run.`,
    );

    if (dto.paymentStatus && dto.paymentStatus !== enrolment.paymentStatus) {
      changes.paidAt = dto.paymentStatus === 'paid' ? new Date() : null;
    }
    if (dto.assessmentOutcome && dto.assessmentOutcome !== enrolment.assessmentOutcome) {
      await this.assertOutcomeFitsRun(enrolment, dto.assessmentOutcome);
      changes.assessedAt = dto.assessmentOutcome === 'pending' ? null : new Date();
    }

    const from = enrolment.status;
    const to = dto.status ?? from;
    if (to === from) {
      const updated = await this.model
        .findByIdAndUpdate(enrolment._id, changes, { new: true, runValidators: true })
        .exec()
        .catch(duplicate);
      if (!updated) throw new NotFoundException(`No enrolment with id "${id}"`);
      return updated;
    }

    if (to === 'completed') changes.completedAt = new Date();
    else if (from === 'completed') changes.completedAt = null;

    const reinstating = from === 'withdrawn';
    if (reinstating) {
      await this.takeSeat(enrolment.courseRunId);
      changes.seatAllocatedAt = new Date();
    }
    // Conditional on the status just read, so two concurrent status changes
    // cannot both move the same seat.
    let updated: EnrolmentDocument | null;
    try {
      updated = await this.model
        .findOneAndUpdate({ _id: enrolment._id, status: from }, changes, {
          new: true,
          runValidators: true,
        })
        .exec();
    } catch (err) {
      if (reinstating) await this.releaseSeat(enrolment.courseRunId);
      return duplicate(err);
    }
    if (!updated) {
      if (reinstating) await this.releaseSeat(enrolment.courseRunId);
      throw new ConflictException(
        'This enrolment was changed by someone else — reload it and try again.',
      );
    }
    if (to === 'withdrawn') await this.releaseSeat(enrolment.courseRunId);
    return updated;
  }

  /**
   * Hands the seat to a different person — the name substitution described on
   * Enrolment.substitutedForName. The seat, its fee snapshot and its payment
   * stay put; only the person changes. How close to the start date this is
   * still allowed is a commercial policy, so it is left to the admin.
   */
  async substitute(id: string, dto: SubstituteEnrolmentDto) {
    const enrolment = await this.load(id);
    if (!['invited', 'confirmed'].includes(enrolment.status)) {
      throw new BadRequestException(
        `Only an invited or confirmed seat can change hands; this one is ${enrolment.status}.`,
      );
    }
    if (await this.attendanceModel.exists({ enrolmentId: enrolment._id })) {
      throw new BadRequestException(
        'Attendance has been recorded against this seat, so it can no longer change hands.',
      );
    }
    const email = normalizeEmail(dto.email);
    if (email === enrolment.email) {
      throw new BadRequestException(
        'That is the person already in this seat — correct their details with PATCH instead.',
      );
    }

    const updated = await this.model
      .findOneAndUpdate(
        { _id: enrolment._id, status: enrolment.status },
        {
          name: dto.name,
          email,
          phone: dto.phone ?? null,
          company: dto.company !== undefined ? dto.company : enrolment.company,
          jobTitle: dto.jobTitle ?? null,
          externalId: dto.externalId ?? null,
          substitutedForName: enrolment.name,
          // Identity belongs to the person, not the seat.
          nricFinEncrypted: null,
          nricFinMasked: null,
        },
        { new: true, runValidators: true },
      )
      .exec()
      .catch(onDuplicate(`${email} already has an enrolment on this run.`));
    if (!updated) {
      throw new ConflictException(
        'This enrolment was changed by someone else — reload it and try again.',
      );
    }
    const run = await this.runModel.findById(updated.courseRunId).select('trainingTitle').exec();
    this.recordInCrm(updated, run?.trainingTitle);
    return updated;
  }

  /** Path ids that are not ObjectIds would otherwise surface as a Mongoose
   * CastError (a 500); they can only ever name nothing, so they 404. */
  private async load(id: string) {
    const enrolment = Types.ObjectId.isValid(id) ? await this.model.findById(id).exec() : null;
    if (!enrolment) throw new NotFoundException(`No enrolment with id "${id}"`);
    return enrolment;
  }

  /** The guarded allocation from CourseRun.seatsTaken's doc comment, with the
   * capacity compared inside the same update ($expr) rather than read first,
   * so it also holds against a concurrent capacity change. */
  private async takeSeat(runId: Types.ObjectId) {
    const run = await this.runModel
      .findOneAndUpdate(
        {
          _id: runId,
          status: { $nin: CLOSED_RUN_STATUSES },
          $expr: { $lt: ['$seatsTaken', '$capacity'] },
        },
        { $inc: { seatsTaken: 1 } },
        { new: true },
      )
      .exec();
    if (run) return run;

    const current = await this.runModel.findById(runId).exec();
    if (!current) throw new BadRequestException('That course run does not exist.');
    if (CLOSED_RUN_STATUSES.includes(current.status)) {
      throw new BadRequestException(
        `This run is ${current.status} and can no longer take enrolments.`,
      );
    }
    throw new BadRequestException(
      `This run is full — all ${current.capacity} seats are taken.`,
    );
  }

  private async releaseSeat(runId: Types.ObjectId) {
    await this.runModel
      .updateOne({ _id: runId, seatsTaken: { $gt: 0 } }, { $inc: { seatsTaken: -1 } })
      .exec();
  }

  private async assertOutcomeFitsRun(enrolment: EnrolmentDocument, outcome: string) {
    const run = await this.runModel
      .findById(enrolment.courseRunId)
      .select('fundingScheme')
      .exec();
    const wsq = !!run && run.fundingScheme !== 'none';
    if (!(wsq ? WSQ_OUTCOMES : INTERNAL_OUTCOMES).includes(outcome)) {
      throw new BadRequestException(
        wsq
          ? 'A funded run is assessed as "competent" or "not-yet-competent".'
          : 'An unfunded run is assessed as "pass" or "fail".',
      );
    }
  }

  /** Best-effort, as in RegistrationsService: a CRM hiccup must never fail a
   * seat that has already been allocated. */
  private recordInCrm(enrolment: EnrolmentDocument, trainingTitle?: string) {
    this.crmService
      .upsertContact({
        email: enrolment.email,
        name: enrolment.name,
        phone: enrolment.phone ?? undefined,
        company: enrolment.company ?? undefined,
        source: {
          type: 'enrolment',
          refId: enrolment._id,
          label: `Enrolled in ${trainingTitle ?? 'a programme'} (${enrolment.runCode})`,
        },
      })
      .catch((err: unknown) =>
        this.logger.warn(`CRM upsert failed for enrolment: ${(err as Error)?.message}`),
      );
  }
}
