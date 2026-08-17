import { Module } from '@nestjs/common';
import { EventshProxyController } from './eventsh-proxy.controller';
import { EventshPublicController } from './eventsh-public.controller';

@Module({
  controllers: [EventshProxyController, EventshPublicController],
})
export class EventshProxyModule {}
