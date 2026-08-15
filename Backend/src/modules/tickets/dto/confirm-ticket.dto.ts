import { IsEmail, IsInt, IsMongoId, IsOptional, IsString, Min, MinLength } from 'class-validator';

/**
 * Body of `POST /tickets` — the client-confirm step, called right after
 * Razorpay Checkout.js resolves. All three `razorpay_*` fields are required
 * and independently re-verified server-side (`RazorpayService.
 * verifyPaymentSignature`) before any Ticket is written — this endpoint
 * never trusts a bare "I paid" flag.
 */
export class ConfirmTicketDto {
  @IsMongoId()
  eventId!: string;

  @IsString()
  @MinLength(1)
  tierId!: string;

  @IsInt()
  @Min(1)
  quantity!: number;

  @IsString()
  @MinLength(1)
  customerName!: string;

  @IsEmail()
  customerEmail!: string;

  @IsOptional()
  @IsString()
  customerPhone?: string;

  @IsString()
  @MinLength(1)
  razorpay_order_id!: string;

  @IsString()
  @MinLength(1)
  razorpay_payment_id!: string;

  @IsString()
  @MinLength(1)
  razorpay_signature!: string;
}
