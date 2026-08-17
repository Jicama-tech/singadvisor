/**
 * One-off import of `Frontend/prisma/export-content.ts`'s JSON dump into the
 * new Mongo collections backing the content-domain REST modules (trainings,
 * trainers, consultancy services + enquiries, job postings + applications,
 * blog posts, registrations, contact messages, subscribers). The Backend
 * half of the Vite-SPA migration's data move (Phase 10a).
 *
 * Key decisions, matching the import-events.ts precedent:
 * - Upserts by the Prisma cuid (stored as `legacyId`), never duplicates —
 *   safe to re-run as many times as needed during the parallel-run window.
 * - JSON-encoded string arrays (outcomes/modules/deliverables/idealFor/
 *   requirements/benefits/tags) become real Mongo arrays.
 * - FK references are re-pointed at the migrated documents' Mongo `_id`s via
 *   a legacyId→_id map, with a denormalized title (`trainingTitle`,
 *   `jobTitle`, `serviceTitle`) so admin list views never need a second query.
 * - Registrations linked to legacy Prisma Events are SKIPPED (logged below):
 *   event RSVPs were superseded by eventsh's ticket flow and import-events.ts
 *   already migrated those rows into tickets — importing them again would
 *   duplicate data across the two systems.
 * - Résumé binaries are COPIED (never moved) from the Frontend's upload dir
 *   into Backend/resumes/, so the old Next app's own résumé route keeps
 *   working untouched during the parallel-run window.
 *
 *   npm run import:content -- ../Frontend/content-export.json [resume-source-dir]
 */
import 'dotenv/config';
import { readFileSync } from 'fs';
import { copyFileSync, existsSync, mkdirSync } from 'fs';
import { basename, resolve } from 'path';
import mongoose from 'mongoose';
import { TrainingSchema } from '../src/modules/trainings/entities/training.entity';
import { TrainerSchema } from '../src/modules/trainings/entities/trainer.entity';
import { ConsultancyServiceSchema } from '../src/modules/consultancy/entities/consultancy-service.entity';
import { ConsultancyEnquirySchema } from '../src/modules/consultancy/entities/consultancy-enquiry.entity';
import { JobPostingSchema } from '../src/modules/careers/entities/job-posting.entity';
import { JobApplicationSchema } from '../src/modules/careers/entities/job-application.entity';
import { BlogPostSchema } from '../src/modules/blog/entities/blog-post.entity';
import { RegistrationSchema } from '../src/modules/registrations/entities/registration.entity';
import { ContactMessageSchema } from '../src/modules/contact-messages/entities/contact-message.entity';
import { SubscriberSchema } from '../src/modules/subscribers/entities/subscriber.entity';

type WithId = { id: string };
type ExportShape = {
  trainers: WithId[];
  trainings: WithId[];
  consultancyServices: WithId[];
  consultancyEnquiries: WithId[];
  jobPostings: WithId[];
  jobApplications: WithId[];
  blogPosts: WithId[];
  registrations: WithId[];
  contactMessages: WithId[];
  subscribers: WithId[];
  legacyEvents: { id: string; title: string }[];
};

