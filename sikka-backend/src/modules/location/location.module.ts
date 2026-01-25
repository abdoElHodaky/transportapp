import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LocationController } from './location.controller';
import { LocationService } from './location.service';
import { Location } from '../../entities/location.entity';
import { User } from '../../entities/user.entity';
import { Trip } from '../../entities/trip.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Location, User, Trip])],
  controllers: [LocationController],
  providers: [LocationService],
  exports: [LocationService],
})
export class LocationModule {}
