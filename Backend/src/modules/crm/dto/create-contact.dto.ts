import { IsEmail, IsOptional, IsString } from 'class-validator';

/** Manual add — an admin creating a contact with no source form behind it. */
export class CreateContactDto {
  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  company?: string;
}
