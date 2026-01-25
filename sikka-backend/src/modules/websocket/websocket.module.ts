import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WebSocketGateway } from './websocket.gateway';
import { User } from '../../entities/user.entity';
import { Trip } from '../../entities/trip.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Trip]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'sikka-secret-key',
      signOptions: { expiresIn: '24h' },
    }),
  ],
  providers: [WebSocketGateway],
  exports: [WebSocketGateway],
})
export class WebSocketModule {}
