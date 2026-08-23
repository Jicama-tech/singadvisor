import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { mkdirSync, writeFileSync } from 'fs';
import { randomUUID } from 'crypto';
import { extname, join } from 'path';
import { Model, Types } from 'mongoose';
import { slugify } from '../../common/utils/slugify';
import { JobPosting, JobPostingDocument } from './entities/job-posting.entity';
import { JobApplication, JobApplicationDocument } from './entities/job-application.entity';
import { SaveJobDto } from './dto/save-job.dto';
import { SaveApplicationDto } from './dto/save-application.dto';
import { CrmService } from '../crm/crm.service';

/** Résumés are personal data: NOT under `uploads/` (which main.ts serves
 * statically to the world), and only streamed through the guarded
 * `GET /careers/applications/:id/resume` route — same discipline the old
 * Next app enforced (its `var/uploads` was deliberately outside `public/`). */
export const RESUME_DIR = process.env.RESUME_DIR ?? join(process.cwd(), 'resumes');

/** Same allow-list as Frontend's `RESUME_ACCEPTED_TYPES`/`_EXTENSIONS`. */
const RESUME_MAX_BYTES = 5 * 1024 * 1024;
const RESUME_ACCEPTED_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);
const RESUME_ACCEPTED_EXTENSIONS = new Set(['.pdf', '.doc', '.docx']);

export const RESUME_CONTENT_TYPES: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx':
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

@Injectable()
export class CareersService {
  private readonly logger = new Logger(CareersService.name);

  constructor(
    @InjectModel(JobPosting.name)
    private readonly model: Model<JobPostingDocument>,
    @InjectModel(JobApplication.name)
    private readonly applicationModel: Model<JobApplicationDocument>,
    private readonly crmService: CrmService,
  ) {}

  // ---- job postings -------------------------------------------------------

  findPublished() {
    return this.model.find({ published: true }).sort({ createdAt: -1 }).exec();
  }

  /** Admin list: everything, newest edits first, `applicationCount` attached
   * (the old admin page showed it via Prisma's _count). */
  async findAll(): Promise<(JobPosting & { applicationCount: number })[]> {
    const [docs, counts] = await Promise.all([
      this.model.find().sort({ updatedAt: -1 }).lean().exec(),
      this.model.db
        .collection('job-applications')
        .aggregate([{ $group: { _id: '$jobId', count: { $sum: 1 } } }])
        .toArray(),
    ]);
    const byId = new Map(counts.map((c) => [String(c._id), c.count]));
    return docs.map((d) => ({
      ...(d as JobPosting),
      applicationCount: byId.get(String(d._id)) ?? 0,
    }));
  }

  findById(id: string) {
    return this.model.findById(id).exec();
  }

  async findBySlugPublic(slug: string) {
    const doc = await this.model.findOne({ slug, published: true }).exec();
    if (!doc) throw new NotFoundException(`No job posting with slug "${slug}"`);
    return doc;
  }