function parseJsonArray(raw: unknown): string[] {
  if (typeof raw !== 'string') return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

/** Prisma stores `DateTime?` as `Date | null` in its JSON export. */
function toDateOrNull(value: unknown): Date | null {
  if (!value) return null;
  const date = new Date(value as string);
  return Number.isNaN(date.getTime()) ? null : date;
}

async function main() {
  const inPath = resolve(process.argv[2] || '../Frontend/content-export.json');
  const resumeSourceDir = resolve(process.argv[3] || '../Frontend/var/uploads');
  const exportData: ExportShape = JSON.parse(readFileSync(inPath, 'utf-8'));

  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error('MONGO_URI is not set (check Backend/.env)');
  await mongoose.connect(uri);

  const Trainer = mongoose.model('Trainer', TrainerSchema);
  const Training = mongoose.model('Training', TrainingSchema);
  const ConsultancyService = mongoose.model('ConsultancyService', ConsultancyServiceSchema);
  const ConsultancyEnquiry = mongoose.model('ConsultancyEnquiry', ConsultancyEnquirySchema);
  const JobPosting = mongoose.model('JobPosting', JobPostingSchema);
  const JobApplication = mongoose.model('JobApplication', JobApplicationSchema);
  const BlogPost = mongoose.model('BlogPost', BlogPostSchema);
  const Registration = mongoose.model('Registration', RegistrationSchema);
  const ContactMessage = mongoose.model('ContactMessage', ContactMessageSchema);
  const Subscriber = mongoose.model('Subscriber', SubscriberSchema);

  const counts: Record<string, number> = {};
  const upsert = async (model: mongoose.Model<any>, legacyId: string, data: object) => {
    await model.findOneAndUpdate({ legacyId }, { $set: data }, { upsert: true }).exec();
    counts[model.modelName] = (counts[model.modelName] ?? 0) + 1;
  };

  // ---- trainers (imported first — trainings/posts reference them) --------
  const trainerIdByLegacy = new Map<string, mongoose.Types.ObjectId>();
  for (const t of exportData.trainers as any[]) {
    const doc = await Trainer.findOneAndUpdate(
      { legacyId: t.id },
      {
        $set: {
          name: t.name,
          title: t.title,
          bio: t.bio,
          photo: t.photo,
          linkedin: t.linkedin ?? null,
        },
      },
      { upsert: true, new: true },
    ).exec();
    trainerIdByLegacy.set(t.id, doc._id);
    counts['trainers'] = (counts['trainers'] ?? 0) + 1;
  }

  // ---- trainings ----------------------------------------------------------
  for (const t of exportData.trainings as any[]) {
    await upsert(Training, t.id, {
      slug: t.slug,
      title: t.title,
      summary: t.summary,
      description: t.description,
      image: t.image,
      category: t.category,
      level: t.level,
      durationHrs: t.durationHrs,
      format: t.format,
      priceCents: t.priceCents,
      currency: t.currency,
      outcomes: parseJsonArray(t.outcomes),
      modules: parseJsonArray(t.modules),
      published: t.published,
      featured: t.featured,
      sortOrder: t.sortOrder,
      trainerId: t.trainerId ? trainerIdByLegacy.get(t.trainerId) ?? null : null,
      createdAt: toDateOrNull(t.createdAt) ?? new Date(),
      updatedAt: toDateOrNull(t.updatedAt) ?? new Date(),
    });
  }

  // ---- consultancy services ----------------------------------------------
  const serviceIdByLegacy = new Map<string, mongoose.Types.ObjectId>();
  for (const s of exportData.consultancyServices as any[]) {
    const doc = await ConsultancyService.findOneAndUpdate(
      { legacyId: s.id },
      {
        $set: {
          slug: s.slug,
          title: s.title,
          summary: s.summary,
          description: s.description,
          image: s.image,
          icon: s.icon,
          engagement: s.engagement,
          deliverables: parseJsonArray(s.deliverables),
          idealFor: parseJsonArray(s.idealFor),
          published: s.published,
          sortOrder: s.sortOrder,
          createdAt: toDateOrNull(s.createdAt) ?? new Date(),
          updatedAt: toDateOrNull(s.updatedAt) ?? new Date(),
        },
      },
      { upsert: true, new: true },
    ).exec();
    serviceIdByLegacy.set(s.id, doc._id);
    counts['consultancy-services'] = (counts['consultancy-services'] ?? 0) + 1;
  }

  // ---- consultancy enquiries ---------------------------------------------
  for (const e of exportData.consultancyEnquiries as any[]) {
    await upsert(ConsultancyEnquiry, e.id, {
      name: e.name,
      email: e.email,
      phone: e.phone,
      company: e.company,
      companySize: e.companySize ?? null,
      budget: e.budget ?? null,
      timeline: e.timeline ?? null,
      message: e.message,
      status: e.status,
      serviceId: e.serviceId ? serviceIdByLegacy.get(e.serviceId) ?? null : null,
      serviceTitle: e.serviceId
        ? (exportData.consultancyServices.find((s) => s.id === e.serviceId) as any)?.title ?? null
        : null,
      createdAt: toDateOrNull(e.createdAt) ?? new Date(),
      updatedAt: toDateOrNull(e.updatedAt) ?? new Date(),
    });
  }

  // ---- job postings -------------------------------------------------------
  const jobIdByLegacy = new Map<string, mongoose.Types.ObjectId>();
  const jobTitleByLegacy = new Map<string, string>();
  for (const j of exportData.jobPostings as any[]) {
    const doc = await JobPosting.findOneAndUpdate(
      { legacyId: j.id },
      {
        $set: {
          slug: j.slug,
          title: j.title,
          department: j.department,
          location: j.location,
          employment: j.employment,
          workMode: j.workMode,
          experience: j.experience,
          salaryMin: j.salaryMin ?? null,
          salaryMax: j.salaryMax ?? null,
          currency: j.currency,
          summary: j.summary,
          description: j.description,
          requirements: parseJsonArray(j.requirements),
          benefits: parseJsonArray(j.benefits),
          published: j.published,
          closesAt: toDateOrNull(j.closesAt),
          createdAt: toDateOrNull(j.createdAt) ?? new Date(),
          updatedAt: toDateOrNull(j.updatedAt) ?? new Date(),
        },
      },
      { upsert: true, new: true },
    ).exec();
    jobIdByLegacy.set(j.id, doc._id);
    jobTitleByLegacy.set(j.id, j.title);
    counts['job-postings'] = (counts['job-postings'] ?? 0) + 1;
  }

  // ---- job applications (with résumé copy) --------------------------------
  const resumeDir = process.env.RESUME_DIR ?? resolve(process.cwd(), 'resumes');
  mkdirSync(resumeDir, { recursive: true });
  let resumesCopied = 0;
  for (const a of exportData.jobApplications as any[]) {
    let resumePath = a.resumePath ?? null;
    if (resumePath) {
      const source = resolve(resumeSourceDir, basename(String(resumePath)));
      if (existsSync(source)) {
        // Copy, never move — the old Next app's résumé route still serves
        // from the source dir during the parallel-run window.
        const target = resolve(resumeDir, basename(String(resumePath)));
        if (!existsSync(target)) {
          copyFileSync(source, target);
          resumesCopied++;
        }
      } else {
        console.warn(`  resume missing at source: ${basename(String(resumePath))}`);
      }
    }
    await upsert(JobApplication, a.id, {
      name: a.name,
      email: a.email,
      phone: a.phone,
      linkedin: a.linkedin ?? null,
      portfolio: a.portfolio ?? null,
      coverLetter: a.coverLetter,
      resumePath,
      resumeName: a.resumeName ?? null,
      status: a.status,
      jobId: jobIdByLegacy.get(a.jobId) ?? null,
      jobTitle: jobTitleByLegacy.get(a.jobId) ?? 'Unknown role',
      createdAt: toDateOrNull(a.createdAt) ?? new Date(),
      updatedAt: toDateOrNull(a.updatedAt) ?? new Date(),
    });
  }

  // ---- blog posts ---------------------------------------------------------
  for (const p of exportData.blogPosts as any[]) {
    await upsert(BlogPost, p.id, {
      slug: p.slug,
      title: p.title,
      excerpt: p.excerpt,
      content: p.content,
      coverImage: p.coverImage,
      category: p.category,
      tags: parseJsonArray(p.tags),
      published: p.published,
      featured: p.featured,
      publishedAt: toDateOrNull(p.publishedAt),
      authorId: p.authorId ? trainerIdByLegacy.get(p.authorId) ?? null : null,
      createdAt: toDateOrNull(p.createdAt) ?? new Date(),
      updatedAt: toDateOrNull(p.updatedAt) ?? new Date(),
    });
  }

  // ---- registrations (training-linked only) -------------------------------
  const trainingIdByLegacy = new Map<string, mongoose.Types.ObjectId>();
  const trainingTitleByLegacy = new Map<string, string>();
  for (const t of exportData.trainings as any[]) {
    const existing = await Training.findOne({ legacyId: t.id }).select('_id').exec();
    if (existing) {
      trainingIdByLegacy.set(t.id, existing._id);
      trainingTitleByLegacy.set(t.id, t.title);
    }
  }
  let eventRegistrationsSkipped = 0;
  for (const r of exportData.registrations as any[]) {
    if (r.eventId) {
      // Legacy event RSVPs: already migrated into the tickets collection by
      // import-events.ts — importing them again would duplicate them across
      // the two systems. Skipped, not silently dropped.
      eventRegistrationsSkipped++;
      continue;
    }
    if (!r.trainingId) continue;
    await upsert(Registration, r.id, {
      name: r.name,
      email: r.email,
      phone: r.phone,
      company: r.company ?? null,
      seats: r.seats,
      message: r.message ?? null,
      status: r.status,
      trainingId: trainingIdByLegacy.get(r.trainingId) ?? null,
      trainingTitle: trainingTitleByLegacy.get(r.trainingId) ?? 'Unknown programme',
      createdAt: toDateOrNull(r.createdAt) ?? new Date(),
      updatedAt: toDateOrNull(r.updatedAt) ?? new Date(),
    });
  }

  // ---- contact messages ---------------------------------------------------
  for (const m of exportData.contactMessages as any[]) {
    await upsert(ContactMessage, m.id, {
      name: m.name,
      email: m.email,
      phone: m.phone ?? null,
      subject: m.subject,
      message: m.message,
      handled: m.handled,
      createdAt: toDateOrNull(m.createdAt) ?? new Date(),
      updatedAt: toDateOrNull(m.updatedAt) ?? new Date(),
    });
  }

  // ---- subscribers (upsert by email so a legacyId clash can't duplicate) --
  for (const s of exportData.subscribers as any[]) {
    await Subscriber.findOneAndUpdate(
      { email: s.email },
      { $set: { legacyId: s.id, active: s.active, createdAt: toDateOrNull(s.createdAt) ?? new Date() } },
      { upsert: true },
    ).exec();
    counts['subscribers'] = (counts['subscribers'] ?? 0) + 1;
  }

  await mongoose.disconnect();

  console.log('Imported:');
  for (const [name, count] of Object.entries(counts)) {
    console.log(`  ${name}: ${count}`);
  }
  if (eventRegistrationsSkipped > 0) {
    console.log(`  skipped ${eventRegistrationsSkipped} event-linked registrations (already tickets — see import-events.ts)`);
  }
  if (resumesCopied > 0) {
    console.log(`  copied ${resumesCopied} résumé files into ${resumeDir}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
