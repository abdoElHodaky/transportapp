import { MigrationInterface, QueryRunner, Table, Index, ForeignKey } from 'typeorm';

export class CreatePaymentsTable1640000000004 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'payments',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'tripId',
            type: 'uuid',
          },
          {
            name: 'payerId',
            type: 'uuid',
          },
          {
            name: 'payeeId',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'method',
            type: 'enum',
            enum: ['cash', 'wallet', 'ebs', 'cyberpay'],
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded'],
            default: "'pending'",
          },
          // Amount breakdown
          {
            name: 'amount',
            type: 'decimal',
            precision: 10,
            scale: 2,
          },
          {
            name: 'platformCommission',
            type: 'decimal',
            precision: 10,
            scale: 2,
            default: 0,
          },
          {
            name: 'driverEarnings',
            type: 'decimal',
            precision: 10,
            scale: 2,
            default: 0,
          },
          {
            name: 'discountAmount',
            type: 'decimal',
            precision: 10,
            scale: 2,
            default: 0,
          },
          {
            name: 'refundAmount',
            type: 'decimal',
            precision: 10,
            scale: 2,
            default: 0,
          },
          // Gateway information
          {
            name: 'gatewayTransactionId',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'gatewayResponse',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'gatewayFee',
            type: 'decimal',
            precision: 10,
            scale: 2,
            default: 0,
          },
          // Processing details
          {
            name: 'currency',
            type: 'varchar',
            length: '3',
            default: "'SDG'",
          },
          {
            name: 'exchangeRate',
            type: 'decimal',
            precision: 10,
            scale: 4,
            default: 1.0,
          },
          {
            name: 'description',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'failureReason',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          // Metadata
          {
            name: 'metadata',
            type: 'json',
            isNullable: true,
          },
          // Timestamps
          {
            name: 'initiatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'processedAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'completedAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'failedAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'refundedAt',
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
      'payments',
      new ForeignKey({
        columnNames: ['tripId'],
        referencedTableName: 'trips',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'payments',
      new ForeignKey({
        columnNames: ['payerId'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'payments',
      new ForeignKey({
        columnNames: ['payeeId'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      }),
    );

    // Create indexes
    await queryRunner.createIndex(
      'payments',
      new Index('idx_payments_trip_id', ['tripId']),
    );

    await queryRunner.createIndex(
      'payments',
      new Index('idx_payments_payer_id', ['payerId']),
    );

    await queryRunner.createIndex(
      'payments',
      new Index('idx_payments_payee_id', ['payeeId']),
    );

    await queryRunner.createIndex(
      'payments',
      new Index('idx_payments_method', ['method']),
    );

    await queryRunner.createIndex(
      'payments',
      new Index('idx_payments_status', ['status']),
    );

    await queryRunner.createIndex(
      'payments',
      new Index('idx_payments_gateway_transaction', ['gatewayTransactionId']),
    );

    await queryRunner.createIndex(
      'payments',
      new Index('idx_payments_created_at', ['createdAt']),
    );

    await queryRunner.createIndex(
      'payments',
      new Index('idx_payments_status_created', ['status', 'createdAt']),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('payments');
  }
}

