import { IsEmail, IsInt, IsNotEmpty, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';

/** Step 1 of PayNow checkout — mirrors CreateOrderDto's field set; the
 * backend generates the QR server-side from the Settings UEN. */
export class CreatePaynowOrderDto {
  @IsString()
  @IsNotEmpty()
  eventId!: string;

  @IsString()
  @IsNotEmpty()
  tierId!: string;

  @IsInt()
  @Min(1)
  @Max(50)
  quantity!: number;

  @IsString()
  @MinLength(2)
  customerName!: string;

  @IsEmail()
  customerEmail!: string;

  @IsOptional()
  @IsString()
  customerPhone?: string;
}
