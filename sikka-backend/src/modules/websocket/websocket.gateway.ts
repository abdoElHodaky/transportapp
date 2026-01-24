import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userRole?: string;
}

@Injectable()
@WebSocketGateway({
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  namespace: '/realtime',
})
export class WebSocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(WebSocketGateway.name);
  private connectedUsers = new Map<string, AuthenticatedSocket>();

  constructor(private jwtService: JwtService) {}

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const token = client.handshake.auth.token || client.handshake.headers.authorization?.split(' ')[1];
      
      if (!token) {
        this.logger.warn(`Client ${client.id} connected without token`);
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token);
      client.userId = payload.sub;
      client.userRole = payload.role;

      this.connectedUsers.set(client.userId, client);
      
      this.logger.log(`User ${client.userId} (${client.userRole}) connected with socket ${client.id}`);
      
      // Join user to their personal room
      client.join(`user:${client.userId}`);
      
      // Join drivers to drivers room for trip notifications
      if (client.userRole === 'driver') {
        client.join('drivers');
      }

      // Send connection confirmation
      client.emit('connected', {
        message: 'Connected successfully',
        userId: client.userId,
        role: client.userRole,
      });

    } catch (error) {
      this.logger.error(`Authentication failed for client ${client.id}:`, error.message);
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    if (client.userId) {
      this.connectedUsers.delete(client.userId);
      this.logger.log(`User ${client.userId} disconnected`);
    }
  }

  @SubscribeMessage('join_trip')
  handleJoinTrip(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { tripId: string },
  ) {
    if (!client.userId) return;

    client.join(`trip:${data.tripId}`);
    this.logger.log(`User ${client.userId} joined trip room: ${data.tripId}`);
    
    client.emit('joined_trip', {
      tripId: data.tripId,
      message: 'Joined trip room successfully',
    });
  }

  @SubscribeMessage('leave_trip')
  handleLeaveTrip(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { tripId: string },
  ) {
    if (!client.userId) return;

    client.leave(`trip:${data.tripId}`);
    this.logger.log(`User ${client.userId} left trip room: ${data.tripId}`);
    
    client.emit('left_trip', {
      tripId: data.tripId,
      message: 'Left trip room successfully',
    });
  }

  @SubscribeMessage('driver_location_update')
  handleDriverLocationUpdate(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: {
      tripId: string;
      latitude: number;
      longitude: number;
      heading?: number;
      speed?: number;
    },
  ) {
    if (!client.userId || client.userRole !== 'driver') return;

    // Broadcast location to trip participants
    this.server.to(`trip:${data.tripId}`).emit('driver_location', {
      driverId: client.userId,
      tripId: data.tripId,
      latitude: data.latitude,
      longitude: data.longitude,
      heading: data.heading,
      speed: data.speed,
      timestamp: new Date().toISOString(),
    });

    this.logger.debug(`Driver ${client.userId} location updated for trip ${data.tripId}`);
  }

  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: AuthenticatedSocket) {
    client.emit('pong', { timestamp: new Date().toISOString() });
  }

  // Public methods for service integration

  /**
   * Notify drivers about new trip requests
   */
  notifyDriversAboutNewTrip(tripData: {
    tripId: string;
    passengerId: string;
    pickup: { address: string; latitude: number; longitude: number };
    dropoff: { address: string; latitude: number; longitude: number };
    estimatedFare: number;
    estimatedDistance: number;
  }) {
    this.server.to('drivers').emit('new_trip_request', {
      type: 'new_trip_request',
      data: tripData,
      timestamp: new Date().toISOString(),
    });

    this.logger.log(`Notified drivers about new trip request: ${tripData.tripId}`);
  }

  /**
   * Notify trip participants about status updates
   */
  notifyTripStatusUpdate(tripId: string, statusData: {
    status: string;
    updatedBy: string;
    message?: string;
    estimatedArrival?: string;
  }) {
    this.server.to(`trip:${tripId}`).emit('trip_status_update', {
      type: 'trip_status_update',
      tripId,
      data: statusData,
      timestamp: new Date().toISOString(),
    });

    this.logger.log(`Trip ${tripId} status updated to: ${statusData.status}`);
  }

  /**
   * Notify user about trip assignment
   */
  notifyTripAssigned(passengerId: string, tripData: {
    tripId: string;
    driver: {
      id: string;
      name: string;
      phone: string;
      rating: number;
      vehicleInfo: string;
    };
    estimatedArrival: string;
  }) {
    this.server.to(`user:${passengerId}`).emit('trip_assigned', {
      type: 'trip_assigned',
      data: tripData,
      timestamp: new Date().toISOString(),
    });

    this.logger.log(`Notified passenger ${passengerId} about trip assignment`);
  }

  /**
   * Notify about payment completion
   */
  notifyPaymentCompleted(userId: string, paymentData: {
    tripId: string;
    amount: number;
    method: string;
    status: string;
  }) {
    this.server.to(`user:${userId}`).emit('payment_completed', {
      type: 'payment_completed',
      data: paymentData,
      timestamp: new Date().toISOString(),
    });

    this.logger.log(`Notified user ${userId} about payment completion`);
  }

  /**
   * Send general notification to user
   */
  sendNotificationToUser(userId: string, notification: {
    type: string;
    title: string;
    message: string;
    data?: any;
  }) {
    this.server.to(`user:${userId}`).emit('notification', {
      ...notification,
      timestamp: new Date().toISOString(),
    });

    this.logger.log(`Sent notification to user ${userId}: ${notification.type}`);
  }

  /**
   * Check if user is online
   */
  isUserOnline(userId: string): boolean {
    return this.connectedUsers.has(userId);
  }

  /**
   * Get online users count
   */
  getOnlineUsersCount(): number {
    return this.connectedUsers.size;
  }

  /**
   * Get online drivers count
   */
  getOnlineDriversCount(): number {
    let count = 0;
    this.connectedUsers.forEach((socket) => {
      if (socket.userRole === 'driver') count++;
    });
    return count;
  }
}

