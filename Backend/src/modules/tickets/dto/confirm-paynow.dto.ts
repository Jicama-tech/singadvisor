import { IsString } from 'class-validator';

/** Step 2 of PayNow checkout — the buyer asserts "I have paid"; the
 * backend creates the ticket in eventsh (trust model, same as eventsh's
 * own buyer flow). Idempotent on the audit order's _id. */
export class ConfirmPaynowDto {
  @IsString()
  orderId!: string;
}
