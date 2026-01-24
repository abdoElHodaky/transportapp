import { MigrationInterface, QueryRunner, Table, Index, ForeignKey } from 'typeorm';

export class CreateWalletsTable1640000000002 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'wallets',
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
            isUnique: true,
          },
          {
            name: 'balance',
            type: 'decimal',
            precision: 12,
            scale: 2,
            default: 0,
          },
          {
            name: 'totalEarnings',
            type: 'decimal',
            precision: 12,
            scale: 2,
            default: 0,
          },
          {
            name: 'totalSpent',
            type: 'decimal',
            precision: 12,
            scale: 2,
            default: 0,
          },
          {
            name: 'totalTopups',
            type: 'decimal',
            precision: 12,
            scale: 2,
            default: 0,
          },
          {
            name: 'totalWithdrawals',
            type: 'decimal',
            precision: 12,
            scale: 2,
            default: 0,
          },
          {
            name: 'pendingAmount',
            type: 'decimal',
            precision: 12,
            scale: 2,
            default: 0,
          },
          {
            name: 'reservedAmount',
            type: 'decimal',
            precision: 12,
            scale: 2,
            default: 0,
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['active', 'suspended', 'frozen'],
            default: "'active'",
          },
          // Limits and restrictions
          {
            name: 'dailySpendLimit',
            type: 'decimal',
            precision: 12,
            scale: 2,
            default: 10000,
          },
          {
            name: 'monthlySpendLimit',
            type: 'decimal',
            precision: 12,
            scale: 2,
            default: 50000,
          },
          {
            name: 'dailySpentAmount',
            type: 'decimal',
            precision: 12,
            scale: 2,
            default: 0,
          },
          {
            name: 'monthlySpentAmount',
            type: 'decimal',
            precision: 12,
            scale: 2,
            default: 0,
          },
          {
            name: 'lastSpendResetDate',
            type: 'timestamp',
            isNullable: true,
          },
          // PIN and security
          {
            name: 'pin',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'pinEnabled',
            type: 'boolean',
            default: false,
          },
          {
            name: 'failedPinAttempts',
            type: 'integer',
            default: 0,
          },
          {
            name: 'pinLockedUntil',
            type: 'timestamp',
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
            name: 'lastTransactionAt',
            type: 'timestamp',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    // Create foreign key constraint
    await queryRunner.createForeignKey(
      'wallets',
      new ForeignKey({
        columnNames: ['userId'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      }),
    );

    // Create indexes
    await queryRunner.createIndex(
      'wallets',
      new Index('idx_wallets_user_id', ['userId']),
    );

    await queryRunner.createIndex(
      'wallets',
      new Index('idx_wallets_status', ['status']),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('wallets');
  }
}

