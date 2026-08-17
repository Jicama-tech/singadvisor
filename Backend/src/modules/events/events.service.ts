import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { randomUUID } from 'crypto';
import { Model } from 'mongoose';
import { Event, EventDocument } from './entities/event.entity';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';

/** Mirrors Frontend's `slugify` in `src/lib/utils.ts` — same output for the same input. */
function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

@Injectable()
export class EventsService {
  constructor(
    @InjectModel(Event.name)
    private readonly model: Model<EventDocument>,
  ) {}

  /** Public list: published events only, soonest first. Mirrors the current
   * Prisma-backed `/events` query (`published:true, startsAt:{gte:now}`). */
  findPublished(opts: { includePast?: boolean } = {}) {
    const now = new Date();
    return this.model
      .find({
        published: true,
        startDate: opts.includePast ? { $lt: now } : { $gte: now },
      })
      .sort({ startDate: opts.includePast ? -1 : 1 })
      .exec();
  }

  search(query: string) {
    const regex = new RegExp(query, 'i');
    return this.model
      .find({
        published: true,
        $or: [{ title: regex }, { description: regex }, { category: regex }, { tags: regex }],
      })
      .sort({ startDate: 1 })
      .exec();
  }

  showcase(limit = 8) {
    return this.model
      .find({ published: true, featured: true })
      .sort({ startDate: 1 })
      .limit(limit)
      .exec();
  }

  /** Public route — only ever returns published events, same as the old
   * Prisma-backed page's own `if (!event.published) notFound()` check, but
   * enforced at the API boundary instead of trusting every caller to repeat
   * it (a draft's full details must never leak to an unauthenticated
   * request that merely guesses/knows its slug). */
  async findBySlug(slug: string) {
    const doc = await this.model.findOne({ slug, published: true }).exec();
    if (!doc) throw new NotFoundException(`No event with slug "${slug}"`);
    return doc;
  }

  /** Admin lookup — unlike `findBySlug`, doesn't require `published:true`. */
  async findById(id: string) {
    const doc = await this.model.findById(id).exec();
    if (!doc) throw new NotFoundException(`No event with id "${id}"`);
    return doc;
  }

  /** Admin list: everything, newest start date first. */
  findAllForAdmin() {
    return this.model.find().sort({ startDate: -1 }).exec();
  }

  async create(dto: CreateEventDto) {
    const slug = await this.uniqueSlug(dto.slug?.trim() || dto.title, null);
    const doc = new this.model({
      ...dto,
      slug,
      startDate: new Date(dto.startDate),
      endDate: new Date(dto.endDate),
      visitorTypes: dto.visitorTypes.map((tier) => ({
        ...tier,
        id: tier.id || randomUUID(),
        soldCount: tier.soldCount ?? 0,
        isActive: tier.isActive ?? true,
      })),
      speakerProfiles: (dto.speakerProfiles ?? []).map((s) => ({
        ...s,
        id: s.id || randomUUID(),
      })),
      sponsorTypes: (dto.sponsorTypes ?? []).map((s) => ({
        ...s,
        id: s.id || randomUUID(),
        collectPayment: s.collectPayment ?? true,
      })),
    });
    return doc.save();
  }

  async update(id: string, dto: UpdateEventDto) {
    const existing = await this.findById(id);
    // `Record<string, unknown>`, not `Partial<Event>` — the DTO's dates are
    // ISO strings (`@IsDateString`) while the schema's are `Date`; Mongoose
    // coerces the string at write time regardless of the static type here.
    const update: Record<string, unknown> = { ...dto };
    if (dto.startDate !== undefined) update.startDate = new Date(dto.startDate);
    if (dto.endDate !== undefined) update.endDate = new Date(dto.endDate);
    if (dto.slug !== undefined || dto.title !== undefined) {
      update.slug = await this.uniqueSlug(dto.slug?.trim() || dto.title || existing.title, id);
    }
    if (dto.visitorTypes) {
      update.visitorTypes = dto.visitorTypes.map((tier) => ({
        ...tier,
        id: tier.id || randomUUID(),
        soldCount: tier.soldCount ?? 0,
        isActive: tier.isActive ?? true,
        featureAccess: tier.featureAccess ?? [],
      }));
    }
    if (dto.speakerProfiles) {
      update.speakerProfiles = dto.speakerProfiles.map((s) => ({
        ...s,
        id: s.id || randomUUID(),
      }));
    }
    if (dto.sponsorTypes) {
      update.sponsorTypes = dto.sponsorTypes.map((s) => ({
        ...s,
        id: s.id || randomUUID(),
        collectPayment: s.collectPayment ?? true,
      }));
    }
    const doc = await this.model.findByIdAndUpdate(id, update, { new: true }).exec();
    if (!doc) throw new NotFoundException(`No event with id "${id}"`);
    return doc;
  }

  async setStatus(id: string, status: 'draft' | 'published' | 'cancelled') {
    const doc = await this.model.findByIdAndUpdate(id, { status }, { new: true }).exec();
    if (!doc) throw new NotFoundException(`No event with id "${id}"`);
    return doc;
  }

  async setPublished(id: string, published: boolean) {
    const doc = await this.model.findByIdAndUpdate(id, { published }, { new: true }).exec();
    if (!doc) throw new NotFoundException(`No event with id "${id}"`);
    return doc;
  }

  async remove(id: string) {
    const doc = await this.model.findByIdAndDelete(id).exec();
    if (!doc) throw new NotFoundException(`No event with id "${id}"`);
    return doc;
  }

  /**
   * Appends `-2`, `-3`, ... on collision — same behaviour as the Frontend's
   * current `saveEvent` slug-clash check, just scoped to this collection
   * instead of a Prisma `findFirst`. `excludeId` skips the document being
   * updated so re-saving with an unchanged slug doesn't collide with itself.
   */
  private async uniqueSlug(base: string, excludeId: string | null): Promise<string> {
    const root = slugify(base);
    if (!root) throw new BadRequestException('Could not derive a URL slug from the title.');
    let candidate = root;
    let n = 2;
    while (
      await this.model
        .exists({ slug: candidate, ...(excludeId ? { _id: { $ne: excludeId } } : {}) })
        .exec()
    ) {
      candidate = `${root}-${n++}`;
    }
    return candidate;
  }
}
