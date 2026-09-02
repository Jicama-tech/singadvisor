import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as ExcelJS from 'exceljs';
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

  async findAll(filters: { q?: string; tag?: string; source?: string; role?: string }) {
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
      whatsapp: dto.whatsapp ?? '',
      role: dto.role ?? '',
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
  async exportCsv(filters: { q?: string; tag?: string; source?: string; role?: string }) {
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
