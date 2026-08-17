import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Training } from '../trainings/entities/training.entity';
import { Registration, RegistrationDocument } from './entities/registration.entity';
import { CreateRegistrationDto } from './dto/create-registration.dto';

@Injectable()
export class RegistrationsService {
  constructor(
    @InjectModel(Registration.name)
    private readonly model: Model<RegistrationDocument>,
    @InjectModel(Training.name)
    private readonly trainingModel: Model<Training>,
  ) {}

  findForAdmin() {
    return this.model.find().sort({ createdAt: -1 }).exec();
  }

  /** Public enrolment — the training must genuinely exist and still be open
   * (the old server action checked `published` at submit time, not render
   * time, for the same stale-page reason). */
  async create(trainingId: string, dto: CreateRegistrationDto) {
    const training = await this.trainingModel.findById(trainingId).exec();
    if (!training || !training.published) {
      throw new BadRequestException('That programme is no longer open.');
    }

    return this.model.create({
      name: dto.name,
      email: dto.email.toLowerCase(),
      phone: dto.phone,
      company: dto.company ?? null,
      seats: dto.seats ?? 1,
      message: dto.message ?? null,
      trainingId: training._id,
      trainingTitle: training.title,
    });
  }

  async updateStatus(id: string, status: string) {
    const doc = await this.model
      .findByIdAndUpdate(id, { status }, { new: true, runValidators: true })
      .exec();
    if (!doc) throw new NotFoundException(`No registration with id "${id}"`);
    return doc;
  }
}
