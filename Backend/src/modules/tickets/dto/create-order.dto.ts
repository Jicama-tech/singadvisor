import { IsEmail, IsInt, IsMongoId, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class CreateOrderDto {
  @IsMongoId()
  eventId!: string;

  @IsString()
  @MinLength(1)
  tierId!: string;

  @IsInt()
  @Min(1)
  quantity!: number;

  @IsString()
  @MinLength(1)
  customerName!: string;

  @IsEmail()
  customerEmail!: string;

  @IsOptional()
  @IsString()
  customerPhone?: string;
}
