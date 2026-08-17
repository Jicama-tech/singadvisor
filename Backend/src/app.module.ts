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
// Content domains migrated off the Frontend's Prisma DB (Phase 10a of the
// Vite-SPA migration — a browser app cannot query Prisma directly, so each
// of these now exposes a real HTTP API here instead).
import { TrainingsModule } from './modules/trainings/trainings.module';
import { ConsultancyModule } from './modules/consultancy/consultancy.module';
import { CareersModule } from './modules/careers/careers.module';
import { BlogModule } from './modules/blog/blog.module';
import { RegistrationsModule } from './modules/registrations/registrations.module';
import { ContactMessagesModule } from './modules/contact-messages/contact-messages.module';
import { SubscribersModule } from './modules/subscribers/subscribers.module';
import { EventshProxyModule } from './modules/eventsh-proxy/eventsh-proxy.module';

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
    TrainingsModule,
    ConsultancyModule,
    CareersModule,
    BlogModule,
    RegistrationsModule,
    ContactMessagesModule,
    SubscribersModule,
    EventshProxyModule,
    // Events' own follow-on modules (rsvp, coupons, stalls) land here too,
    // per the event-ops port plan.
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
