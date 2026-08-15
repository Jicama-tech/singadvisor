import { IsEmail, IsIn, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateAdminDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(1)
  name!: string;

  /** Plain password — AdminService hashes it before it ever touches Mongo. */
  @IsString()
  @MinLength(8)
  password!: string;

  @IsOptional()
  @IsIn(['owner', 'editor'])
  role?: 'owner' | 'editor';
}
