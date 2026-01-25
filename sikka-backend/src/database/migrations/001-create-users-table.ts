import { MigrationInterface, QueryRunner, Table, Index, TableIndex } from 'typeorm';

export class CreateUsersTable1640000000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'users',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'phone',
            type: 'varchar',
            length: '20',
            isUnique: true,
          },
          {
            name: 'name',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'email',
            type: 'varchar',
            length: '255',
            isNullable: true,
            isUnique: true,
          },
          {
            name: 'password',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'role',
            type: 'enum',
            enum: ['passenger', 'driver', 'admin'],
            default: "'passenger'",
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['active', 'inactive', 'suspended', 'pending_verification'],
            default: "'pending_verification'",
          },
          {
            name: 'phoneVerified',
            type: 'boolean',
            default: false,
          },
          {
            name: 'profilePicture',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'rating',
            type: 'decimal',
            precision: 3,
            scale: 2,
            default: 0,
          },
          {
            name: 'totalTrips',
            type: 'integer',
            default: 0,
          },
          {
            name: 'isOnline',
            type: 'boolean',
            default: false,
          },
          {
            name: 'isAvailable',
            type: 'boolean',
            default: false,
          },
          // Driver-specific fields
          {
            name: 'vehicleType',
            type: 'enum',
            enum: ['sedan', 'suv', 'hatchback', 'motorcycle', 'truck'],
            isNullable: true,
          },
          {
            name: 'vehicleModel',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'vehiclePlateNumber',
            type: 'varchar',
            length: '20',
            isNullable: true,
          },
          {
            name: 'vehicleColor',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'drivingLicenseNumber',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'vehicleRegistrationNumber',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          // Location fields
          {
            name: 'currentLatitude',
            type: 'decimal',
            precision: 10,
            scale: 8,
            isNullable: true,
          },
          {
            name: 'currentLongitude',
            type: 'decimal',
            precision: 11,
            scale: 8,
            isNullable: true,
          },
          {
            name: 'currentAddress',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          // OTP fields
          {
            name: 'otpCode',
            type: 'varchar',
            length: '6',
            isNullable: true,
          },
          {
            name: 'otpExpiresAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'otpAttempts',
            type: 'integer',
            default: 0,
          },
          // Refresh token
          {
            name: 'refreshToken',
            type: 'text',
            isNullable: true,
          },
          // Timestamps
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
          {
            name: 'lastLoginAt',
            type: 'timestamp',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    // Create indexes
    await queryRunner.createIndex(
      'users',
      new TableIndex({
        name: 'idx_users_phone',
        columnNames: ['phone'],
      }),
    );

    await queryRunner.createIndex(
      'users',
      new TableIndex({
        name: 'idx_users_email',
        columnNames: ['email'],
      }),
    );

    await queryRunner.createIndex(
      'users',
      new TableIndex({
        name: 'idx_users_role_status',
        columnNames: ['role', 'status'],
      }),
    );

    await queryRunner.createIndex(
      'users',
      new TableIndex({
        name: 'idx_users_location',
        columnNames: ['currentLatitude', 'currentLongitude'],
      }),
    );

    await queryRunner.createIndex(
      'users',
      new TableIndex({
        name: 'idx_users_online_available',
        columnNames: ['isOnline', 'isAvailable'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('users');
  }
}
