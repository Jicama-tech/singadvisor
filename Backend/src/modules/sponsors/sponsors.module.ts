import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EventsModule } from '../events/events.module';
import { SponsorRequest, SponsorRequestSchema } from './entities/sponsor-request.entity';
import { SponsorsController } from './sponsors.controller';
import { SponsorRequestsController } from './sponsor-requests.controller';
import { SponsorsService } from './sponsors.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: SponsorRequest.name, schema: SponsorRequestSchema }]),
    EventsModule, // re-exports its Event model registration for tier lookups
  ],
  controllers: [SponsorsController, SponsorRequestsController],
  providers: [SponsorsService],
})
export class SponsorsModule {}
