import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Contact, ContactDocument } from './entities/contact.entity';
import { UpdateContactDto } from './dto/update-contact.dto';
import { CreateContactDto } from './dto/create-contact.dto';
import { AddNoteDto } from './dto/add-note.dto';
import { Registration, RegistrationDocument } from '../registrations/entities/registration.entity';
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

export type UpsertContactInput = {
  email: string;
  name?: string;
  phone?: string;
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

@Injectable()
export class CrmService {
  private readonly logger = new Logger(CrmService.name);

  constructor(
    @InjectModel(Contact.name)
    private readonly model: Model<ContactDocument>,
    // Read-only cross-module injections, backfill() only — same pattern
    // PlatformSyncService already uses to read BlogPost/Newsletter counts
    // from outside their own modules.
    @InjectModel(Registration.name)
    private readonly registrationModel: Model<RegistrationDocument>,
    @InjectModel(ConsultancyEnquiry.name)
    private readonly enquiryModel: Model<ConsultancyEnquiryDocument>,
    @InjectModel(JobApplication.name)
    private readonly applicationModel: Model<JobApplicationDocument>,
    @InjectModel(ContactMessage.name)
    private readonly messageModel: Model<ContactMessageDocument>,
    @InjectModel(Subscriber.name)
    private readonly subscriberModel: Model<SubscriberDocument>,
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
      return this.model.create({
        email,
        name: input.name ?? '',
        phone: input.phone ?? '',
        company: input.company ?? '',
        sources: [sourceEntry],
        firstSeenAt: at,
        lastActivityAt: at,
      });
    }

    existing.sources.push(sourceEntry);
    if (at > existing.lastActivityAt) existing.lastActivityAt = at;
    if (at < existing.firstSeenAt) existing.firstSeenAt = at;
    if (!existing.name && input.name) existing.name = input.name;
    if (!existing.phone && input.phone) existing.phone = input.phone;
    if (!existing.company && input.company) existing.company = input.company;
    await existing.save();
    return existing;
  }

  async findAll(filters: { q?: string; tag?: string; leadStatus?: string; source?: string }) {
    const query: Record<string, unknown> = {};
    if (filters.q) {
      const re = new RegExp(filters.q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      query.$or = [{ name: re }, { email: re }, { company: re }];
    }
    if (filters.tag) query.tags = filters.tag;
    if (filters.leadStatus) query.leadStatus = filters.leadStatus;
    if (filters.source) query['sources.type'] = filters.source;

    return this.model.find(query).sort({ lastActivityAt: -1 }).exec();
  }

  async findById(id: string) {
    const doc = await this.model.findById(id).exec();
    if (!doc) throw new NotFoundException(`No contact with id "${id}"`);
    return doc;
  }

  async createManual(dto: CreateContactDto) {
    const email = dto.email.toLowerCase().trim();
    const existing = await this.model.findOne({ email }).exec();
    if (existing) return existing;

    const now = new Date();
    return this.model.create({
      email,
      name: dto.name ?? '',
      phone: dto.phone ?? '',
      company: dto.company ?? '',
      sources: [{ type: 'manual', refId: null, label: 'Added manually', createdAt: now }],
      firstSeenAt: now,
      lastActivityAt: now,
    });
  }

  async update(id: string, dto: UpdateContactDto) {
    const doc = await this.model
      .findByIdAndUpdate(id, { $set: dto }, { new: true, runValidators: true })
      .exec();
    if (!doc) throw new NotFoundException(`No contact with id "${id}"`);
    return doc;
  }

  async addNote(id: string, dto: AddNoteDto, authorName: string) {
    const doc = await this.model.findById(id).exec();
    if (!doc) throw new NotFoundException(`No contact with id "${id}"`);
    doc.notes.push({ text: dto.text, authorName, createdAt: new Date() });
    await doc.save();
    return doc;
  }

  async deleteNote(id: string, noteId: string) {
    const doc = await this.model.findById(id).exec();
    if (!doc) throw new NotFoundException(`No contact with id "${id}"`);
    doc.notes = doc.notes.filter((n) => String((n as unknown as { _id: Types.ObjectId })._id) !== noteId);
    await doc.save();
    return doc;
  }

  async remove(id: string) {
    const doc = await this.model.findByIdAndDelete(id).exec();
    if (!doc) throw new NotFoundException(`No contact with id "${id}"`);
    return doc;
  }

  /** CSV of the current filtered list — same filters as findAll. */
  async exportCsv(filters: { q?: string; tag?: string; leadStatus?: string; source?: string }) {
    const contacts = await this.findAll(filters);
    const header = ['Name', 'Email', 'Phone', 'Company', 'Lead status', 'Tags', 'First seen', 'Last activity'];
    const rows = contacts.map((c) => [
      c.name,
      c.email,
      c.phone,
      c.company,
      c.leadStatus,
      c.tags.join('; '),
      c.firstSeenAt.toISOString(),
      c.lastActivityAt.toISOString(),
    ]);
    const escape = (v: string) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    return [header, ...rows].map((r) => r.map(escape).join(',')).join('\r\n');
  }

  /**
   * One-off migration: walks every existing registration/enquiry/
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

    this.logger.log(`CRM backfill scanned ${scanned} source records.`);
    return { scanned };
  }
}
