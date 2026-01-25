import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { User } from '../../entities/user.entity';
import { Trip } from '../../entities/trip.entity';
import { Payment } from '../../entities/payment.entity';
import { Transaction } from '../../entities/transaction.entity';
import { Wallet } from '../../entities/wallet.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Trip, Payment, Transaction, Wallet]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'sikka-secret-key',
      signOptions: { expiresIn: '24h' },
    }),
  ],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
