import { Module } from '@nestjs/common';
import { PaynowController } from './paynow.controller';
import { PaynowService } from './paynow.service';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [SettingsModule],
  controllers: [PaynowController],
  providers: [PaynowService],
  exports: [PaynowService],
})
export class PaynowModule {}
