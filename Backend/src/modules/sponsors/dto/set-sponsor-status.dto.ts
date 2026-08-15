import { IsIn, IsOptional, IsString } from 'class-validator';

export class SetSponsorStatusDto {
  @IsIn(['Applied', 'Approved', 'PaymentSubmitted', 'Confirmed', 'Rejected', 'Cancelled'])
  status!: 'Applied' | 'Approved' | 'PaymentSubmitted' | 'Confirmed' | 'Rejected' | 'Cancelled';

  @IsOptional()
  @IsString()
  note?: string;
}
