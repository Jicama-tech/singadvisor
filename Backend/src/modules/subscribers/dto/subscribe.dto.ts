import { IsEmail, MaxLength } from 'class-validator';

/** Newsletter subscribe — mirrors Frontend's `subscribeSchema`. */
export class SubscribeDto {
  @IsEmail()
  @MaxLength(200)
  email!: string;
}
