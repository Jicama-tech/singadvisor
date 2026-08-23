import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JobPosting, JobPostingSchema } from './entities/job-posting.entity';
import {
  JobApplication,
  JobApplicationSchema,
} from './entities/job-application.entity';
import {
  CareersApplicationsController,
  CareersJobsController,
} from './careers.controller';
import { CareersService } from './careers.service';
import { CrmModule } from '../crm/crm.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: JobPosting.name, schema: JobPostingSchema },
      { name: JobApplication.name, schema: JobApplicationSchema },
    ]),
    CrmModule,
  ],
  controllers: [CareersJobsController, CareersApplicationsController],
  providers: [CareersService],
  exports: [CareersService],
})
export class CareersModule {}
