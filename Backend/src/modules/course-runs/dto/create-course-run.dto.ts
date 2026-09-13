import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDate,
  IsIn,
  IsInt,
  IsMongoId,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  Min,
} from 'class-validator';

export const COURSE_RUN_STATUSES = [
  'draft',
  'open',
  'closed',
  'running',
  'completed',
  'cancelled',
];

/**
 * Everything an admin sets on a run. The derived fields — trainingTitle,
 * seatsTaken, startsAt/endsAt/totalHours and nettFeeCents — are deliberately
 * absent: the global ValidationPipe's whitelist strips them, so a client can
 * never write a seat count or a schedule that disagrees with the sessions.
 */
export class CreateCourseRunDto {
  @IsMongoId()
  trainingId!: string;

  /** Quoted on invoices and Absentee Payroll claims, so limited to characters
   * that survive being typed into an HR system. Stored upper-cased. */
  @IsString()
  @Matches(/^[A-Za-z0-9][A-Za-z0-9-]*$/, {
    message: 'runCode may contain only letters, digits and hyphens',
  })
  runCode!: string;

  @IsOptional()
  @IsIn(COURSE_RUN_STATUSES)
  status?: string;

  @IsOptional()
  @IsIn(['In-person', 'Online', 'Hybrid'])
  mode?: string;

  @IsOptional()
  @IsString()
  venue?: string | null;

  @IsOptional()
  @IsString()
  address?: string | null;

  @IsOptional()
  @IsUrl({ require_protocol: true })
  joinUrl?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  capacity?: number;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  registrationOpensAt?: Date | null;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  registrationClosesAt?: Date | null;

  @IsOptional()
  @IsMongoId()
  trainerId?: string | null;

  @IsOptional()
  @IsIn(['none', 'ssg', 'ibf'])
  fundingScheme?: string;

  @IsOptional()
  @IsString()
  tgsCourseRef?: string | null;

  @IsOptional()
  @IsString()
  ssgCourseRunId?: string | null;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  fullFeeCents?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  subsidyCents?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  gstCents?: number;

  @IsOptional()
  @IsString()
  versionLabel?: string | null;

  @IsOptional()
  @IsBoolean()
  published?: boolean;

  @IsOptional()
  @IsString()
  notes?: string | null;
}
