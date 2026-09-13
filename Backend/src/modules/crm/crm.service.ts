import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as ExcelJS from 'exceljs';
import { Contact, ContactDocument } from './entities/contact.entity';
import { UpdateContactDto } from './dto/update-contact.dto';
import { CreateContactDto } from './dto/create-contact.dto';
import { AddNoteDto } from './dto/add-note.dto';
import { Registration, RegistrationDocument } from '../registrations/entities/registration.entity';
import { Enrolment, EnrolmentDocument } from '../enrolments/entities/enrolment.entity';
import { Training, TrainingDocument } from '../trainings/entities/training.entity';
import {
  ConsultancyEnquiry,
  ConsultancyEnquiryDocument,
} from '../consultancy/entities/consultancy-enquiry.entity';
import { JobApplication, JobApplicationDocument } from '../careers/entities/job-application.entity';
import {
  ContactMessage,
  ContactMessageDocument,
} from '../contact-messages/entities/contact-message.entity';
import { Subscriber, SubscriberDocument } from '../subscribers/entities/subscriber.entity';
import { Ticket, TicketDocument } from '../tickets/entities/ticket.entity';
import {
  SponsorRequest,
  SponsorRequestDocument,
} from '../sponsors/entities/sponsor-request.entity';
import { BlogFeedback, BlogFeedbackDocument } from '../blog/entities/blog-feedback.entity';

/** The source row as upsertContact builds it, before it is pushed onto a
 * contact — `refId` already narrowed to a real ObjectId or null. */
type ContactSourceEntry = {
  type: string;
  refId: Types.ObjectId | null;
  label: string;
  createdAt: Date;
};

export type UpsertContactInput = {
  email: string;
  name?: string;
  phone?: string;
  whatsapp?: string;
  role?: string;
  company?: string;
  /** Backdates the source entry and firstSeenAt/lastActivityAt bookkeeping —
   * used by backfill() to preserve real history instead of stamping "now"
   * onto years-old submissions. Live call sites omit it (defaults to now). */
  at?: Date;
  source: {
    type: string;
    refId?: Types.ObjectId | string | null;
    label: string;
  };
};

export type ContactFilters = {
  q?: string;
  tag?: string;
  source?: string;
  role?: string;
  /** A Training._id — everyone who has enquired about or enrolled on it. */
  training?: string;
};

/**
 * One programme in a person's history, derived at read time — never stored.
 *
 * Two different records make a course theirs, and both count:
 *   - a Registration, the "I'm interested" form on the brochure page. This is
 *     where nearly all the real data is; shown as Enquired.
 *   - an Enrolment, a named allocated seat on a dated CourseRun. The richer
 *     record; shown as Enrolled.
 * Grouped by trainingId, so someone who enquired twice and then took two runs
 * of the same programme is ONE entry with its history, not four rows.
 *
 * Nothing here is denormalized onto Contact: an enrolment's status, payment
 * and attendance all change after the fact and there is no write path that
 * would keep a stored copy fresh. The sources[] timeline is unaffected — that
 * is the activity log, this is the roster.
 */
export type ContactCourse = {
  /** Training._id as a string. Present on both source collections. */
  trainingId: string;
  /** The live Training's title, falling back to Registration.trainingTitle
   * (the denormalized snapshot) and then to 'Deleted programme' —
   * TrainingsService.remove hard-deletes and cascades only to course content,
   * so both source collections can point at a training that is gone. */
  title: string;
  /** null when the Training no longer exists. Doubles as the "still linkable"
   * flag — the admin editor is /admin/trainings/:trainingId. */
  slug: string | null;
  /** Registrations for this programme by this person. 0 = never enquired. */
  enquiryCount: number;
  /** Enrolments (seats) for this programme. 0 = enquired but never seated,
   * which is the common case today — nothing creates an Enrolment yet. */
  enrolmentCount: number;
  /** Every run this person has been on, oldest first. Duplicate-free by
   * construction: one seat per person per run (EnrolmentSchema's unique index
   * on { courseRunId, email }) and CourseRun.runCode is unique. */
  runCodes: string[];
  /** The four below are the LATEST enrolment's, latest meaning highest
   * createdAt — the order { email: 1, createdAt: -1 } is indexed for. All four
   * are null when enrolmentCount is 0 and never null when it is not, since
   * each is required with a default on the entity. */
  status: string | null;
  paymentStatus: string | null;
  attendancePct: number | null;
  assessmentOutcome: string | null;
  /** The span across BOTH kinds of record — earliest of any registration or
   * enrolment, and latest of any. */
  firstAt: Date;
  lastAt: Date;
};

