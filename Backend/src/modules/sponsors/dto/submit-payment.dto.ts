import { IsOptional, IsString, MinLength } from 'class-validator';

export class SubmitPaymentDto {
  @IsString()
  @MinLength(1)
  transactionId!: string;

  @IsOptional()
  @IsString()
  transactionScreenshot?: string;

  @IsOptional()
  @IsString()
  paymentMethod?: string;
}
