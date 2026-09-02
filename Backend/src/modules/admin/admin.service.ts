import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AdminUser, AdminUserDocument } from './entities/admin.entity';
import { CreateAdminDto } from './dto/create-admin.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';

@Injectable()
export class AdminService {
  constructor(
    @InjectModel(AdminUser.name)
    private readonly adminUserModel: Model<AdminUserDocument>,
  ) {}

  findByEmail(email: string) {
    return this.adminUserModel.findOne({ email: email.toLowerCase().trim() }).exec();
  }

  findById(id: string) {
    return this.adminUserModel.findById(id).exec();
  }

  async touchLastLogin(id: string) {
    await this.adminUserModel.updateOne({ _id: id }, { lastLoginAt: new Date() }).exec();
  }

  /** Settings → Profile: the logged-in admin's own name. */
  async updateOwnProfile(id: string, name: string) {
    const updated = await this.adminUserModel
      .findByIdAndUpdate(id, { name }, { new: true })
      .exec();
    if (!updated) throw new NotFoundException('Admin not found');
    return updated.toObject();
  }

  /** Only used by AdminController's list route. */
  findAll() {
    return this.adminUserModel.find().sort({ createdAt: -1 }).exec();
  }

  async create(dto: CreateAdminDto) {
    const email = dto.email.toLowerCase().trim();
    if (await this.adminUserModel.exists({ email })) {
      throw new ConflictException(`An admin with email ${email} already exists`);
    }
    const created = await this.adminUserModel.create({
      email,
      name: dto.name,
      role: dto.role ?? 'editor',
    });
    return created.toObject();
  }

  async update(id: string, dto: UpdateAdminDto) {
    const patch: Partial<AdminUser> = {};
    if (dto.name !== undefined) patch.name = dto.name;
    if (dto.role !== undefined) patch.role = dto.role;

    const updated = await this.adminUserModel
      .findByIdAndUpdate(id, patch, { new: true })
      .exec();
    if (!updated) throw new NotFoundException(`No admin with id ${id}`);
    return updated.toObject();
  }

  async remove(id: string) {
    const deleted = await this.adminUserModel.findByIdAndDelete(id).exec();
    if (!deleted) throw new NotFoundException(`No admin with id ${id}`);
    return { id };
  }
}
