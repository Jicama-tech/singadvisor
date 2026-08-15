import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcryptjs';
import { Model } from 'mongoose';
import { AdminUser, AdminUserDocument } from './entities/admin.entity';
import { CreateAdminDto } from './dto/create-admin.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';

const HASH_ROUNDS = 12; // matches Frontend/src/lib/auth.ts and prisma/seed.ts

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

  /** Never returns passwordHash — only used by AdminController's list route. */
  findAll() {
    return this.adminUserModel.find().select('-passwordHash').sort({ createdAt: -1 }).exec();
  }

  async create(dto: CreateAdminDto) {
    const email = dto.email.toLowerCase().trim();
    if (await this.adminUserModel.exists({ email })) {
      throw new ConflictException(`An admin with email ${email} already exists`);
    }
    const passwordHash = await bcrypt.hash(dto.password, HASH_ROUNDS);
    const created = await this.adminUserModel.create({
      email,
      name: dto.name,
      passwordHash,
      role: dto.role ?? 'editor',
    });
    return this.sanitize(created);
  }

  async update(id: string, dto: UpdateAdminDto) {
    const patch: Partial<AdminUser> = {};
    if (dto.name !== undefined) patch.name = dto.name;
    if (dto.role !== undefined) patch.role = dto.role;
    if (dto.password !== undefined) patch.passwordHash = await bcrypt.hash(dto.password, HASH_ROUNDS);

    const updated = await this.adminUserModel
      .findByIdAndUpdate(id, patch, { new: true })
      .exec();
    if (!updated) throw new NotFoundException(`No admin with id ${id}`);
    return this.sanitize(updated);
  }

  async remove(id: string) {
    const deleted = await this.adminUserModel.findByIdAndDelete(id).exec();
    if (!deleted) throw new NotFoundException(`No admin with id ${id}`);
    return { id };
  }

  private sanitize(doc: AdminUserDocument) {
    const { passwordHash: _passwordHash, ...rest } = doc.toObject();
    return rest;
  }
}
