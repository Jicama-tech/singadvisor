import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { ENROLMENT_STATUSES, PAYMENT_STATUSES } from './create-enrolment.dto';

/**
 * Corrections to the person, and the seat's lifecycle. Deliberately absent:
 * courseRunId (moving a seat between runs is a withdrawal plus a new
 * allocation), the fee snapshot, and anything derived from attendance.
 * Handing the seat to a different person is `POST :id/substitute`, not an
 * edit of name and email here, so the change of hands stays on record.
 */
export class UpdateEnrolmentDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
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

  /** Moving to `withdrawn` releases the seat; moving off it takes one again. */
  @IsOptional()
  @IsIn(ENROLMENT_STATUSES)
  status?: string;

  @IsOptional()
  @IsIn(PAYMENT_STATUSES)
  paymentStatus?: string;

  /** Checked against the run's funding scheme by the service — see
   * Enrolment.assessmentOutcome for why the vocabulary forks. */
  @IsOptional()
  @IsIn(['pending', 'pass', 'fail', 'competent', 'not-yet-competent'])
  assessmentOutcome?: string;

  @IsOptional()
  @IsString()
  notes?: string | null;
}
