import { IsArray, IsIn, IsOptional, IsString } from 'class-validator';

export const LEAD_STATUSES = ['new', 'contacted', 'qualified', 'won', 'lost'] as const;

export class UpdateContactDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  company?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsIn(LEAD_STATUSES)
  leadStatus?: string;
}
