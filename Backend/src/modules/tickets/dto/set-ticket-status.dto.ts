import { IsIn } from 'class-validator';

export class SetTicketStatusDto {
  @IsIn(['pending', 'confirmed', 'cancelled', 'used'])
  status!: 'pending' | 'confirmed' | 'cancelled' | 'used';
}
