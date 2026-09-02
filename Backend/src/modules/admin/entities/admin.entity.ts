// admin.entity.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type AdminRole = 'owner' | 'editor';

export type AdminUserDocument = HydratedDocument<AdminUser>;

/**
 * Mirrors Frontend/prisma/schema.prisma's `AdminUser` model 1:1 (see
 * Appendix A of the modernization proposal — same role model, same bcrypt
 * hashing, just re-expressed as a MongoDB document instead of a SQLite row).
 */
@Schema({ collection: 'admin-users' })
export class AdminUser {
  @Prop({ type: String, required: true, unique: true, lowercase: true, trim: true })
  email!: string;

  @Prop({ type: String, required: true })
  name!: string;

  @Prop({ type: String, required: true, enum: ['owner', 'editor'], default: 'editor' })
  role!: AdminRole;

  @Prop({ type: Date, required: true, default: () => new Date() })
  createdAt!: Date;

  @Prop({ type: Date, required: false, default: null })
  lastLoginAt!: Date | null;
}

export const AdminUserSchema = SchemaFactory.createForClass(AdminUser);
