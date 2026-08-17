import { IsArray, IsEmail, IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateOperatorDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @MaxLength(200)
  password!: string;

  @IsArray()
  @IsString({ each: true })
  accessTabs!: string[];
}
