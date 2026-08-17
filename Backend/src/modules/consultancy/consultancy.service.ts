import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { slugify } from '../../common/utils/slugify';
import {
  ConsultancyService as ConsultancyServiceEntity,
  ConsultancyServiceDocument,
} from './entities/consultancy-service.entity';
import {
  ConsultancyEnquiry,
  ConsultancyEnquiryDocument,
} from './entities/consultancy-enquiry.entity';
import { SaveServiceDto } from './dto/save-service.dto';
import { SaveEnquiryDto } from './dto/save-enquiry.dto';

@Injectable()
export class ConsultancyService {
  constructor(
    @InjectModel(ConsultancyServiceEntity.name)
    private readonly model: Model<ConsultancyServiceDocument>,
    @InjectModel(ConsultancyEnquiry.name)
    private readonly enquiryModel: Model<ConsultancyEnquiryDocument>,
  ) {}

  /** Public list: published services in display order. */
  findPublished() {
    return this.model.find({ published: true }).sort({ sortOrder: 1 }).exec();
  }

  /** Admin list: everything, newest edits first. */
  findAll() {
    return this.model.find().sort({ updatedAt: -1 }).exec();
  }

  findById(id: string) {
    return this.model.findById(id).exec();
  }

  async findBySlugPublic(slug: string) {
    const doc = await this.model.findOne({ slug, published: true }).exec();
    if (!doc) throw new NotFoundException(`No consultancy service with slug "${slug}"`);
    return doc;
  }

  async save(dto: SaveServiceDto, id?: string) {
    if (!id && !dto.title) {
      throw new BadRequestException('Title is required.');
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
      ...(dto.summary !== undefined && { summary: dto.summary }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.image !== undefined && { image: dto.image }),
      ...(dto.icon !== undefined && { icon: dto.icon }),
      ...(dto.engagement !== undefined && { engagement: dto.engagement }),
      ...(dto.deliverables !== undefined && { deliverables: dto.deliverables }),
      ...(dto.idealFor !== undefined && { idealFor: dto.idealFor }),
      ...(dto.published !== undefined && { published: dto.published }),
      ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
    };

    if (id) {
      const doc = await this.model
        .findByIdAndUpdate(id, data, { new: true, runValidators: true })
        .exec();
      if (!doc) throw new NotFoundException(`No consultancy service with id "${id}"`);
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
    if (!doc) throw new NotFoundException(`No consultancy service with id "${id}"`);
    return doc;
  }

  // ---- enquiries ----------------------------------------------------------

  findEnquiries() {
    return this.enquiryModel.find().sort({ createdAt: -1 }).exec();
  }

  async createEnquiry(dto: SaveEnquiryDto) {
    // Only attach a service if it genuinely exists — a stale or tampered id
    // should not fail the whole submission (same rule the old server action
    // applied).
    let serviceId: Types.ObjectId | null = null;
    let serviceTitle: string | null = null;
    if (dto.serviceId && Types.ObjectId.isValid(dto.serviceId)) {
      const service = await this.model.findById(dto.serviceId).exec();
      if (service) {
        serviceId = service._id;
        serviceTitle = service.title;
      }
    }

    return this.enquiryModel.create({
      name: dto.name,
      email: dto.email.toLowerCase(),
      phone: dto.phone,
      company: dto.company,
      companySize: dto.companySize ?? null,
      budget: dto.budget ?? null,
      timeline: dto.timeline ?? null,
      message: dto.message,
      serviceId,
      serviceTitle,
    });
  }

  async updateEnquiryStatus(id: string, status: string) {
    const doc = await this.enquiryModel
      .findByIdAndUpdate(id, { status }, { new: true, runValidators: true })
      .exec();
    if (!doc) throw new NotFoundException(`No enquiry with id "${id}"`);
    return doc;
  }
}
