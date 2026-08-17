import { Module } from '@nestjs/common';
import { EventshProxyController } from './eventsh-proxy.controller';

@Module({
  controllers: [EventshProxyController],
})
export class EventshProxyModule {}
