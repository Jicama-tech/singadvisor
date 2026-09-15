import { IsIn } from 'class-validator';
import type { MembershipStatus } from '../entities/membership.entity';

/**
 * Admin — cancel a membership, expire one early, or put a mistakenly
 * cancelled one back to `pending` so its payment can be verified properly.
 *
 * `active` is absent on purpose: activation stamps the term, applies the perks
 * and sends the welcome email, so it has exactly one door (verifying the
 * payment, or buying a free plan) rather than two. The service refuses it too
 * — this list is the first of the two guards, not the only one.
 */
export class UpdateMembershipStatusDto {
  @IsIn(['pending', 'expired', 'cancelled'])
  status!: Exclude<MembershipStatus, 'active'>;
}
