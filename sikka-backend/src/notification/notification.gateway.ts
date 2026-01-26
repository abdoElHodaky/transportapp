import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: '/notifications',
})
export class NotificationGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationGateway.name);
  private connectedUsers = new Map<string, Socket>();

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    // Remove from connected users
    for (const [userId, socket] of this.connectedUsers.entries()) {
      if (socket.id === client.id) {
        this.connectedUsers.delete(userId);
        break;
      }
    }
  }

  @SubscribeMessage('join')
  handleJoin(
    @MessageBody() data: { userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    this.connectedUsers.set(data.userId, client);
    client.join(`user_${data.userId}`);
    this.logger.log(`User ${data.userId} joined notifications`);
  }

  @SubscribeMessage('leave')
  handleLeave(
    @MessageBody() data: { userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    this.connectedUsers.delete(data.userId);
    client.leave(`user_${data.userId}`);
    this.logger.log(`User ${data.userId} left notifications`);
  }

  // Method to send notification to specific user
  sendToUser(userId: string, notification: any) {
    this.server.to(`user_${userId}`).emit('notification', notification);
  }

  // Method to send notification to all users
  sendToAll(notification: any) {
    this.server.emit('broadcast', notification);
  }

  // Method to send notification to multiple users
  sendToUsers(userIds: string[], notification: any) {
    userIds.forEach((userId) => {
      this.sendToUser(userId, notification);
    });
  }
}
