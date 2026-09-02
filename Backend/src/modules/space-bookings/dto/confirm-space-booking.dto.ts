import { IsOptional, IsString, MinLength } from 'class-validator';

export class ConfirmSpaceBookingDto {
  @IsString()
  @MinLength(1)
  reference!: string;

  /** What the payer read off their banking app. Optional: free slots have no
   * payment, and PayNow gives nothing machine-verifiable anyway. */
  @IsOptional()
  @IsString()
  transactionId?: string;
}
