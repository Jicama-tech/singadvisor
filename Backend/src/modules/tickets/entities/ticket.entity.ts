import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';

export type TicketStatus = 'pending' | 'confirmed' | 'cancelled' | 'used';

@Schema({ _id: false })
export class TicketLineItem {
  @Prop({ type: String, required: true })
  ticketType!: string;

  @Prop({ type: Number, required: true, min: 1 })
  quantity!: number;

  @Prop({ type: Number, required: true, min: 0 })
  price!: number;

  @Prop({ type: String, required: true })
  tierId!: string;

  @Prop({ type: [String], default: [] })
  seatIds!: string[]; // inert until Phase 6's seat map ships
}
export const TicketLineItemSchema = SchemaFactory.createForClass(TicketLineItem);

/**
 * Present only once a payment has been independently verified server-side
 * (see RazorpayService.verifyPaymentSignature/verifyWebhookSignature) —
 * never populated from a client-supplied "I paid" flag. This is the
 * structural fix over eventsh-v1's source, which trusted a client boolean.
 */
@Schema({ _id: false })
export class TicketPayment {
  @Prop({ type: String, required: true })
  razorpayOrderId!: string;

  @Prop({ type: String })
  razorpayPaymentId?: string;

  @Prop({ type: String })
  razorpaySignature?: string;

  @Prop({ type: Date })
  verifiedAt?: Date;

  @Prop({ type: Number, required: true })
  amount!: number; // minor units, matches what was actually charged

  /** 'razorpay' for card purchases, 'paynow' for PayNow QR purchases
   * (trust-verified — the buyer asserts "I have paid", same model as
   * eventsh itself), 'free' for zero-price tiers, 'legacy-migrated' for
   * the one-off Prisma import. */
  @Prop({ type: String, default: 'razorpay' })
  method!: string;
}
export const TicketPaymentSchema = SchemaFactory.createForClass(TicketPayment);

export type TicketDocument = HydratedDocument<Ticket>;

@Schema({ collection: 'tickets', timestamps: true })
export class Ticket {
  @Prop({ type: String, required: true, unique: true })
  ticketId!: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Event', required: true, index: true })
  eventId!: string;

  // Denormalized event snapshot — avoids a join for QR-scan/door lookups.
  @Prop({ type: String, required: true })
  eventTitle!: string;

  @Prop({ type: Date, required: true })
  eventDate!: Date;

  @Prop({ type: String, default: '' })
  eventTime!: string;

  @Prop({ type: String, default: '' })
  eventVenue!: string;

  @Prop({ type: String, required: true })
  customerName!: string;

  @Prop({ type: String, required: true, lowercase: true, index: true })
  customerEmail!: string;

  @Prop({ type: String, default: '' })
  customerPhone!: string;

  @Prop({ type: [TicketLineItemSchema], required: true })
  ticketDetails!: TicketLineItem[];

  @Prop({ type: Number, required: true })
  totalAmount!: number; // minor units

  @Prop({ type: String, default: 'SGD' })
  currency!: string;

  @Prop({ type: String, enum: ['pending', 'confirmed', 'cancelled', 'used'], default: 'pending' })
  status!: TicketStatus;

  @Prop({ type: Date, default: Date.now })
  purchaseDate!: Date;

  @Prop({ type: Object })
  coupon?: { code: string; discountAmount: number }; // wired up in Phase 3

  @Prop({ type: Boolean, default: false })
  isUsed!: boolean;

  @Prop({ type: Date })
  usedAt?: Date;

  @Prop({ type: String, default: '' })
  qrCodeUrl!: string; // path under /uploads/tickets/

  @Prop({ type: TicketPaymentSchema, required: true })
  payment!: TicketPayment;

  /** PayNow reference shown in the QR's bill-number field (TLV62) — the
   * admin cross-checks the buyer's bank transfer against this. */
  @Prop({ type: String })
  paynowRef?: string;

  /** The ticket's Mongo _id on eventsh (its system of record) — lets the
   * admin Participants view join this audit doc onto the eventsh ticket
   * row to surface payment method/verification. */
  @Prop({ type: String })
  eventshTicketId?: string;
}

export const TicketSchema = SchemaFactory.createForClass(Ticket);
TicketSchema.index({ eventId: 1, status: 1 });
// Unique, not just indexed — the DB itself is the last line of defense
// against a duplicate Ticket if the client's POST /tickets and the async
// webhook fallback both race to confirm the same Razorpay order.
TicketSchema.index({ 'payment.razorpayOrderId': 1 }, { unique: true });
