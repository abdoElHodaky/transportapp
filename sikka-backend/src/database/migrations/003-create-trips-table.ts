import { MigrationInterface, QueryRunner, Table, Index, ForeignKey } from 'typeorm';

export class CreateTripsTable1640000000003 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'trips',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'passengerId',
            type: 'uuid',
          },
          {
            name: 'driverId',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['requested', 'accepted', 'driver_arrived', 'in_progress', 'completed', 'cancelled'],
            default: "'requested'",
          },
          {
            name: 'type',
            type: 'enum',
            enum: ['standard', 'premium', 'shared', 'delivery'],
            default: "'standard'",
          },
          // Pickup location
          {
            name: 'pickupAddress',
            type: 'varchar',
            length: '500',
          },
          {
            name: 'pickupLatitude',
            type: 'decimal',
            precision: 10,
            scale: 8,
          },
          {
            name: 'pickupLongitude',
            type: 'decimal',
            precision: 11,
            scale: 8,
          },
          // Dropoff location
          {
            name: 'dropoffAddress',
            type: 'varchar',
            length: '500',
          },
          {
            name: 'dropoffLatitude',
            type: 'decimal',
            precision: 10,
            scale: 8,
          },
          {
            name: 'dropoffLongitude',
            type: 'decimal',
            precision: 11,
            scale: 8,
          },
          // Fare information
          {
            name: 'estimatedFare',
            type: 'decimal',
            precision: 10,
            scale: 2,
          },
          {
            name: 'actualFare',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'baseFare',
            type: 'decimal',
            precision: 10,
            scale: 2,
            default: 0,
          },
          {
            name: 'distanceFare',
            type: 'decimal',
            precision: 10,
            scale: 2,
            default: 0,
          },
          {
            name: 'timeFare',
            type: 'decimal',
            precision: 10,
            scale: 2,
            default: 0,
          },
          {
            name: 'surgeFare',
            type: 'decimal',
            precision: 10,
            scale: 2,
            default: 0,
          },
          {
            name: 'surgeMultiplier',
            type: 'decimal',
            precision: 3,
            scale: 2,
            default: 1.0,
          },
          {
            name: 'discountAmount',
            type: 'decimal',
            precision: 10,
            scale: 2,
            default: 0,
          },
          // Distance and duration
          {
            name: 'estimatedDistance',
            type: 'decimal',
            precision: 8,
            scale: 2,
          },
          {
            name: 'actualDistance',
            type: 'decimal',
            precision: 8,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'estimatedDuration',
            type: 'integer', // minutes
          },
          {
            name: 'actualDuration',
            type: 'integer', // minutes
            isNullable: true,
          },
          // Trip details
          {
            name: 'passengerNotes',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'driverNotes',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'promoCode',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          // Cancellation
          {
            name: 'cancellationReason',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'cancelledBy',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'cancellationNotes',
            type: 'text',
            isNullable: true,
          },
          // Timestamps
          {
            name: 'requestedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'driverAcceptedAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'driverArrivedAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'tripStartedAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'tripCompletedAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'cancelledAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'estimatedArrivalTime',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Create foreign key constraints
    await queryRunner.createForeignKey(
      'trips',
      new ForeignKey({
        columnNames: ['passengerId'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'trips',
      new ForeignKey({
        columnNames: ['driverId'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'trips',
      new ForeignKey({
        columnNames: ['cancelledBy'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      }),
    );

    // Create indexes
    await queryRunner.createIndex(
      'trips',
      new Index('idx_trips_passenger_id', ['passengerId']),
    );

    await queryRunner.createIndex(
      'trips',
      new Index('idx_trips_driver_id', ['driverId']),
    );

    await queryRunner.createIndex(
      'trips',
      new Index('idx_trips_status', ['status']),
    );

    await queryRunner.createIndex(
      'trips',
      new Index('idx_trips_type', ['type']),
    );

    await queryRunner.createIndex(
      'trips',
      new Index('idx_trips_pickup_location', ['pickupLatitude', 'pickupLongitude']),
    );

    await queryRunner.createIndex(
      'trips',
      new Index('idx_trips_dropoff_location', ['dropoffLatitude', 'dropoffLongitude']),
    );

    await queryRunner.createIndex(
      'trips',
      new Index('idx_trips_created_at', ['createdAt']),
    );

    await queryRunner.createIndex(
      'trips',
      new Index('idx_trips_status_created', ['status', 'createdAt']),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('trips');
  }
}

