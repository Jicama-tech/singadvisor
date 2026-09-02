import { IsEmail, IsIn, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateAdminDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(1)
  name!: string;

  // No password field: sign-in is Google-only, so there is nothing to set.
  // Leaving it out means the global whitelist pipe strips one if a stale
  // client still sends it, rather than silently accepting it.

  @IsOptional()
  @IsIn(['owner', 'editor'])
  role?: 'owner' | 'editor';
}
