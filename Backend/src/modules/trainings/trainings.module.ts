import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Training, TrainingSchema } from './entities/training.entity';
import { Trainer, TrainerSchema } from './entities/trainer.entity';
import { TrainingsController, TrainersController } from './trainings.controller';
import { TrainingsService } from './trainings.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Training.name, schema: TrainingSchema },
      { name: Trainer.name, schema: TrainerSchema },
    ]),
  ],
  controllers: [TrainingsController, TrainersController],
  providers: [TrainingsService],
  exports: [TrainingsService],
})
export class TrainingsModule {}
