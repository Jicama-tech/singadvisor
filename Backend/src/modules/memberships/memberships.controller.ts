import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TabsGuard } from '../../common/guards/tabs.guard';
import { Tabs } from '../../common/decorators/tabs.decorator';
import { MembershipsService } from './memberships.service';
import { MEMBERSHIP_PERKS } from './membership-perks';
import { SaveMembershipPlanDto } from './dto/save-membership-plan.dto';
import { PurchaseMembershipDto } from './dto/purchase-membership.dto';
import { ClaimMembershipPaymentDto } from './dto/claim-membership-payment.dto';
import { UpdateMembershipStatusDto } from './dto/update-membership-status.dto';
import { MemberViewDto } from '../../common/dto/member-view.dto';

/**
 * Route order was checked. Every `:id` route ends in a literal segment that no
 * ObjectId could be mistaken for, and the two literal-first paths (`plans`,
 * `perks`) are matched by Nest before any `:id` pattern that could swallow
 * them because they are declared first. Guarded routes are grouped below the
 * public ones for reading only; Nest matches on the path, not the guard.
 */
@Controller('memberships')
export class MembershipsController {
  constructor(private readonly service: MembershipsService) {}

  // ── Public ─────────────────────────────────────────────────────────────

  /** The perk catalogue, so the admin form and the public plan cards render
   * the same labels this module enforces rather than their own copy. */
  @Get('perks')
  perks() {
    return MEMBERSHIP_PERKS;
  }

  /** Public — the plans on sale. Nothing here is guarded: anyone can buy. */
  @Get('plans')
  publicPlans() {
    return this.service.listPublishedPlans();
  }

  /** Public — buy one. The identity comes from the verified Google token in
   * the body, never from an address typed into it (see the service). */
  @Post('plans/:planId/purchase')
  purchase(@Param('planId') planId: string, @Body() dto: PurchaseMembershipDto) {
    return this.service.purchase(planId, dto);
  }

  /**
   * Public — "what do I hold?", answered only for the account that has just
   * proved it owns the address.
   *
   * MemberViewDto rather than an inline body type: the global ValidationPipe
   * runs with `whitelist: true` and validates against decorated class
   * properties only, so an undecorated shape is not validated at all — the
   * credential arrives as whatever was posted. It is the same DTO the content
   * gate uses, and for the same reason.
   */
  @Post('me')
  me(@Body() dto: MemberViewDto) {
    return this.service.myMembership(dto.credential);
  }

  /** Public — the QR for the amount this membership was bought at, for a buyer
   * who has no session, exactly as the enrolment flow's own paynow-qr. */
  @Get(':id/paynow-qr')
  paynowQr(@Param('id') id: string) {
    return this.service.paynowQr(id);
  }

  /** Public — the "I have paid" click. Records the claim and nothing else. */
  @Post(':id/payment-claimed')
  claimPayment(@Param('id') id: string, @Body() dto: ClaimMembershipPaymentDto) {
    return this.service.claimPayment(id, dto);
  }

  // ── Admin ──────────────────────────────────────────────────────────────

  @Get('admin/plans')
  @UseGuards(JwtAuthGuard, TabsGuard)
  @Tabs('memberships')
  adminPlans() {
    return this.service.listPlansForAdmin();
  }

  @Post('admin/plans')
  @UseGuards(JwtAuthGuard, TabsGuard)
  @Tabs('memberships')
  createPlan(@Body() dto: SaveMembershipPlanDto) {
    return this.service.createPlan(dto);
  }

  @Patch('admin/plans/:id')
  @UseGuards(JwtAuthGuard, TabsGuard)
  @Tabs('memberships')
  updatePlan(@Param('id') id: string, @Body() dto: SaveMembershipPlanDto) {
    return this.service.updatePlan(id, dto);
  }

  @Patch('admin/plans/:id/archive')
  @UseGuards(JwtAuthGuard, TabsGuard)
  @Tabs('memberships')
  archivePlan(@Param('id') id: string, @Body() body: { archived?: boolean }) {
    return this.service.setPlanArchived(id, body?.archived !== false);
  }

  /** Admin — the memberships inbox. `?status=` narrows it; omitted means all. */
  @Get()
  @UseGuards(JwtAuthGuard, TabsGuard)
  @Tabs('memberships')
  list(@Query('status') status?: string) {
    return this.service.listForAdmin(status);
  }

  /** Admin — the money arrived. The one place a claim becomes a payment, and
   * with it the one place a paid membership starts. */
  @Patch(':id/verify-payment')
  @UseGuards(JwtAuthGuard, TabsGuard)
  @Tabs('memberships')
  verifyPayment(@Param('id') id: string) {
    return this.service.verifyPayment(id);
  }

  /** Admin — send the welcome email again. A POST because it does something,
   * not because it writes: nothing about the membership changes. */
  @Post(':id/resend-welcome')
  @UseGuards(JwtAuthGuard, TabsGuard)
  @Tabs('memberships')
  resendWelcome(@Param('id') id: string) {
    return this.service.resendWelcome(id);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, TabsGuard)
  @Tabs('memberships')
  updateStatus(@Param('id') id: string, @Body() dto: UpdateMembershipStatusDto) {
    return this.service.updateStatus(id, dto.status);
  }
}
