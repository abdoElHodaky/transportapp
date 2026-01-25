import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../entities/user.entity';
import { Trip, TripStatus } from '../../entities/trip.entity';
import Redis from 'ioredis';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userRole?: string;
  user?: User;
}

interface LocationUpdate {
  latitude: number;
  longitude: number;
  heading?: number;
  speed?: number;
  accuracy?: number;
  timestamp: number;
}

interface TripStatusUpdate {
  tripId: string;
  status: string;
  location?: LocationUpdate;
  message?: string;
  estimatedArrival?: number;
}

interface ChatMessage {
  tripId: string;
  message: string;
  timestamp: number;
  type: 'text' | 'location' | 'system';
}

@Injectable()
@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
  namespace: '/realtime',
})
export class RealtimeGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(RealtimeGateway.name);
  private connectedUsers = new Map<string, AuthenticatedSocket>();
  private redis: Redis;
  private redisSubscriber: Redis;

  constructor(
    private jwtService: JwtService,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Trip)
    private tripRepository: Repository<Trip>,
  ) {
    // Initialize Redis for pub/sub
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT) || 6379,
      password: process.env.REDIS_PASSWORD,
    });

    this.redisSubscriber = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT) || 6379,
      password: process.env.REDIS_PASSWORD,
    });

    // Setup Redis subscriptions for cross-instance communication
    this.setupRedisSubscriptions();
  }

  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway initialized with Redis pub/sub support');
  }

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        this.logger.warn(`Client ${client.id} connected without token`);
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token);
      const user = await this.userRepository.findOne({
        where: { id: payload.sub },
      });

      if (!user) {
        this.logger.warn(`Invalid user for client ${client.id}`);
        client.disconnect();
        return;
      }

      client.userId = user.id;
      client.userRole = user.role;
      client.user = user;

      this.connectedUsers.set(client.userId, client);

      // Join user to their personal room
      await client.join(`user:${user.id}`);

      // Join drivers to driver room for broadcast messages
      if (user.role === 'driver') {
        await client.join('drivers');

        // Update driver online status
        await this.userRepository.update(user.id, {
          isOnline: true,
          lastSeen: new Date(),
        });

        // Cache driver connection
        await this.redis.setex(`driver:online:${user.id}`, 300, client.id); // 5 minutes TTL
      }

      // Join passengers to passenger room
      if (user.role === 'passenger') {
        await client.join('passengers');
      }

      // Join active trip room if user has an active trip
      const activeTrip = await this.tripRepository.findOne({
        where: [
          { passengerId: user.id, status: TripStatus.IN_PROGRESS },
          { passengerId: user.id, status: TripStatus.ACCEPTED },
          { passengerId: user.id, status: TripStatus.DRIVER_ARRIVED },
          { driverId: user.id, status: TripStatus.IN_PROGRESS },
          { driverId: user.id, status: TripStatus.ACCEPTED },
          { driverId: user.id, status: TripStatus.DRIVER_ARRIVED },
        ],
      });

      if (activeTrip) {
        await client.join(`trip:${activeTrip.id}`);

        // Send current trip status
        client.emit('trip:status', {
          tripId: activeTrip.id,
          status: activeTrip.status,
          message: 'Connected to active trip',
        });
      }

      this.logger.log(
        `Client ${client.id} connected as ${user.role} (${user.firstName})`,
      );

      // Send connection confirmation
      client.emit('connection:confirmed', {
        userId: user.id,
        role: user.role,
        timestamp: Date.now(),
      });
    } catch (error) {
      this.logger.error(`Connection error for client ${client.id}:`, error);
      client.disconnect();
    }
  }

  async handleDisconnect(client: AuthenticatedSocket) {
    if (client.userId) {
      this.connectedUsers.delete(client.userId);
      this.logger.log(
        `Client ${client.id} disconnected (User: ${client.userId})`,
      );

      // Update driver offline status
      if (client.userRole === 'driver') {
        await this.userRepository.update(client.userId, {
          isOnline: false,
          lastSeen: new Date(),
        });

        // Remove from driver cache
        await this.redis.del(`driver:online:${client.userId}`);
      }
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
    @MessageBody()
    data: {
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

    this.logger.debug(
      `Driver ${client.userId} location updated for trip ${data.tripId}`,
    );
  }

  @SubscribeMessage('location:update')
  async handleLocationUpdate(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: LocationUpdate,
  ) {
    if (!client.userId) {
      return { error: 'Not authenticated' };
    }

    try {
      // Validate location data
      if (!data.latitude || !data.longitude) {
        return { error: 'Invalid location data' };
      }

      // Broadcast location update to relevant parties
      if (client.userRole === 'driver') {
        // Find active trip for this driver
        const activeTrip = await this.tripRepository.findOne({
          where: { driverId: client.userId, status: TripStatus.IN_PROGRESS },
        });

        if (activeTrip) {
          // Send location update to passenger
          this.server
            .to(`user:${activeTrip.passengerId}`)
            .emit('driver:location', {
              tripId: activeTrip.id,
              location: data,
              timestamp: Date.now(),
            });
        }

        // Update driver location in Redis for nearby searches
        await this.redis.geoadd(
          'drivers:locations',
          data.longitude,
          data.latitude,
          client.userId,
        );
      }

      return { success: true, timestamp: Date.now() };
    } catch (error) {
      this.logger.error('Location update error:', error);
      return { error: 'Failed to update location' };
    }
  }

  @SubscribeMessage('trip:status_update')
  async handleTripStatusUpdate(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: TripStatusUpdate,
  ) {
    if (!client.userId) {
      return { error: 'Not authenticated' };
    }

    try {
      const trip = await this.tripRepository.findOne({
        where: { id: data.tripId },
        relations: ['passenger', 'driver'],
      });

      if (!trip) {
        return { error: 'Trip not found' };
      }

      // Verify user is part of this trip
      if (
        trip.passengerId !== client.userId &&
        trip.driverId !== client.userId
      ) {
        return { error: 'Not authorized for this trip' };
      }

      // Update trip status in database
      await this.tripRepository.update(data.tripId, {
        status: data.status as any,
        updatedAt: new Date(),
      });

      // Broadcast status update to all trip participants
      this.server.to(`trip:${data.tripId}`).emit('trip:status', {
        tripId: data.tripId,
        status: data.status,
        location: data.location,
        message: data.message,
        estimatedArrival: data.estimatedArrival,
        timestamp: Date.now(),
        updatedBy: client.userRole,
      });

      // Handle specific status changes
      switch (data.status) {
        case 'accepted':
          // Driver accepted trip
          if (client.userRole === 'driver') {
            // Join both users to trip room
            await client.join(`trip:${data.tripId}`);
            this.server.sockets.sockets.forEach(async (socket) => {
              if ((socket as AuthenticatedSocket).userId === trip.passengerId) {
                await socket.join(`trip:${data.tripId}`);
              }
            });
          }
          break;

        case 'driver_arrived':
          // Driver arrived at pickup location
          this.server.to(`user:${trip.passengerId}`).emit('driver:arrived', {
            tripId: data.tripId,
            driverName: trip.driver.name || trip.driver.firstName,
            vehicleInfo: `${trip.driver.vehicleModel} (${trip.driver.vehiclePlateNumber})`,
            location: data.location,
            timestamp: Date.now(),
          });
          break;

        case 'completed':
          // Trip completed
          this.server.to(`trip:${data.tripId}`).emit('trip:completed', {
            tripId: data.tripId,
            message: 'Trip completed successfully',
            timestamp: Date.now(),
          });
          break;

        case 'cancelled':
          // Trip cancelled
          this.server.to(`trip:${data.tripId}`).emit('trip:cancelled', {
            tripId: data.tripId,
            message: data.message || 'Trip was cancelled',
            timestamp: Date.now(),
          });
          break;
      }

      return { success: true, timestamp: Date.now() };
    } catch (error) {
      this.logger.error('Trip status update error:', error);
      return { error: 'Failed to update trip status' };
    }
  }

  @SubscribeMessage('trip:request')
  async handleTripRequest(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: any,
  ) {
    if (!client.userId || client.userRole !== 'passenger') {
      return { error: 'Only passengers can request trips' };
    }

    try {
      const tripRequest = {
        tripId: data.tripId,
        passengerId: client.userId,
        passengerName: client.user.firstName,
        pickup: data.pickup,
        dropoff: data.dropoff,
        estimatedFare: data.estimatedFare,
        tripType: data.tripType,
        timestamp: Date.now(),
      };

      // Broadcast to all online drivers
      this.server.to('drivers').emit('trip:new_request', tripRequest);

      // Publish to Redis for cross-instance communication
      await this.redis.publish('trip:requests', JSON.stringify(tripRequest));

      return { success: true, message: 'Trip request sent to nearby drivers' };
    } catch (error) {
      this.logger.error('Trip request error:', error);
      return { error: 'Failed to send trip request' };
    }
  }

  @SubscribeMessage('chat:message')
  async handleChatMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: ChatMessage,
  ) {
    if (!client.userId) {
      return { error: 'Not authenticated' };
    }

    try {
      const trip = await this.tripRepository.findOne({
        where: { id: data.tripId },
      });

      if (!trip) {
        return { error: 'Trip not found' };
      }

      // Verify user is part of this trip
      if (
        trip.passengerId !== client.userId &&
        trip.driverId !== client.userId
      ) {
        return { error: 'Not authorized for this trip' };
      }

      const chatMessage = {
        tripId: data.tripId,
        senderId: client.userId,
        senderRole: client.userRole,
        senderName: client.user.firstName,
        message: data.message,
        type: data.type,
        timestamp: Date.now(),
      };

      // Send message to trip participants
      this.server.to(`trip:${data.tripId}`).emit('chat:message', chatMessage);

      // Store message in Redis for chat history
      await this.redis.lpush(
        `chat:${data.tripId}`,
        JSON.stringify(chatMessage),
      );
      await this.redis.expire(`chat:${data.tripId}`, 86400); // 24 hours

      return { success: true, timestamp: Date.now() };
    } catch (error) {
      this.logger.error('Chat message error:', error);
      return { error: 'Failed to send message' };
    }
  }

  @SubscribeMessage('driver:availability')
  async handleDriverAvailability(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { available: boolean },
  ) {
    if (!client.userId || client.userRole !== 'driver') {
      return { error: 'Only drivers can update availability' };
    }

    try {
      await this.userRepository.update(client.userId, {
        isAvailable: data.available,
        lastSeen: new Date(),
      });

      if (data.available) {
        await client.join('drivers');
      } else {
        await client.leave('drivers');
        // Remove from geospatial index
        await this.redis.zrem('drivers:locations', client.userId);
      }

      return { success: true, available: data.available };
    } catch (error) {
      this.logger.error('Driver availability error:', error);
      return { error: 'Failed to update availability' };
    }
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

    this.logger.log(
      `Notified drivers about new trip request: ${tripData.tripId}`,
    );
  }

  /**
   * Notify trip participants about status updates
   */
  notifyTripStatusUpdate(
    tripId: string,
    statusData: {
      status: string;
      updatedBy: string;
      message?: string;
      estimatedArrival?: string;
    },
  ) {
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
  notifyTripAssigned(
    passengerId: string,
    tripData: {
      tripId: string;
      driver: {
        id: string;
        name: string;
        phone: string;
        rating: number;
        vehicleInfo: string;
      };
      estimatedArrival: string;
    },
  ) {
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
  notifyPaymentCompleted(
    userId: string,
    paymentData: {
      tripId: string;
      amount: number;
      method: string;
      status: string;
    },
  ) {
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
  sendNotificationToUser(
    userId: string,
    notification: {
      type: string;
      title: string;
      message: string;
      data?: any;
    },
  ) {
    this.server.to(`user:${userId}`).emit('notification', {
      ...notification,
      timestamp: new Date().toISOString(),
    });

    this.logger.log(
      `Sent notification to user ${userId}: ${notification.type}`,
    );
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

  // Admin methods for broadcasting system messages
  async broadcastSystemMessage(message: string, targetRole?: string) {
    const room = targetRole ? targetRole + 's' : undefined; // 'drivers' or 'passengers'

    if (room) {
      this.server.to(room).emit('system:message', {
        message,
        timestamp: Date.now(),
        type: 'system',
      });
    } else {
      this.server.emit('system:message', {
        message,
        timestamp: Date.now(),
        type: 'system',
      });
    }
  }

  async sendTripUpdate(tripId: string, update: any) {
    this.server.to(`trip:${tripId}`).emit('trip:update', {
      tripId,
      ...update,
      timestamp: Date.now(),
    });
  }

  private async setupRedisSubscriptions() {
    // Subscribe to trip requests for cross-instance communication
    await this.redisSubscriber.subscribe('trip:requests');
    await this.redisSubscriber.subscribe('trip:updates');
    await this.redisSubscriber.subscribe('system:broadcasts');

    this.redisSubscriber.on('message', (channel, message) => {
      try {
        const data = JSON.parse(message);

        switch (channel) {
          case 'trip:requests':
            this.server.to('drivers').emit('trip:new_request', data);
            break;
          case 'trip:updates':
            this.server.to(`trip:${data.tripId}`).emit('trip:update', data);
            break;
          case 'system:broadcasts':
            this.server.emit('system:message', data);
            break;
        }
      } catch (error) {
        this.logger.error('Redis message processing error:', error);
      }
    });
  }
}
