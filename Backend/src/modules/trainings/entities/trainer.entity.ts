import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type TrainerDocument = HydratedDocument<Trainer>;

/**
 * Mirrors Frontend/prisma/schema.prisma's `Trainer` model 1:1 — shown in the
 * admin as "Facilitators" and managed there (TrainersController). Referenced
 * by Training (`trainerIds`, the "Facilitators" picker), CourseRun and
 * CourseRunSession (`trainerId`, the trainer on the day), and older BlogPosts
 * (`authorId`, from before the Author picker gave way to "Written by" text).
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
