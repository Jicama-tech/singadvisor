import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  EventshEventMirror,
  EventshEventMirrorSchema,
} from './entities/eventsh-event.entity';
import { EventsMirrorService } from './events-mirror.service';

/**
 * No controller: the mirror is written, never served. Exported so
 * EventshProxyModule can inject the service into the forwarder and mirror
 * writes as they pass through.
 *
 * ScheduleModule is not imported here — `forRoot()` is registered once in
 * AppModule and its explorer discovers @Cron across every provider in the app.
 * Calling it again per-module risks the same job being registered twice.
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: EventshEventMirror.name, schema: EventshEventMirrorSchema },
    ]),
  ],
  providers: [EventsMirrorService],
  exports: [EventsMirrorService],
})
export class EventsMirrorModule {}
