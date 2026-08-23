import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  ContactMessage,
  ContactMessageDocument,
} from './entities/contact-message.entity';
import { CreateContactMessageDto } from './dto/create-contact-message.dto';
import { CrmService } from '../crm/crm.service';

@Injectable()
export class ContactMessagesService {
  private readonly logger = new Logger(ContactMessagesService.name);

  constructor(
    @InjectModel(ContactMessage.name)
    private readonly model: Model<ContactMessageDocument>,
    private readonly crmService: CrmService,
  ) {}

  findForAdmin() {
    return this.model.find().sort({ createdAt: -1 }).exec();
  }

  async create(dto: CreateContactMessageDto) {
    const message = await this.model.create({
      name: dto.name,
      email: dto.email.toLowerCase(),
      phone: dto.phone ?? null,
      subject: dto.subject,
      message: dto.message,
    });

    this.crmService
      .upsertContact({
        email: message.email,
        name: message.name,
        phone: message.phone ?? undefined,
        source: {
          type: 'message',
          refId: message._id,
          label: `Sent a message: ${message.subject}`,
        },
      })
      .catch((err: unknown) =>
        this.logger.warn(`CRM upsert failed for message: ${(err as Error)?.message}`),
      );

    return message;
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
