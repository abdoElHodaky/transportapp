import { MigrationInterface, QueryRunner, Table, Index, ForeignKey } from 'typeorm';

export class CreateTransactionsTable1640000000005 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'transactions',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'walletId',
            type: 'uuid',
          },
          {
            name: 'userId',
            type: 'uuid',
          },
          {
            name: 'tripId',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'paymentId',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'type',
            type: 'enum',
            enum: ['credit', 'debit', 'topup', 'withdrawal', 'refund', 'commission', 'earning'],
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['pending', 'completed', 'failed', 'cancelled'],
            default: "'pending'",
          },
          // Amount information
          {
            name: 'amount',
            type: 'decimal',
            precision: 12,
            scale: 2,
          },
          {
            name: 'balanceBefore',
            type: 'decimal',
            precision: 12,
            scale: 2,
          },
          {
            name: 'balanceAfter',
            type: 'decimal',
            precision: 12,
            scale: 2,
          },
          {
            name: 'currency',
            type: 'varchar',
            length: '3',
            default: "'SDG'",
          },
          // Transaction details
          {
            name: 'description',
            type: 'varchar',
            length: '500',
          },
          {
            name: 'reference',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'externalReference',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          // Related entities
          {
            name: 'relatedUserId',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'relatedWalletId',
            type: 'uuid',
            isNullable: true,
          },
          // Processing information
          {
            name: 'processingFee',
            type: 'decimal',
            precision: 10,
            scale: 2,
            default: 0,
          },
          {
            name: 'exchangeRate',
            type: 'decimal',
            precision: 10,
            scale: 4,
            default: 1.0,
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
      'transactions',
      new ForeignKey({
        columnNames: ['walletId'],
        referencedTableName: 'wallets',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'transactions',
      new ForeignKey({
        columnNames: ['userId'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'transactions',
      new ForeignKey({
        columnNames: ['tripId'],
        referencedTableName: 'trips',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'transactions',
      new ForeignKey({
        columnNames: ['paymentId'],
        referencedTableName: 'payments',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'transactions',
      new ForeignKey({
        columnNames: ['relatedUserId'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'transactions',
      new ForeignKey({
        columnNames: ['relatedWalletId'],
        referencedTableName: 'wallets',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      }),
    );

    // Create indexes
    await queryRunner.createIndex(
      'transactions',
      new Index('idx_transactions_wallet_id', ['walletId']),
    );

    await queryRunner.createIndex(
      'transactions',
      new Index('idx_transactions_user_id', ['userId']),
    );

    await queryRunner.createIndex(
      'transactions',
      new Index('idx_transactions_trip_id', ['tripId']),
    );

    await queryRunner.createIndex(
      'transactions',
      new Index('idx_transactions_payment_id', ['paymentId']),
    );

    await queryRunner.createIndex(
      'transactions',
      new Index('idx_transactions_type', ['type']),
    );

    await queryRunner.createIndex(
      'transactions',
      new Index('idx_transactions_status', ['status']),
    );

    await queryRunner.createIndex(
      'transactions',
      new Index('idx_transactions_reference', ['reference']),
    );

    await queryRunner.createIndex(
      'transactions',
      new Index('idx_transactions_external_reference', ['externalReference']),
    );

    await queryRunner.createIndex(
      'transactions',
      new Index('idx_transactions_created_at', ['createdAt']),
    );

    await queryRunner.createIndex(
      'transactions',
      new Index('idx_transactions_user_created', ['userId', 'createdAt']),
    );

    await queryRunner.createIndex(
      'transactions',
      new Index('idx_transactions_wallet_created', ['walletId', 'createdAt']),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('transactions');
  }
}

