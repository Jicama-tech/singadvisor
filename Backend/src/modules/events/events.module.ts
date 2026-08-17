import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Event, EventSchema } from './entities/event.entity';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';

// Stored so it can be exported by the exact same reference — re-exporting
// the bare `MongooseModule` class does not reliably re-bind a specific
// `forFeature` registration for other modules (like tickets/) to inject.
const eventModel = MongooseModule.forFeature([{ name: Event.name, schema: EventSchema }]);

@Module({
  imports: [eventModel],
  controllers: [EventsController],
  providers: [EventsService],
  exports: [EventsService, eventModel],
})
export class EventsModule {}
