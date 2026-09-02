import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type OperatorDocument = HydratedDocument<Operator>;

/**
 * Staff accounts with limited dashboard access — created by an admin from
 * the Settings → Operators tab. They sign in with Google against this email;
 * there is no password anywhere in the system. `accessTabs` carries the main-sidebar keys
 * (see access-tabs.ts) this operator may see; everything else in the
 * dashboard is hidden from them client-side (same enforcement model
 * eventsh's own operators use).
 */
@Schema({ collection: 'operators', timestamps: true })
export class Operator {
  @Prop({ type: String, required: true })
  name!: string;

  @Prop({ type: String, required: true, unique: true, lowercase: true, trim: true })
  email!: string;

  @Prop({ type: [String], default: [] })
  accessTabs!: string[];

  @Prop({ type: Boolean, default: true })
  active!: boolean;

  @Prop({ type: String, default: '' })
  createdBy!: string;

  @Prop({ type: Date })
  createdAt?: Date;

  @Prop({ type: Date })
  updatedAt?: Date;
}

export const OperatorSchema = SchemaFactory.createForClass(Operator);
