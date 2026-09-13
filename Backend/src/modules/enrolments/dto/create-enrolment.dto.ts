import {
  IsEmail,
  IsIn,
  IsMongoId,
  IsOptional,
  IsString,
  MinLength,
  ValidateIf,
} from 'class-validator';

export const ENROLMENT_STATUSES = [
  'invited',
  'confirmed',
  'withdrawn',
  'no-show',
  'completed',
];
export const PAYMENT_STATUSES = ['unpaid', 'invoiced', 'paid', 'waived'];

/**
 * Allocating a seat. The fee snapshot, runCode, trainingId, seatAllocatedAt and
 * the claim deadline are all taken from the run by the service, never from the
 * request — the global ValidationPipe's whitelist strips them if sent.
 */
export class CreateEnrolmentDto {
  @IsMongoId()
  courseRunId!: string;

  /** The website enquiry this seat is being allocated from. When given, the
   * person's details default to the enquiry's and it is marked confirmed. */
  @IsOptional()
  @IsMongoId()
  registrationId?: string;

  /** Required unless registrationId supplies it. */
  @ValidateIf((o: CreateEnrolmentDto) => !o.registrationId || o.name !== undefined)
  @IsString()
  @MinLength(1)
  name?: string;

  /** Required unless registrationId supplies it. */
  @ValidateIf((o: CreateEnrolmentDto) => !o.registrationId || o.email !== undefined)
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string | null;

  @IsOptional()
  @IsString()
  company?: string | null;

  @IsOptional()
  @IsString()
  jobTitle?: string | null;

  @IsOptional()
  @IsString()
  externalId?: string | null;

  /** A seat is allocated either way; `invited` records that the person has not
   * accepted it yet. The other statuses only make sense on an existing seat. */
  @IsOptional()
  @IsIn(['invited', 'confirmed'])
  status?: string;

  @IsOptional()
  @IsIn(PAYMENT_STATUSES)
  paymentStatus?: string;

  @IsOptional()
  @IsString()
  notes?: string | null;
}
