import { Body, Controller, Post } from '@nestjs/common';
import { SubscribersService } from './subscribers.service';
import { SubscribeDto } from './dto/subscribe.dto';

@Controller('subscribers')
export class SubscribersController {
  constructor(private readonly subscribersService: SubscribersService) {}

  /** Public — the newsletter form (footer/homepage) submits this with no
   * session. No admin read routes exist here: there is no subscriber list
   * page upstream, and none was invented for this port. */
  @Post()
  subscribe(@Body() dto: SubscribeDto) {
    return this.subscribersService.subscribe(dto);
  }
}
