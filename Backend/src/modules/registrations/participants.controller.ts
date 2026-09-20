import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TabsGuard } from '../../common/guards/tabs.guard';
import { Tabs } from '../../common/decorators/tabs.decorator';
import { ParticipantsService } from './participants.service';

/**
 * The Trainings > Participants tab: pick a course, then read its people.
 *
 * Admin only end to end — class-guarded like CrmController, and for a stronger
 * reason than tidiness. A roster is a list of named people with their phone
 * numbers, their employer and what they still owe; there is no public view of
 * it to keep unguarded, so neither route below is reachable without a session.
 *
 * Mounted beside the registrations routes rather than among them, the way
 * `careers/jobs` and `careers/applications` split one module's URL namespace.
 * Route ordering was checked against RegistrationsController, which owns the
 * bare `registrations` prefix and already has `@Get(':id/paynow-qr')`: both
 * paths here begin with the literal segment `participants`, so nothing
 * collides in either direction. `participants/courses` cannot match
 * `:id/paynow-qr` (its second segment is a literal that is not `courses`), and
 * nothing here can swallow that route, which would need `paynow-qr` to equal
 * `courses`. The roster's three segments match no route on that controller at
 * all. Registration order between the two controllers is therefore irrelevant.
 */
@Controller('registrations/participants')
// The course roster: names, phone numbers and outstanding balances.
@UseGuards(JwtAuthGuard, TabsGuard)
@Tabs('trainings')
export class ParticipantsController {
  constructor(private readonly participantsService: ParticipantsService) {}

  @Get('courses')
  courses() {
    return this.participantsService.courses();
  }

  /** The id is validated in the service, not by a DTO: the global
   * whitelisting pipe does not reach params destructured one by one, the same
   * reason EnrolmentsService.findAll guards its own. */
  @Get('courses/:trainingId')
  roster(@Param('trainingId') trainingId: string) {
    return this.participantsService.roster(trainingId);
  }
}
