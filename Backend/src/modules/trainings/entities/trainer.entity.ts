import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type TrainerDocument = HydratedDocument<Trainer>;

/**
 * Mirrors Frontend/prisma/schema.prisma's `Trainer` model 1:1. Referenced by
 * Training (`trainerId`, the "Facilitator" picker) and BlogPost (`authorId`,
 * the "Author" picker). The current admin UI has no trainer management page,
 * so this collection is read-only from the API's point of view today —
 * records arrive via the import script only.
 */
@Schema({ collection: 'trainers', timestamps: true })
export class Trainer {
  @Prop({ type: String, required: false, unique: true, sparse: true })
  legacyId?: string;

  @Prop({ type: String, required: true })
  name!: string;

  @Prop({ type: String, required: false, default: '' })
  title!: string;

  @Prop({ type: String, required: false, default: '' })
  bio!: string;

  @Prop({ type: String, required: false, default: '' })
  photo!: string;

  @Prop({ type: String, required: false, default: null })
  linkedin!: string | null;

  @Prop({ type: Date })
  createdAt?: Date;

  @Prop({ type: Date })
  updatedAt?: Date;
}

export const TrainerSchema = SchemaFactory.createForClass(Trainer);
