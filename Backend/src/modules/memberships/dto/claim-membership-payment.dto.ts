import { IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * The body behind "I have paid", and deliberately the whole of it — the same
 * shape, and the same reasoning, as the enrolment flow's ClaimPaymentDto.
 *
 * No amount and no status: what is owed was snapshotted onto the membership
 * when it was bought, and only the guarded admin route can say money arrived.
 */
export class ClaimMembershipPaymentDto {
  /** Optional. Insisting on it would not make the claim any more checked than
   * it is — nothing here is verified against a bank — and the admin matches
   * the transfer on `paymentRef` and the amount either way. */
  @IsOptional()
  @IsString()
  @MaxLength(120)
  payerReference?: string;
}
