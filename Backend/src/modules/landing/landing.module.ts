import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LandingSection, LandingSectionSchema } from './entities/landing-section.entity';
import { LandingController } from './landing.controller';
import { LandingService } from './landing.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: LandingSection.name, schema: LandingSectionSchema }]),
  ],
  controllers: [LandingController],
  providers: [LandingService],
  exports: [LandingService],
})
export class LandingModule {}