  async save(dto: SaveJobDto, id?: string) {
    if (!id && !dto.title) {
      throw new BadRequestException('Title is required.');
    }

    if (dto.closesAt && Number.isNaN(dto.closesAt.getTime())) {
      throw new BadRequestException('Enter a valid closing date.');
    }
    if (
      dto.salaryMin != null &&
      dto.salaryMax != null &&
      dto.salaryMax < dto.salaryMin
    ) {
      throw new BadRequestException('The maximum must be at least the minimum.');
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

    const data: Record<string, unknown> = {
      ...(slug !== undefined && { slug }),
      ...(dto.title !== undefined && { title: dto.title }),
      ...(dto.department !== undefined && { department: dto.department }),
      ...(dto.location !== undefined && { location: dto.location }),
      ...(dto.employment !== undefined && { employment: dto.employment }),
      ...(dto.workMode !== undefined && { workMode: dto.workMode }),
      ...(dto.experience !== undefined && { experience: dto.experience }),
      ...(dto.salaryMin !== undefined && { salaryMin: dto.salaryMin }),
      ...(dto.salaryMax !== undefined && { salaryMax: dto.salaryMax }),
      ...(dto.currency !== undefined && { currency: dto.currency }),
      ...(dto.summary !== undefined && { summary: dto.summary }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.requirements !== undefined && { requirements: dto.requirements }),
      ...(dto.benefits !== undefined && { benefits: dto.benefits }),
      ...(dto.published !== undefined && { published: dto.published }),
      ...(dto.closesAt !== undefined && { closesAt: dto.closesAt }),
    };

    if (id) {
      const doc = await this.model
        .findByIdAndUpdate(id, data, { new: true, runValidators: true })
        .exec();
      if (!doc) throw new NotFoundException(`No job posting with id "${id}"`);
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
    if (!doc) throw new NotFoundException(`No job posting with id "${id}"`);
    return doc;
  }

  // ---- applications -------------------------------------------------------

  findApplications() {
    return this.applicationModel.find().sort({ createdAt: -1 }).exec();
  }

  /**
   * Public application submit. The résumé arrives pre-validated by the
   * controller's memoryStorage interceptor (size + type filter); everything
   * else — job still open, one application per email per role, the write to
   * disk — happens here, so no file is ever written for a rejected
   * submission (unlike a diskStorage interceptor, which would orphan it).
   */
  async createApplication(
    jobId: string,
    dto: SaveApplicationDto,
    resume?: Express.Multer.File,
  ) {
    const job = await this.model.findById(jobId).exec();
    if (!job || !job.published) {
      throw new BadRequestException('That role is no longer accepting applications.');
    }
    if (job.closesAt && job.closesAt < new Date()) {
      throw new BadRequestException('Applications for that role have closed.');
    }

    const email = dto.email.toLowerCase();
    const existing = await this.applicationModel.findOne({ jobId: job._id, email }).exec();
    if (existing) {
      throw new BadRequestException("You've already applied for this role. We'll be in touch.");
    }

    let resumePath: string | null = null;
    let resumeName: string | null = null;
    if (resume && resume.size > 0) {
      const ext = extname(resume.originalname).toLowerCase();
      if (!RESUME_ACCEPTED_TYPES.has(resume.mimetype) || !RESUME_ACCEPTED_EXTENSIONS.has(ext)) {
        throw new BadRequestException('Please upload a PDF, DOC or DOCX file.');
      }
      // Never reuse the submitted filename on disk — it is attacker-controlled.
      // A random name plus the validated extension removes path traversal and
      // overwrite risk entirely (same discipline as the old server action).
      const stored = `${randomUUID()}${ext}`;
      mkdirSync(RESUME_DIR, { recursive: true });
      writeFileSync(join(RESUME_DIR, stored), resume.buffer);
      resumePath = stored;
      resumeName = resume.originalname.slice(0, 200);
    }

    const application = await this.applicationModel.create({
      name: dto.name,
      email,
      phone: dto.phone,
      linkedin: dto.linkedin ?? null,
      portfolio: dto.portfolio ?? null,
      coverLetter: dto.coverLetter,
      resumePath,
      resumeName,
      jobId: job._id,
      jobTitle: job.title,
    });

    this.crmService
      .upsertContact({
        email: application.email,
        name: application.name,
        phone: application.phone,
        source: {
          type: 'application',
          refId: application._id,
          label: `Applied for ${application.jobTitle}`,
        },
      })
      .catch((err: unknown) =>
        this.logger.warn(`CRM upsert failed for application: ${(err as Error)?.message}`),
      );

    return application;
  }

  async updateApplicationStatus(id: string, status: string) {
    const doc = await this.applicationModel
      .findByIdAndUpdate(id, { status }, { new: true, runValidators: true })
      .exec();
    if (!doc) throw new NotFoundException(`No application with id "${id}"`);
    return doc;
  }

  /** Null on missing id — the résumé streaming route treats both "no such
   * application" and "application without a résumé" as a plain 404, so it
   * needs a non-throwing lookup. */
  findApplicationById(id: string) {
    return this.applicationModel.findById(id).exec();
  }
}