/** What the list view's Courses column renders, and nothing more. findAll is
 * unpaginated, so sending ten fields per course for every row would multiply
 * the payload for a cell that shows titles. */
export type ContactCourseSummary = {
  trainingId: string;
  title: string;
  enquired: boolean;
  enrolled: boolean;
};

type LeanContact = Contact & { _id: Types.ObjectId };
export type ContactWithCourses = LeanContact & { courses: ContactCourse[] };
export type ContactListRow = LeanContact & { courses: ContactCourseSummary[] };

/** The grouping key both aggregations below share: this person, this
 * programme. `email` is already folded to lowercase on either side. */
type CourseGroupId = { email: string; trainingId: Types.ObjectId };

type EnquiryGroupRow = {
  _id: CourseGroupId;
  title: string;
  count: number;
  firstAt: Date;
  lastAt: Date;
};

type EnrolmentGroupRow = {
  _id: CourseGroupId;
  count: number;
  runCodes: string[];
  status: string;
  paymentStatus: string;
  attendancePct: number;
  assessmentOutcome: string;
  firstAt: Date;
  lastAt: Date;
};

@Injectable()
export class CrmService {
  private readonly logger = new Logger(CrmService.name);

  constructor(
    @InjectModel(Contact.name)
    private readonly model: Model<ContactDocument>,
    // Read-only cross-module injections — same pattern PlatformSyncService
    // already uses to read BlogPost/Newsletter counts from outside their own
    // modules. Registration, Enrolment and Training also carry coursesFor()'s
    // join; the rest are backfill() only.
    @InjectModel(Registration.name)
    private readonly registrationModel: Model<RegistrationDocument>,
    @InjectModel(Enrolment.name)
    private readonly enrolmentModel: Model<EnrolmentDocument>,
    // The live title and slug for a contact's courses. Enrolment denormalizes
    // neither (Registration keeps a title snapshot, which is only good enough
    // once the Training itself has been deleted).
    @InjectModel(Training.name)
    private readonly trainingModel: Model<TrainingDocument>,
    @InjectModel(ConsultancyEnquiry.name)
    private readonly enquiryModel: Model<ConsultancyEnquiryDocument>,
    @InjectModel(JobApplication.name)
    private readonly applicationModel: Model<JobApplicationDocument>,
    @InjectModel(ContactMessage.name)
    private readonly messageModel: Model<ContactMessageDocument>,
    @InjectModel(Subscriber.name)
    private readonly subscriberModel: Model<SubscriberDocument>,
    @InjectModel(Ticket.name)
    private readonly ticketModel: Model<TicketDocument>,
    @InjectModel(SponsorRequest.name)
    private readonly sponsorRequestModel: Model<SponsorRequestDocument>,
    @InjectModel(BlogFeedback.name)
    private readonly feedbackModel: Model<BlogFeedbackDocument>,
  ) {}

  /** Called by every domain service right after it saves its own record —
   * wrapped in try/catch at each call site so a CRM hiccup never blocks the
   * real registration/enquiry/application/message/subscribe from
   * succeeding (same defensive rule PlatformSyncService follows). */
  async upsertContact(input: UpsertContactInput): Promise<ContactDocument | null> {
    const email = input.email?.toLowerCase().trim();
    if (!email) return null;
    const at = input.at ?? new Date();

    const sourceEntry = {
      type: input.source.type,
      refId:
        input.source.refId && Types.ObjectId.isValid(String(input.source.refId))
          ? new Types.ObjectId(String(input.source.refId))
          : null,
      label: input.source.label,
      createdAt: at,
    };

    const existing = await this.model.findOne({ email }).exec();
    if (!existing) {
      try {
        return await this.createContactFor(email, input, sourceEntry, at);
      } catch (err) {
        // Two sources firing for the same new person at once (a purchase that
        // also subscribes, say) both pass the findOne above and both insert.
        // `email` is uniquely indexed so the loser gets E11000 — fall through
        // and treat it as the update it actually is, rather than dropping the
        // second source entry on the floor. One contact per email is the whole
        // point of this collection.
        if ((err as { code?: number }).code !== 11000) throw err;
      }
    }

    const contact = existing ?? (await this.model.findOne({ email }).exec());
    if (!contact) return null;
    return this.appendSource(contact, input, sourceEntry, at);
  }

