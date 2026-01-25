import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';

@ApiTags('Notifications')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get user notifications' })
  async getNotifications() {
    return this.notificationsService.getNotifications();
  }

  @Post('send')
  @ApiOperation({ summary: 'Send notification to user' })
  async sendNotification(@Body() notificationDto: any) {
    return this.notificationsService.sendNotification(notificationDto);
  }

  @Post(':id/read')
  @ApiOperation({ summary: 'Mark notification as read' })
  async markAsRead(@Param('id') notificationId: string) {
    return this.notificationsService.markAsRead(notificationId);
  }

  @Post('register-device')
  @ApiOperation({ summary: 'Register device for push notifications' })
  async registerDevice(@Body() deviceDto: any) {
    return this.notificationsService.registerDevice(deviceDto);
  }
}
