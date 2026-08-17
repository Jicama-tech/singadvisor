import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type RegistrationDocument = HydratedDocument<Registration>;

/**
 * Mirrors Frontend/prisma/schema.prisma's `Registration` model — with one
 * deliberate cut: the legacy `eventId` branch. Event RSVPs were superseded by
 * eventsh's real ticket flow (import-events.ts already migrated those rows
 * into tickets), so this collection only ever holds *training* registrations
 * going forward; the import script skips event-linked rows and logs them
 * rather than resurrecting a dead flow. `trainingTitle` is denormalized for
 * the admin list view, exactly like the old page's join did.
 */
@Schema({ collection: 'registrations', timestamps: true })
export class Registration {
  @Prop({ type: String, required: false, unique: true, sparse: true })
  legacyId?: string;

  @Prop({ type: String, required: true })
  name!: string;

  @Prop({ type: String, required: true })
  email!: string;

  @Prop({ type: String, required: true })
  phone!: string;

  @Prop({ type: String, required: false, default: null })
  company!: string | null;

  @Prop({ type: Number, required: true, default: 1 })
  seats!: number;

  @Prop({ type: String, required: false, default: null })
  message!: string | null;

  /** pending | confirmed | cancelled */
  @Prop({ type: String, required: true, default: 'pending', index: true })
  status!: string;

  @Prop({ type: Types.ObjectId, ref: 'Training', required: true })
  trainingId!: Types.ObjectId;

  @Prop({ type: String, required: true })
  trainingTitle!: string;

  @Prop({ type: Date })
  createdAt?: Date;

  @Prop({ type: Date })
  updatedAt?: Date;
}

export const RegistrationSchema = SchemaFactory.createForClass(Registration);
RegistrationSchema.index({ trainingId: 1 });
RegistrationSchema.index({ createdAt: -1 });
