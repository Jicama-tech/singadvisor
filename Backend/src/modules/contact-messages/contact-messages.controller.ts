import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ContactMessagesService } from './contact-messages.service';
import { CreateContactMessageDto } from './dto/create-contact-message.dto';

@Controller('contact-messages')
export class ContactMessagesController {
  constructor(private readonly contactMessagesService: ContactMessagesService) {}

  /** Public — the contact page submits this with no session. */
  @Post()
  create(@Body() dto: CreateContactMessageDto) {
    return this.contactMessagesService.create(dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  list() {
    return this.contactMessagesService.findForAdmin();
  }

  @Patch(':id/toggle-handled')
  @UseGuards(JwtAuthGuard)
  toggleHandled(@Param('id') id: string) {
    return this.contactMessagesService.toggleHandled(id);
  }
}
