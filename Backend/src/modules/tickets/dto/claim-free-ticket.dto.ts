import { IsEmail, IsInt, IsMongoId, IsOptional, IsString, Min, MinLength } from 'class-validator';

/** Body of `POST /tickets/free` — no `razorpay_*` fields; the service
 * itself re-verifies the tier is actually price 0 before issuing anything. */
export class ClaimFreeTicketDto {
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
}
