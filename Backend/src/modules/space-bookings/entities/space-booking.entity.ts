import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type SpaceBookingDocument = HydratedDocument<SpaceBooking>;

/** One slot on one placed space, priced at quote time from the event's own
 * data — never from the browser. */
@Schema({ _id: false })
export class BookedSlot {
  @Prop({ type: String, required: true })
  positionId!: string;

  @Prop({ type: String, required: true })
  templateId!: string;

  @Prop({ type: String, required: true })
  slotId!: string;

  @Prop({ type: String, default: '' })
  spaceName!: string;

  @Prop({ type: String, default: '' })
  label!: string;

  @Prop({ type: String, default: '' })
  date!: string;

  @Prop({ type: String, default: '' })
  startTime!: string;

  @Prop({ type: String, default: '' })
  endTime!: string;

  @Prop({ type: Number, default: 0 })
  price!: number;
}
export const BookedSlotSchema = SchemaFactory.createForClass(BookedSlot);

/**
 * A slot booking taken on the public event page, from the moment a price is
 * quoted to the moment the slots are actually held in eventsh.
 *
 * The booking itself belongs to eventsh — that is where the event and its
 * slot-availability live. This record exists for the two things eventsh
 * cannot do for us: hold the quote while the person goes off to pay by
 * PayNow, and be the thing a payment reference points at afterwards. Same
 * split the ticket flow already uses, where Razorpay/PayNow is settled here
 * and the ticket is created in eventsh once payment is verified.
 *
 * The amount is computed at quote time from the event's own space prices and
 * stored here, so what is charged cannot be changed by the browser between
 * seeing the QR and confirming.
 */
@Schema({ collection: 'space_bookings', timestamps: true })
export class SpaceBooking {
  /** Short human reference, also embedded in the PayNow QR so the payment can
   * be matched against a bank statement. */
  @Prop({ type: String, required: true, unique: true })
  reference!: string;

  @Prop({ type: String, required: true, index: true })
  eventId!: string;

  @Prop({ type: String, default: '' })
  eventTitle!: string;

  @Prop({ type: [BookedSlotSchema], required: true, default: [] })
  slots!: BookedSlot[];

  @Prop({ type: Number, required: true, default: 0 })
  amount!: number;

  @Prop({ type: String, default: 'SGD' })
  currency!: string;

  @Prop({ type: String, required: true })
  name!: string;

  @Prop({ type: String, required: true, lowercase: true, trim: true })
  email!: string;

  @Prop({ type: String, default: '' })
  phone!: string;

  @Prop({ type: String, default: '' })
  organization!: string;

  /** pending — quoted, awaiting payment/confirmation.
   *  confirmed — held in eventsh; `eventshRequestId` points at that record. */
  @Prop({ type: String, enum: ['pending', 'confirmed'], default: 'pending', index: true })
  status!: string;

  /** What the payer typed off their banking app. Free text: PayNow gives no
   * machine-verifiable receipt, so this is a human cross-check, exactly as
   * the ticket PayNow flow treats it. */
  @Prop({ type: String, default: '' })
  transactionId!: string;

  @Prop({ type: String, default: '' })
  eventshRequestId!: string;

  @Prop({ type: Date })
  confirmedAt?: Date;

  @Prop({ type: Date })
  createdAt?: Date;

  @Prop({ type: Date })
  updatedAt?: Date;
}

export const SpaceBookingSchema = SchemaFactory.createForClass(SpaceBooking);
