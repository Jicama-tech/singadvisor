import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Training, TrainingSchema } from './entities/training.entity';
import { Trainer, TrainerSchema } from './entities/trainer.entity';
import { TrainingsController } from './trainings.controller';
import { TrainingsService } from './trainings.service';
import { TrainersController } from './trainers.controller';
import { TrainersService } from './trainers.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Training.name, schema: TrainingSchema },
      { name: Trainer.name, schema: TrainerSchema },
    ]),
  ],
  controllers: [TrainingsController, TrainersController],
  providers: [TrainingsService, TrainersService],
  exports: [TrainingsService],
})
export class TrainingsModule {}
