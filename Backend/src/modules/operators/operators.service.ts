import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Operator, OperatorDocument } from './entities/operator.entity';
import { CreateOperatorDto } from './dto/create-operator.dto';
import { UpdateOperatorDto } from './dto/update-operator.dto';
import { ACCESS_TABS, isAccessTab } from './access-tabs';

@Injectable()
export class OperatorsService {
  constructor(
    @InjectModel(Operator.name) private readonly model: Model<OperatorDocument>,
  ) {}

  findForAdmin() {
    return this.model.find().sort({ createdAt: -1 }).exec();
  }

  /** Looked up by the Google sign-in path to decide whether this address is
   * allowed in at all. */
  findByEmailForAuth(email: string) {
    return this.model.findOne({ email: email.toLowerCase().trim() }).exec();
  }

  findByIdForAuth(id: string) {
    return this.model.findById(id).exec();
  }

  /** The logged-in operator's own record — the SPA fetches
   * this after login to filter the sidebar by fresh accessTabs. */
  async findMe(id: string) {
    const doc = await this.model.findById(id).exec();
    if (!doc) throw new NotFoundException('Operator not found');
    return doc;
  }

  private validateTabs(tabs: string[]): string[] {
    const cleaned = [...new Set(tabs)].filter(isAccessTab);
    if (cleaned.length !== tabs.length) {
      throw new BadRequestException(
        `Unknown tab key in accessTabs (allowed: ${ACCESS_TABS.join(', ')})`,
      );
    }
    return cleaned;
  }

  async create(dto: CreateOperatorDto, createdBy: string) {
    const email = dto.email.toLowerCase().trim();
    const existing = await this.model.findOne({ email }).exec();
    if (existing) throw new BadRequestException('An operator with that email already exists');

    const created = await this.model.create({
      name: dto.name,
      email,
      accessTabs: this.validateTabs(dto.accessTabs),
      createdBy,
    });
    return this.model.findById(created._id).exec();
  }

  async update(id: string, dto: UpdateOperatorDto) {
    const doc = await this.model.findById(id).exec();
    if (!doc) throw new NotFoundException('Operator not found');

    const update: Record<string, unknown> = {};
    if (dto.name !== undefined) update.name = dto.name;
    if (dto.email !== undefined) update.email = dto.email.toLowerCase().trim();
    if (dto.accessTabs !== undefined) update.accessTabs = this.validateTabs(dto.accessTabs);
    if (dto.active !== undefined) update.active = dto.active;

    const updated = await this.model.findByIdAndUpdate(id, update, { new: true }).exec();
    return updated;
  }

  async remove(id: string) {
    const doc = await this.model.findByIdAndDelete(id).exec();
    if (!doc) throw new NotFoundException('Operator not found');
    return doc;
  }
}
