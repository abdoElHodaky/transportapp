import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { EBSService } from './ebs.service';
import { CyberPayService } from './cyberpay.service';

@Module({
  imports: [
    HttpModule.register({
      timeout: 30000,
      maxRedirects: 5,
    }),
    ConfigModule,
  ],
  providers: [EBSService, CyberPayService],
  exports: [EBSService, CyberPayService],
})
export class PaymentGatewayModule {}