  private createContactFor(
    email: string,
    input: UpsertContactInput,
    sourceEntry: ContactSourceEntry,
    at: Date,
  ) {
    {
      return this.model.create({
        email,
        name: input.name ?? '',
        phone: input.phone ?? '',
        whatsapp: input.whatsapp ?? '',
        role: input.role ?? '',
        company: input.company ?? '',
        sources: [sourceEntry],
        firstSeenAt: at,
        lastActivityAt: at,
      });
    }
  }

  /** Adds this activity to a contact that already exists, filling in any
   * detail it was still missing. Existing values are never overwritten — the
   * admin may have corrected them by hand. */
  private async appendSource(
    existing: ContactDocument,
    input: UpsertContactInput,
    sourceEntry: ContactSourceEntry,
    at: Date,
  ) {
    existing.sources.push(sourceEntry);
    if (at > existing.lastActivityAt) existing.lastActivityAt = at;
    if (at < existing.firstSeenAt) existing.firstSeenAt = at;
    if (!existing.name && input.name) existing.name = input.name;
    if (!existing.phone && input.phone) existing.phone = input.phone;
    if (!existing.whatsapp && input.whatsapp) existing.whatsapp = input.whatsapp;
    if (!existing.role && input.role) existing.role = input.role;
    if (!existing.company && input.company) existing.company = input.company;
    await existing.save();
    return existing;
  }

