import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TripsController } from './trips.controller';
import { TripsService } from './trips.service';
import { Trip } from '../../entities/trip.entity';
import { User } from '../../entities/user.entity';
import { Rating } from '../../entities/rating.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Trip, User, Rating])],
  controllers: [TripsController],
  providers: [TripsService],
  exports: [TripsService],
})
export class TripsModule {}
