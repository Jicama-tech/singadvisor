import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  ContactMessage,
  ContactMessageDocument,
} from './entities/contact-message.entity';
import { CreateContactMessageDto } from './dto/create-contact-message.dto';

@Injectable()
export class ContactMessagesService {
  constructor(
    @InjectModel(ContactMessage.name)
    private readonly model: Model<ContactMessageDocument>,
  ) {}

  findForAdmin() {
    return this.model.find().sort({ createdAt: -1 }).exec();
  }

  create(dto: CreateContactMessageDto) {
    return this.model.create({
      name: dto.name,
      email: dto.email.toLowerCase(),
      phone: dto.phone ?? null,
      subject: dto.subject,
      message: dto.message,
    });
  }

  /** Flips handled/unhandled and returns the updated doc (the old server
   * action read-then-wrote to flip; a single atomic update is equivalent and
   * race-free). */
  async toggleHandled(id: string) {
    const doc = await this.model.findById(id).exec();
    if (!doc) throw new NotFoundException(`No message with id "${id}"`);
    doc.handled = !doc.handled;
    await doc.save();
    return doc;
  }
}
