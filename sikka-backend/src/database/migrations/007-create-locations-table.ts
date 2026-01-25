import {
  MigrationInterface,
  QueryRunner,
  Table,
  Index,
  ForeignKey,
  TableIndex,
  TableForeignKey,
} from 'typeorm';

export class CreateLocationsTable1640000000007 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'locations',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'userId',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'tripId',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'type',
            type: 'enum',
            enum: [
              'user_location',
              'trip_pickup',
              'trip_dropoff',
              'trip_route',
              'driver_location',
            ],
          },
          // Geographic coordinates
          {
            name: 'latitude',
            type: 'decimal',
            precision: 10,
            scale: 8,
          },
          {
            name: 'longitude',
            type: 'decimal',
            precision: 11,
            scale: 8,
          },
          {
            name: 'altitude',
            type: 'decimal',
            precision: 8,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'accuracy',
            type: 'decimal',
            precision: 8,
            scale: 2,
            isNullable: true,
          },
          // Address information
          {
            name: 'address',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'city',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'state',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'country',
            type: 'varchar',
            length: '100',
            default: "'Sudan'",
          },
          {
            name: 'postalCode',
            type: 'varchar',
            length: '20',
            isNullable: true,
          },
          // Movement data
          {
            name: 'speed',
            type: 'decimal',
            precision: 6,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'heading',
            type: 'decimal',
            precision: 5,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'bearing',
            type: 'decimal',
            precision: 5,
            scale: 2,
            isNullable: true,
          },
          // Route-specific data
          {
            name: 'routeIndex',
            type: 'integer',
            isNullable: true,
          },
          {
            name: 'distanceFromPrevious',
            type: 'decimal',
            precision: 8,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'timeFromPrevious',
            type: 'integer', // seconds
            isNullable: true,
          },
          // Location metadata
          {
            name: 'source',
            type: 'enum',
            enum: ['gps', 'network', 'manual', 'estimated'],
            default: "'gps'",
          },
          {
            name: 'isActive',
            type: 'boolean',
            default: true,
          },
          {
            name: 'batteryLevel',
            type: 'integer',
            isNullable: true,
          },
          {
            name: 'networkType',
            type: 'varchar',
            length: '20',
            isNullable: true,
          },
          // Additional data
          {
            name: 'metadata',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'notes',
            type: 'text',
            isNullable: true,
          },
          // Timestamps
          {
            name: 'recordedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
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
      'locations',
      new TableForeignKey({
        columnNames: ['userId'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'locations',
      new TableForeignKey({
        columnNames: ['tripId'],
        referencedTableName: 'trips',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      }),
    );

    // Create indexes
    await queryRunner.createIndex(
      'locations',
      new TableIndex({
        name: 'idx_locations_user_id',
        columnNames: ['userId'],
      }),
    );

    await queryRunner.createIndex(
      'locations',
      new TableIndex({
        name: 'idx_locations_trip_id',
        columnNames: ['tripId'],
      }),
    );

    await queryRunner.createIndex(
      'locations',
      new TableIndex({
        name: 'idx_locations_type',
        columnNames: ['type'],
      }),
    );

    await queryRunner.createIndex(
      'locations',
      new TableIndex({
        name: 'idx_locations_coordinates',
        columnNames: ['latitude', 'longitude'],
      }),
    );

    await queryRunner.createIndex(
      'locations',
      new TableIndex({
        name: 'idx_locations_recorded_at',
        columnNames: ['recordedAt'],
      }),
    );

    await queryRunner.createIndex(
      'locations',
      new TableIndex({
        name: 'idx_locations_active',
        columnNames: ['isActive'],
      }),
    );

    await queryRunner.createIndex(
      'locations',
      new TableIndex({
        name: 'idx_locations_user_recorded',
        columnNames: ['userId', 'recordedAt'],
      }),
    );

    await queryRunner.createIndex(
      'locations',
      new TableIndex({
        name: 'idx_locations_trip_route',
        columnNames: ['tripId', 'routeIndex'],
      }),
    );

    // Geospatial index for location queries (if PostGIS is available)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_locations_geospatial 
      ON locations USING GIST (
        ST_Point(longitude::double precision, latitude::double precision)
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('locations');
  }
}