  /**
   * Every listed contact's course history in three queries, not two per
   * contact — the same discipline CourseContentService.summary follows.
   * backfill() is the precedent for *which* collections and keys these are,
   * and deliberately not for the query shape: a find() plus an await per row
   * is fine for a one-off migration and catastrophic on a list read.
   *
   * `emails` must already be lowercase, which Contact.email always is.
   */
  private async coursesFor(emails: string[]): Promise<Map<string, ContactCourse[]>> {
    if (emails.length === 0) return new Map();

    const [enquiries, enrolments] = await Promise.all([
      this.registrationModel.aggregate<EnquiryGroupRow>([
        // Normalized before matching rather than after, and to exactly what
        // Contact.email is (`lowercase: true, trim: true`, and upsertContact's
        // own .toLowerCase().trim()): the live form only lowercases
        // (RegistrationsService.create) and import-content.ts wrote legacy rows
        // verbatim, so this collection genuinely holds mixed case and stray
        // whitespace while the Contact it upserted has neither. Matching on the
        // raw address would split one person in two and match neither — and a
        // near-miss here shows a real student an empty course list rather than
        // failing loudly. $trim as well as $toLower for that reason: the rows
        // that need the fold are the same unnormalized legacy rows that can
        // carry a leading space. Costs nothing — registrations has no email
        // index for a plain $in to have used either.
        { $addFields: { emailLower: { $toLower: { $trim: { input: '$email' } } } } },
        // A row whose trainingId never resolved on import (the same script
        // writes `?? null` past a required:true, with validators off) has no
        // programme to be grouped under.
        { $match: { emailLower: { $in: emails }, trainingId: { $ne: null } } },
        // $sort before $group is what makes $first/$last mean oldest/newest.
        { $sort: { createdAt: 1 } },
        {
          $group: {
            _id: { email: '$emailLower', trainingId: '$trainingId' },
            // Only ever a fallback for a deleted Training — the live one wins.
            title: { $last: '$trainingTitle' },
            count: { $sum: 1 },
            firstAt: { $first: '$createdAt' },
            lastAt: { $last: '$createdAt' },
          },
        },
      ]),
      this.enrolmentModel.aggregate<EnrolmentGroupRow>([
        // A plain indexed $in here, deliberately unlike the pass above: every
        // enrolment write normalizes the address (EnrolmentsService's
        // normalizeEmail) and { email: 1, createdAt: -1 } exists for exactly
        // this read — "every run this person has ever been on".
        { $match: { email: { $in: emails } } },
        { $sort: { createdAt: 1 } },
        {
          $group: {
            _id: { email: '$email', trainingId: '$trainingId' },
            count: { $sum: 1 },
            // $push, not $addToSet: the sort above makes this chronological,
            // and duplicates are impossible (one seat per person per run).
            runCodes: { $push: '$runCode' },
            status: { $last: '$status' },
            paymentStatus: { $last: '$paymentStatus' },
            attendancePct: { $last: '$attendancePct' },
            assessmentOutcome: { $last: '$assessmentOutcome' },
            firstAt: { $first: '$createdAt' },
            lastAt: { $last: '$createdAt' },
          },
        },
      ]),
    ]);

    const key = (id: CourseGroupId) => `${id.email} ${String(id.trainingId)}`;
    const enquiryRows = new Map(enquiries.map((r) => [key(r._id), r]));
    const enrolmentRows = new Map(enrolments.map((r) => [key(r._id), r]));
    // Keyed by the group id itself rather than parsed back out of the string,
    // and seeded from both sides — a person who only enquired and a person who
    // only has a seat both get a row.
    const groups = new Map<string, CourseGroupId>();
    for (const r of enquiries) groups.set(key(r._id), r._id);
    for (const r of enrolments) groups.set(key(r._id), r._id);
    // Most contacts are not students — no group, no third query.
    if (groups.size === 0) return new Map();

    // The third query: the live title and slug. Enrolment denormalizes
    // neither, so without this an enrolment-only course has no name at all.
    const trainings = await this.trainingModel
      .find({ _id: { $in: [...groups.values()].map((g) => g.trainingId) } })
      .select('title slug')
      .lean<{ _id: Types.ObjectId; title: string; slug: string }[]>()
      .exec();
    const trainingsById = new Map(trainings.map((t) => [String(t._id), t]));

    const byEmail = new Map<string, ContactCourse[]>();
    for (const [k, id] of groups) {
      const enquiry = enquiryRows.get(k);
      const enrolment = enrolmentRows.get(k);
      const training = trainingsById.get(String(id.trainingId));
      // createdAt is optional on both entities — `timestamps: true` fills it
      // in, but taking .getTime() of a row that somehow predates that would
      // 500 the entire list, so the span is built from what is really there.
      const stamps = [enquiry?.firstAt, enquiry?.lastAt, enrolment?.firstAt, enrolment?.lastAt]
        .filter((d): d is Date => d instanceof Date)
        .map((d) => d.getTime());
      const course: ContactCourse = {
        trainingId: String(id.trainingId),
        title: training?.title ?? enquiry?.title ?? 'Deleted programme',
        slug: training?.slug ?? null,
        enquiryCount: enquiry?.count ?? 0,
        enrolmentCount: enrolment?.count ?? 0,
        runCodes: enrolment?.runCodes ?? [],
        status: enrolment?.status ?? null,
        paymentStatus: enrolment?.paymentStatus ?? null,
        attendancePct: enrolment?.attendancePct ?? null,
        assessmentOutcome: enrolment?.assessmentOutcome ?? null,
        firstAt: new Date(Math.min(...stamps)),
        lastAt: new Date(Math.max(...stamps)),
      };
      const list = byEmail.get(id.email) ?? [];
      list.push(course);
      byEmail.set(id.email, list);
    }
    // Most recent programme first, which is also the order the list view's
    // "first two" relies on.
    for (const list of byEmail.values()) {
      list.sort((a, b) => b.lastAt.getTime() - a.lastAt.getTime());
    }
    return byEmail;
  }

