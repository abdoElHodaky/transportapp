import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHealth() {
    return {
      message: 'Sikka Transportation API is running!',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      status: 'healthy',
    };
  }

  getSystemStatus() {
    return {
      api: {
        status: 'online',
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development',
      },
      database: {
        status: 'connected', // This will be updated with actual DB health check
        type: 'PostgreSQL with PostGIS',
      },
      cache: {
        status: 'connected', // This will be updated with actual Redis health check
        type: 'Redis',
      },
      services: {
        auth: 'active',
        trips: 'active',
        payments: 'active',
        locations: 'active',
        notifications: 'active',
      },
      timestamp: new Date().toISOString(),
    };
  }
}
