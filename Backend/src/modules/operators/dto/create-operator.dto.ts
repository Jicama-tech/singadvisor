import { IsArray, IsEmail, IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateOperatorDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @IsEmail()
  email!: string;

  // No password: an operator signs in with Google against `email` above.

  @IsArray()
  @IsString({ each: true })
  accessTabs!: string[];
}