  /** One join for the whole page, never one per contact. */
  private async withCourses(contacts: LeanContact[]): Promise<ContactWithCourses[]> {
    const byEmail = await this.coursesFor(contacts.map((c) => c.email));
    return contacts.map((c) => ({ ...c, courses: byEmail.get(c.email) ?? [] }));
  }

  private async attachCourses(contact: LeanContact): Promise<ContactWithCourses> {
    const [withCourses] = await this.withCourses([contact]);
    return withCourses;
  }

  /** The programme filter, resolved to the people it names — a contact holds
   * no trainingId, so this cannot be a clause on `contacts`. Both collections
   * count, for the same reason both are shown: enrolments are the richer
   * record but registrations are where the data currently is. */
  private async emailsForTraining(training: string): Promise<string[]> {
    if (!Types.ObjectId.isValid(training)) {
      throw new BadRequestException('Invalid training id');
    }
    const trainingId = new Types.ObjectId(training);
    // RegistrationSchema.index({ trainingId: 1 }) backs the first,
    // EnrolmentSchema.index({ trainingId: 1, completedAt: -1 }) the second.
    const [enquired, enrolled] = await Promise.all([
      this.registrationModel.distinct('email', { trainingId }),
      this.enrolmentModel.distinct('email', { trainingId }),
    ]);
    // Normalized the same way and for the same reason as coursesFor's fold
    // above — these addresses come back exactly as each collection stored
    // them, and are about to be matched against Contact.email, which is always
    // lowercased and trimmed.
    return [...new Set([...enquired, ...enrolled].map((e) => e.trim().toLowerCase()))];
  }

