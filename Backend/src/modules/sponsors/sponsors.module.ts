import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CrmModule } from '../crm/crm.module';
import { PaynowModule } from '../paynow/paynow.module';
import { SponsorRequest, SponsorRequestSchema } from './entities/sponsor-request.entity';
import { SponsorsController } from './sponsors.controller';
import { SponsorRequestsController } from './sponsor-requests.controller';
import { SponsorsService } from './sponsors.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: SponsorRequest.name, schema: SponsorRequestSchema }]),
    CrmModule,
    PaynowModule,
  ],
  controllers: [SponsorsController, SponsorRequestsController],
  providers: [SponsorsService],
})
export class SponsorsModule {}
