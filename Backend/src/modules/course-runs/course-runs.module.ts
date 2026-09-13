import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  CourseRun,
  CourseRunSchema,
} from './entities/course-run.entity';
import {
  CourseRunSession,
  CourseRunSessionSchema,
} from './entities/course-run-session.entity';
import { Training, TrainingSchema } from '../trainings/entities/training.entity';
import { Enrolment, EnrolmentSchema } from '../enrolments/entities/enrolment.entity';
import {
  SessionAttendance,
  SessionAttendanceSchema,
} from '../enrolments/entities/session-attendance.entity';
import { CourseRunsController } from './course-runs.controller';
import { CourseRunsService } from './course-runs.service';

/**
 * Course runs — dated intakes of a Training, and their per-session structure.
 *
 * The entities landed ahead of any controller, because the one genuinely
 * expensive mistake available here is creating enrolment or attendance
 * documents under a shape that later has to change. Runs, sessions and the
 * roster now have their admin API; attendance still does not.
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CourseRun.name, schema: CourseRunSchema },
      { name: CourseRunSession.name, schema: CourseRunSessionSchema },
      // Registered here too (Nest scopes forFeature models to the declaring
      // module), as RegistrationsModule does with Training: Training for the
      // create-time lookup, Enrolment and SessionAttendance for the delete
      // guards. Importing EnrolmentsModule instead would be circular — it
      // already imports this module for seat allocation.
      { name: Training.name, schema: TrainingSchema },
      { name: Enrolment.name, schema: EnrolmentSchema },
      { name: SessionAttendance.name, schema: SessionAttendanceSchema },
    ]),
  ],
  controllers: [CourseRunsController],
  providers: [CourseRunsService],
  exports: [MongooseModule],
})
export class CourseRunsModule {}
