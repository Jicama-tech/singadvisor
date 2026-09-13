import { IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * The body behind "I have paid" — and deliberately the whole of it. There is
 * no amount here, and there is no status: what is owed was snapshotted onto
 * the Registration when the place was taken, and only an admin route can say
 * money arrived. The one thing the payer can contribute is the reference their
 * own bank gave the transfer.
 */
export class ClaimPaymentDto {
  /**
   * Optional, unlike the sponsor flow's `transactionId`. Requiring it would
   * not make the claim any more verified than it already is — nothing here is
   * checked against a bank — so the only thing insisting on it buys is a field
   * people fill with anything to get past it. Left empty it simply means the
   * admin matches the transfer on `paymentRef` and the amount, which is what
   * they have to do regardless.
   */
  @IsOptional()
  @IsString()
  @MaxLength(120)
  payerReference?: string;
}
