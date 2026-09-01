import { Module } from '@nestjs/common';
import { EventsMirrorModule } from '../events-mirror/events-mirror.module';
import { EventshProxyController } from './eventsh-proxy.controller';
import { EventshPublicController } from './eventsh-public.controller';

@Module({
  // The forwarder shadow-copies every event write it passes through into this
  // Backend's own database — see EventshProxyController.mirrorEventWrite.
  imports: [EventsMirrorModule],
  controllers: [EventshProxyController, EventshPublicController],
})
export class EventshProxyModule {}