  async findAll(filters: ContactFilters): Promise<ContactListRow[]> {
    const query: Record<string, unknown> = {};
    if (filters.q) {
      const re = new RegExp(filters.q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      // Both numbers are searchable: looking someone up by the number that
      // just rang is a common case, and it may be either of them.
      query.$or = [{ name: re }, { email: re }, { company: re }, { phone: re }, { whatsapp: re }];
    }
    if (filters.tag) query.tags = filters.tag;
    if (filters.source) query['sources.type'] = filters.source;
    // Case-insensitive exact match: roles are typed by hand and imported from
    // spreadsheets, so "Student" and "student" are the same role.
    if (filters.role) {
      const escaped = filters.role.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.role = new RegExp(`^${escaped}$`, 'i');
    }
    // Pure AND with everything above, exactly as tag/source/role already are:
    // match the search *and* have the programme. Never skipped when the set
    // comes back empty — nobody having that programme is a real answer, and
    // dropping the clause would silently show everyone instead.
    if (filters.training) {
      query.email = { $in: await this.emailsForTraining(filters.training) };
    }

    const contacts = await this.model
      .find(query)
      .sort({ lastActivityAt: -1 })
      .lean<LeanContact[]>()
      .exec();
    // Projected down after the join, not before it: the join is the same work
    // either way, and the list only ever renders titles. See
    // ContactCourseSummary.
    return (await this.withCourses(contacts)).map(({ courses, ...c }) => ({
      ...c,
      courses: courses.map((x) => ({
        trainingId: x.trainingId,
        title: x.title,
        enquired: x.enquiryCount > 0,
        enrolled: x.enrolmentCount > 0,
      })),
    }));
  }

  async findById(id: string) {
    const doc = await this.model.findById(id).lean<LeanContact | null>().exec();
    if (!doc) throw new NotFoundException(`No contact with id "${id}"`);
    return this.attachCourses(doc);
  }

  async createManual(dto: CreateContactDto) {
    const email = dto.email.toLowerCase().trim();
    const now = new Date();
    // A known email still returns the contact that already exists rather than
    // a duplicate — and that one has a history, so it carries its courses like
    // every other contact response.
    const contact =
      (await this.model.findOne({ email }).exec()) ??
      (await this.model.create({
        email,
        name: dto.name ?? '',
        phone: dto.phone ?? '',
        whatsapp: dto.whatsapp ?? '',
        role: dto.role ?? '',
        company: dto.company ?? '',
        sources: [{ type: 'manual', refId: null, label: 'Added manually', createdAt: now }],
        firstSeenAt: now,
        lastActivityAt: now,
      }));
    return this.attachCourses(contact.toObject());
  }

  async update(id: string, dto: UpdateContactDto) {
    const doc = await this.model
      .findByIdAndUpdate(id, { $set: dto }, { new: true, runValidators: true })
      .lean<LeanContact | null>()
      .exec();
    if (!doc) throw new NotFoundException(`No contact with id "${id}"`);
    return this.attachCourses(doc);
  }

  async addNote(id: string, dto: AddNoteDto, authorName: string) {
    const doc = await this.model.findById(id).exec();
    if (!doc) throw new NotFoundException(`No contact with id "${id}"`);
    doc.notes.push({ text: dto.text, authorName, createdAt: new Date() });
    await doc.save();
    // Courses on every contact-returning response, not just the reads: the
    // detail page replaces its whole contact state from this one too, so
    // leaving them off here would blank the panel on adding a note.
    return this.attachCourses(doc.toObject());
  }

  async deleteNote(id: string, noteId: string) {
    const doc = await this.model.findById(id).exec();
    if (!doc) throw new NotFoundException(`No contact with id "${id}"`);
    doc.notes = doc.notes.filter((n) => String((n as unknown as { _id: Types.ObjectId })._id) !== noteId);
    await doc.save();
    return this.attachCourses(doc.toObject());
  }

  async remove(id: string) {
    const doc = await this.model.findByIdAndDelete(id).exec();
    if (!doc) throw new NotFoundException(`No contact with id "${id}"`);
    return doc;
  }

  /** CSV of the current filtered list — same filters as findAll, including
   * the programme one, so an export matches the view it was taken from. */
  async exportCsv(filters: ContactFilters) {
    const contacts = await this.findAll(filters);
    // Column names match what the importer accepts, so an export can be
    // edited in Excel and fed straight back in.
    const header = [
      'Name',
      'Email',
      'Contact Number',
      'WhatsApp Number',
      'Role',
      'Company',
      'Tags',
      // Derived, not editable, so it sits after that block — and ignored on
      // re-import (normalizeHeader resolves it to 'courses', which
      // importFromSpreadsheet never reads), so the round trip still holds.
      'Courses',
      'First seen',
      'Last activity',
    ];
    const rows = contacts.map((c) => [
      c.name,
      c.email,
      c.phone,
      c.whatsapp,
      c.role,
      c.company,
      c.tags.join('; '),
      c.courses.map((x) => `${x.title}${x.enrolled ? ' (enrolled)' : ''}`).join('; '),
      c.firstSeenAt.toISOString(),
      c.lastActivityAt.toISOString(),
    ]);
    const escape = (v: string) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    return [header, ...rows].map((r) => r.map(escape).join(',')).join('\r\n');
  }

  /**
   * One-off migration: walks every existing registration/enrolment/enquiry/
   * application/message/subscriber and upserts a Contact for each,
   * backdated to the source record's own createdAt — so history that
   * predates the CRM still shows up correctly. Safe to re-run (upsertContact
   * is idempotent per email+source-append; running it twice just appends
   * duplicate source entries, which is why the controller guards this
   * behind a confirmation rather than running it automatically).
   */
  async backfill() {
    let scanned = 0;

    const registrations = await this.registrationModel.find().exec();
    for (const r of registrations) {
      await this.upsertContact({
        email: r.email,
        name: r.name,
        phone: r.phone,
        company: r.company ?? undefined,
        at: r.createdAt,
        source: { type: 'registration', refId: r._id, label: `Registered for ${r.trainingTitle}` },
      });
      scanned++;
    }

    // Same label EnrolmentsService writes live. Withdrawn seats included, as
    // cancelled registrations are above: the contact still happened.
    const enrolments = await this.enrolmentModel
      .find()
      .populate('courseRunId', 'trainingTitle')
      .exec();
    for (const e of enrolments) {
      const run = e.courseRunId as unknown as { trainingTitle?: string } | null;
      await this.upsertContact({
        email: e.email,
        name: e.name,
        phone: e.phone ?? undefined,
        company: e.company ?? undefined,
        at: e.createdAt,
        source: {
          type: 'enrolment',
          refId: e._id,
          label: `Enrolled in ${run?.trainingTitle ?? 'a programme'} (${e.runCode})`,
        },
      });
      scanned++;
    }

    const enquiries = await this.enquiryModel.find().exec();
    for (const e of enquiries) {
      await this.upsertContact({
        email: e.email,
        name: e.name,
        phone: e.phone,
        company: e.company,
        at: e.createdAt,
        source: {
          type: 'enquiry',
          refId: e._id,
          label: e.serviceTitle ? `Enquired about ${e.serviceTitle}` : 'Sent a consultancy enquiry',
        },
      });
      scanned++;
    }

    const applications = await this.applicationModel.find().exec();
    for (const a of applications) {
      await this.upsertContact({
        email: a.email,
        name: a.name,
        phone: a.phone,
        at: a.createdAt,
        source: { type: 'application', refId: a._id, label: `Applied for ${a.jobTitle}` },
      });
      scanned++;
    }

    const messages = await this.messageModel.find().exec();
    for (const m of messages) {
      await this.upsertContact({
        email: m.email,
        name: m.name,
        phone: m.phone ?? undefined,
        at: m.createdAt,
        source: { type: 'message', refId: m._id, label: `Sent a message: ${m.subject}` },
      });
      scanned++;
    }

    const subscribers = await this.subscriberModel.find({ active: true }).exec();
    for (const s of subscribers) {
      await this.upsertContact({
        email: s.email,
        at: s.createdAt,
        source: { type: 'subscriber', refId: s._id, label: 'Subscribed to the newsletter' },
      });
      scanned++;
    }

    // Only confirmed purchases: a 'pending' PayNow audit row is someone who
    // was shown a QR code, not someone who bought anything.
    const tickets = await this.ticketModel.find({ status: 'confirmed' }).exec();
    for (const t of tickets) {
      await this.upsertContact({
        email: t.customerEmail,
        name: t.customerName,
        phone: t.customerPhone || undefined,
        // Ticket declares no createdAt of its own — purchaseDate is the
        // real moment of the sale and is always set on a confirmed row.
        at: t.purchaseDate,
        source: {
          type: 'ticket',
          refId: t._id,
          label: `Bought a ticket for ${t.eventTitle}`,
        },
      });
      scanned++;
    }

    const sponsorRequests = await this.sponsorRequestModel.find().exec();
    for (const r of sponsorRequests) {
      await this.upsertContact({
        email: r.email,
        name: r.contactName,
        phone: r.phone || undefined,
        company: r.companyName || undefined,
        // SponsorRequest declares no createdAt either; its first status entry
        // is stamped when the application is created.
        at: r.statusHistory?.[0]?.changedAt,
        source: {
          type: 'sponsor',
          refId: r._id,
          label: `Applied to sponsor (${r.sponsorTypeName})`,
        },
      });
      scanned++;
    }

    const feedback = await this.feedbackModel.find().populate('postId', 'title').exec();
    for (const f of feedback) {
      const post = f.postId as unknown as { title?: string } | null;
      await this.upsertContact({
        email: f.email,
        name: f.name,
        at: f.createdAt,
        source: {
          type: 'feedback',
          refId: f._id,
          label: post?.title ? `Left feedback on "${post.title}"` : 'Left blog feedback',
        },
      });
      scanned++;
    }

    this.logger.log(`CRM backfill scanned ${scanned} source records.`);
    return { scanned };
  }

  /**
   * Bulk-add contacts from an uploaded .csv/.xlsx/.xls file. Column headers
   * are matched loosely (case-insensitive, substring — "Email address",
   * "E-mail" and "email" all resolve to the same field); only Email is
   * required, everything else fills in like any other upsertContact call.
   */
  async importFromSpreadsheet(buffer: Buffer, filename: string) {
    const rows = await this.parseSpreadsheet(buffer, filename);
    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const email = (row.email || '').trim().toLowerCase();
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        skipped++;
        if (errors.length < 20) errors.push(`Row ${i + 2}: missing or invalid email`);
        continue;
      }
      await this.upsertContact({
        email,
        name: row.name,
        phone: row.phone,
        whatsapp: row.whatsapp,
        role: row.role,
        company: row.company,
        source: { type: 'import', label: `Imported from ${filename}` },
      });
      imported++;
    }

