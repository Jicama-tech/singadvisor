import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { MembershipsService } from './memberships.service';

@Injectable()
export class MembershipsCron {
  private readonly logger = new Logger(MembershipsCron.name);

  constructor(private readonly memberships: MembershipsService) {}

  /**
   * Nightly: active memberships past their end date become `expired`, and the
   * perks they granted come off with them.
   *
   * Idempotent — a re-run matches nothing once the sweep has been done, and
   * each row's own write is conditional on it still being active, so a manual
   * cancellation landing mid-sweep is not overwritten.
   *
   * This is housekeeping, not enforcement. Nothing depends on it having run:
   * MembershipsService.isActiveMember checks `endDate` itself, so a membership
   * that lapsed at 3am stops opening members-only content immediately rather
   * than at 2am the following night. What the sweep buys is an admin list
   * that says `expired` when it should, and the perk revocation with it.
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async expireSweep() {
    try {
      const expired = await this.memberships.expireDue();
      if (expired > 0) this.logger.log(`Expired ${expired} membership(s)`);
    } catch (err: unknown) {
      this.logger.warn(`Membership expiry sweep failed: ${(err as Error)?.message}`);
    }
  }
}
