import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  ConsultancyService as ConsultancyServiceEntity,
  ConsultancyServiceSchema,
} from './entities/consultancy-service.entity';
import {
  ConsultancyEnquiry,
  ConsultancyEnquirySchema,
} from './entities/consultancy-enquiry.entity';
import {
  ConsultancyEnquiriesController,
  ConsultancyServicesController,
} from './consultancy.controller';
import { ConsultancyService } from './consultancy.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ConsultancyServiceEntity.name, schema: ConsultancyServiceSchema },
      { name: ConsultancyEnquiry.name, schema: ConsultancyEnquirySchema },
    ]),
  ],
  controllers: [ConsultancyServicesController, ConsultancyEnquiriesController],
  providers: [ConsultancyService],
  exports: [ConsultancyService],
})
export class ConsultancyModule {}
