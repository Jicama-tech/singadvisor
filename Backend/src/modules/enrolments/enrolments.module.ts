import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Enrolment, EnrolmentSchema } from './entities/enrolment.entity';
import {
  SessionAttendance,
  SessionAttendanceSchema,
} from './entities/session-attendance.entity';
import {
  Registration,
  RegistrationSchema,
} from '../registrations/entities/registration.entity';
import { CourseRunsModule } from '../course-runs/course-runs.module';
import { CrmModule } from '../crm/crm.module';
import { EnrolmentsController } from './enrolments.controller';
import { EnrolmentsService } from './enrolments.service';

/**
 * The roster and its attendance records.
 *
 * Depends on CourseRunsModule because seat allocation is a guarded atomic
 * update against CourseRun.seatsTaken — this deployment runs a standalone
 * mongod (see MONGO_URI in app.module.ts) so multi-document transactions are
 * unavailable, and the single-document $inc guard is what makes an oversell
 * impossible. The roster has its admin API; attendance is still schema-only,
 * for the reason given in CourseRunsModule.
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Enrolment.name, schema: EnrolmentSchema },
      { name: SessionAttendance.name, schema: SessionAttendanceSchema },
      // Registered here too, as in CourseRunsModule: the enquiry a seat is
      // allocated from, read for its details and then marked confirmed.
      { name: Registration.name, schema: RegistrationSchema },
    ]),
    CourseRunsModule,
    CrmModule,
  ],
  controllers: [EnrolmentsController],
  providers: [EnrolmentsService],
  exports: [MongooseModule],
})
export class EnrolmentsModule {}
