import {
  MigrationInterface,
  QueryRunner,
  Table,
  Index,
  ForeignKey,
  TableIndex,
  TableForeignKey,
} from 'typeorm';

export class CreateRatingsTable1640000000006 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'ratings',
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
            name: 'ratingUserId',
            type: 'uuid',
          },
          {
            name: 'ratedUserId',
            type: 'uuid',
          },
          // Overall rating
          {
            name: 'rating',
            type: 'decimal',
            precision: 2,
            scale: 1,
          },
          // Detailed ratings
          {
            name: 'serviceRating',
            type: 'decimal',
            precision: 2,
            scale: 1,
            isNullable: true,
          },
          {
            name: 'cleanlinessRating',
            type: 'decimal',
            precision: 2,
            scale: 1,
            isNullable: true,
          },
          {
            name: 'punctualityRating',
            type: 'decimal',
            precision: 2,
            scale: 1,
            isNullable: true,
          },
          {
            name: 'communicationRating',
            type: 'decimal',
            precision: 2,
            scale: 1,
            isNullable: true,
          },
          {
            name: 'safetyRating',
            type: 'decimal',
            precision: 2,
            scale: 1,
            isNullable: true,
          },
          // Comments and feedback
          {
            name: 'comment',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'compliments',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'complaints',
            type: 'json',
            isNullable: true,
          },
          // Rating metadata
          {
            name: 'isAnonymous',
            type: 'boolean',
            default: false,
          },
          {
            name: 'isVerified',
            type: 'boolean',
            default: true,
          },
          {
            name: 'isPublic',
            type: 'boolean',
            default: true,
          },
          // Moderation
          {
            name: 'isReported',
            type: 'boolean',
            default: false,
          },
          {
            name: 'isHidden',
            type: 'boolean',
            default: false,
          },
          {
            name: 'moderationNotes',
            type: 'text',
            isNullable: true,
          },
          // Response from rated user
          {
            name: 'response',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'respondedAt',
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
        ],
      }),
      true,
    );

    // Create foreign key constraints
    await queryRunner.createForeignKey(
      'ratings',
      new TableForeignKey({
        columnNames: ['tripId'],
        referencedTableName: 'trips',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'ratings',
      new TableForeignKey({
        columnNames: ['ratingUserId'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'ratings',
      new TableForeignKey({
        columnNames: ['ratedUserId'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      }),
    );

    // Create indexes
    await queryRunner.createIndex(
      'ratings',
      new TableIndex({
        name: 'idx_ratings_trip_id',
        columnNames: ['tripId'],
      }),
    );

    await queryRunner.createIndex(
      'ratings',
      new TableIndex({
        name: 'idx_ratings_rating_user_id',
        columnNames: ['ratingUserId'],
      }),
    );

    await queryRunner.createIndex(
      'ratings',
      new TableIndex({
        name: 'idx_ratings_rated_user_id',
        columnNames: ['ratedUserId'],
      }),
    );

    await queryRunner.createIndex(
      'ratings',
      new TableIndex({
        name: 'idx_ratings_rating',
        columnNames: ['rating'],
      }),
    );

    await queryRunner.createIndex(
      'ratings',
      new TableIndex({
        name: 'idx_ratings_created_at',
        columnNames: ['createdAt'],
      }),
    );

    await queryRunner.createIndex(
      'ratings',
      new TableIndex({
        name: 'idx_ratings_public_verified',
        columnNames: ['isPublic', 'isVerified'],
      }),
    );

    await queryRunner.createIndex(
      'ratings',
      new TableIndex({
        name: 'idx_ratings_rated_user_rating',
        columnNames: ['ratedUserId', 'rating'],
      }),
    );

    // Unique constraint to prevent duplicate ratings for the same trip
    await queryRunner.createIndex(
      'ratings',
      new TableIndex({
        name: 'idx_ratings_unique_trip_rating',
        columnNames: ['tripId', 'ratingUserId'],
        isUnique: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('ratings');
  }
}
