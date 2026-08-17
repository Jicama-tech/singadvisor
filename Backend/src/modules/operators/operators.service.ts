import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { Operator, OperatorDocument } from './entities/operator.entity';
import { CreateOperatorDto } from './dto/create-operator.dto';
import { UpdateOperatorDto } from './dto/update-operator.dto';
import { ACCESS_TABS, isAccessTab } from './access-tabs';

@Injectable()
export class OperatorsService {
  constructor(
    @InjectModel(Operator.name) private readonly model: Model<OperatorDocument>,
  ) {}

  /** Admin list — secret-free (no passwordHash). */
  findForAdmin() {
    return this.model
      .find()
      .select('-passwordHash')
      .sort({ createdAt: -1 })
      .exec();
  }

  /** Full record including passwordHash — for the auth login path only. */
  findByEmailForAuth(email: string) {
    return this.model.findOne({ email: email.toLowerCase().trim() }).exec();
  }

  findByIdForAuth(id: string) {
    return this.model.findById(id).exec();
  }

  /** The logged-in operator's own record (secret-free) — the SPA fetches
   * this after login to filter the sidebar by fresh accessTabs. */
  async findMe(id: string) {
    const doc = await this.model.findById(id).select('-passwordHash').exec();
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

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const created = await this.model.create({
      name: dto.name,
      email,
      passwordHash,
      accessTabs: this.validateTabs(dto.accessTabs),
      createdBy,
    });
    // Never echo the hash back in a response (same rule as the admin
    // service's sanitize).
    return this.model.findById(created._id).select('-passwordHash').exec();
  }

  async update(id: string, dto: UpdateOperatorDto) {
    const doc = await this.model.findById(id).exec();
    if (!doc) throw new NotFoundException('Operator not found');

    const update: Record<string, unknown> = {};
    if (dto.name !== undefined) update.name = dto.name;
    if (dto.email !== undefined) update.email = dto.email.toLowerCase().trim();
    if (dto.accessTabs !== undefined) update.accessTabs = this.validateTabs(dto.accessTabs);
    if (dto.active !== undefined) update.active = dto.active;
    if (dto.password) update.passwordHash = await bcrypt.hash(dto.password, 12);

    const updated = await this.model
      .findByIdAndUpdate(id, update, { new: true })
      .select('-passwordHash')
      .exec();
    return updated;
  }

  async remove(id: string) {
    const doc = await this.model.findByIdAndDelete(id).exec();
    if (!doc) throw new NotFoundException('Operator not found');
    return doc;
  }

  async changePassword(id: string, currentPassword: string, newPassword: string) {
    const doc = await this.model.findById(id).exec();
    if (!doc) throw new NotFoundException('Operator not found');
    const valid = await bcrypt.compare(currentPassword, doc.passwordHash);
    if (!valid) throw new BadRequestException('Current password is incorrect');
    doc.passwordHash = await bcrypt.hash(newPassword, 12);
    await doc.save();
    return { ok: true };
  }
}
