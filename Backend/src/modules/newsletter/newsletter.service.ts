import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Newsletter, NewsletterDocument } from './entities/newsletter.entity';
import { SaveNewsletterDto } from './dto/save-newsletter.dto';

@Injectable()
export class NewsletterService {
  constructor(
    @InjectModel(Newsletter.name)
    private readonly model: Model<NewsletterDocument>,
  ) {}

  /** Public list: published only, newest first. */
  findPublished() {
    return this.model.find({ published: true }).sort({ createdAt: -1 }).exec();
  }

  /** Admin list: everything, newest first. */
  findAll() {
    return this.model.find().sort({ createdAt: -1 }).exec();
  }

  findById(id: string) {
    return this.model.findById(id).exec();
  }

  async save(dto: SaveNewsletterDto, id?: string) {
    if (!id) {
      if (!dto.title) throw new BadRequestException('Title is required.');
      if (!dto.image) throw new BadRequestException('An image is required.');
      if (!dto.message) throw new BadRequestException('A message is required.');
      if (!dto.referenceLink) {
        throw new BadRequestException('A reference link is required.');
      }
    }

    const data: Record<string, unknown> = {
      ...(dto.title !== undefined && { title: dto.title }),
      ...(dto.image !== undefined && { image: dto.image }),
      ...(dto.imageAlt !== undefined && { imageAlt: dto.imageAlt }),
      ...(dto.message !== undefined && { message: dto.message }),
      ...(dto.referenceLink !== undefined && { referenceLink: dto.referenceLink }),
      ...(dto.published !== undefined && { published: dto.published }),
    };

    if (id) {
      const doc = await this.model
        .findByIdAndUpdate(id, data, { new: true, runValidators: true })
        .exec();
      if (!doc) throw new NotFoundException(`No newsletter with id "${id}"`);
      return doc;
    }

    return this.model.create(data);
  }

  async remove(id: string) {
    const doc = await this.model.findByIdAndDelete(id).exec();
    if (!doc) throw new NotFoundException(`No newsletter with id "${id}"`);
    return doc;
  }
}
