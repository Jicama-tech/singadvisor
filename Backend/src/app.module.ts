import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AdminModule } from './modules/admin/admin.module';
import { AuthModule } from './modules/auth/auth.module';
import { LandingModule } from './modules/landing/landing.module';
import { UploadsModule } from './modules/uploads/uploads.module';
import { EventsModule } from './modules/events/events.module';
import { TicketsModule } from './modules/tickets/tickets.module';
import { SponsorsModule } from './modules/sponsors/sponsors.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRoot(
      process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/singadvisor',
      {
        maxPoolSize: 10,
        minPoolSize: 2,
        socketTimeoutMS: 45000,
        serverSelectionTimeoutMS: 5000,
      },
    ),
    AdminModule,
    AuthModule,
    LandingModule,
    UploadsModule,
    EventsModule,
    TicketsModule,
    SponsorsModule,
    // Remaining domain modules land here per the modernization proposal
    // (§5, Phase 1): trainings, blog, consultancy, careers, registrations,
    // contact, files. Events' own follow-on modules (rsvp, coupons, stalls)
    // land here too, per the event-ops port plan.
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
