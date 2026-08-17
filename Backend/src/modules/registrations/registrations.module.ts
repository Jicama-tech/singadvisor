import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Registration, RegistrationSchema } from './entities/registration.entity';
import { RegistrationsController } from './registrations.controller';
import { RegistrationsService } from './registrations.service';
// The Training model is registered here too (Nest scopes forFeature models to
// the module that declares them) so RegistrationsService can inject it for the
// enrolment-time published check.
import { Training, TrainingSchema } from '../trainings/entities/training.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Registration.name, schema: RegistrationSchema },
      { name: Training.name, schema: TrainingSchema },
    ]),
  ],
  controllers: [RegistrationsController],
  providers: [RegistrationsService],
  exports: [RegistrationsService],
})
export class RegistrationsModule {}
