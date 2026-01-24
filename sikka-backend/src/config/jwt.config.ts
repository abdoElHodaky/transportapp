import { Injectable } from '@nestjs/common';
import { JwtModuleOptions, JwtOptionsFactory } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtConfig implements JwtOptionsFactory {
  constructor(private configService: ConfigService) {}

  createJwtOptions(): JwtModuleOptions {
    return {
      secret: this.configService.get('JWT_SECRET', 'sikka-super-secret-key-change-in-production'),
      signOptions: {
        expiresIn: this.configService.get('JWT_EXPIRES_IN', '24h'),
        issuer: 'sikka-api',
        audience: 'sikka-clients',
      },
    };
  }
}