    return { imported, skipped, errors };
  }

  private async parseSpreadsheet(buffer: Buffer, filename: string): Promise<Record<string, string>[]> {
    const ext = filename.toLowerCase().split('.').pop();
    if (ext === 'csv') return this.parseCsv(buffer.toString('utf-8'));

    const workbook = new ExcelJS.Workbook();
    try {
      await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);
    } catch {
      throw new BadRequestException('Could not read that file — is it a valid .xlsx file?');
    }
    const sheet = workbook.worksheets[0];
    if (!sheet) return [];

    const headers: string[] = [];
    sheet.getRow(1).eachCell({ includeEmpty: true }, (cell, colNumber) => {
      headers[colNumber] = this.normalizeHeader(this.cellToString(cell.value));
    });

    const rows: Record<string, string>[] = [];
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const entry: Record<string, string> = {};
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        const key = headers[colNumber];
        if (key) entry[key] = this.cellToString(cell.value);
      });
      if (Object.values(entry).some((v) => v)) rows.push(entry);
    });
    return rows;
  }

  private cellToString(value: ExcelJS.CellValue): string {
    if (value == null) return '';
    if (typeof value === 'object' && 'text' in value) return String(value.text ?? '');
    if (typeof value === 'object' && 'result' in value) return String(value.result ?? '');
    if (value instanceof Date) return value.toISOString();
    return String(value);
  }

  private normalizeHeader(h: string): string {
    // Strip everything but letters before matching, so "E-mail Address",
    // "e_mail", "Email:" etc. all still resolve — a literal `includes`
    // check would miss all of those on the hyphen/underscore/punctuation.
    const key = h.trim().toLowerCase().replace(/[^a-z]/g, '');

    // Order matters: every check must run before any looser one that would
    // also swallow it, so the most specific column wins.
    if (key.includes('whatsapp')) return 'whatsapp';
    // 'mail', not 'email' — "Gmail ID" is a real column heading and contains
    // no "email" at all, so an 'email' check dropped the whole column and
    // every row then failed as "missing email".
    if (key.includes('mail')) return 'email';
    if (key.includes('role') || key.includes('category')) return 'role';
    if (key.includes('name')) return 'name';
    // 'contact'/'number' included: "Contact Number" matched none of
    // phone/mobile/tel, so that column was silently dropped too. Runs after
    // the whatsapp check above, which "WhatsApp Number" would otherwise hit.
    if (
      key.includes('phone') ||
      key.includes('mobile') ||
      key.includes('tel') ||
      key.includes('contact') ||
      key.includes('number')
    ) {
      return 'phone';
    }
    if (key.includes('company') || key.includes('organi')) return 'company';
    return key;
  }

  /** Minimal quoted-field-aware CSV parser — no external dependency needed
   * for the common case (quoted commas, escaped "" quotes). */
  private parseCsv(text: string): Record<string, string>[] {
    const lines = text.split(/\r\n|\n|\r/).filter((l) => l.trim() !== '');
    if (lines.length === 0) return [];

    const parseLine = (line: string): string[] => {
      const result: string[] = [];
      let cur = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (inQuotes) {
          if (ch === '"') {
            if (line[i + 1] === '"') {
              cur += '"';
              i++;
            } else {
              inQuotes = false;
            }
          } else {
            cur += ch;
          }
        } else if (ch === '"') {
          inQuotes = true;
        } else if (ch === ',') {
          result.push(cur);
          cur = '';
        } else {
          cur += ch;
        }
      }
      result.push(cur);
      return result;
    };

    const headers = parseLine(lines[0]).map((h) => this.normalizeHeader(h));
    const rows: Record<string, string>[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = parseLine(lines[i]);
      const entry: Record<string, string> = {};
      headers.forEach((h, idx) => {
        if (h) entry[h] = (values[idx] ?? '').trim();
      });
      if (Object.values(entry).some((v) => v)) rows.push(entry);
    }
    return rows;
  }
}
