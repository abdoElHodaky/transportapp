import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPostGISExtension1706112000000 implements MigrationInterface {
  name = 'AddPostGISExtension1706112000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Enable PostGIS extension for geospatial queries
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "postgis"`);
    
    // Create spatial index on locations table for better performance
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_locations_spatial" 
      ON "locations" USING GIST (ST_MakePoint(longitude, latitude))
    `);
    
    // Add spatial index for service area queries
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_users_current_location_spatial" 
      ON "users" USING GIST (ST_MakePoint("currentLongitude", "currentLatitude"))
      WHERE "currentLatitude" IS NOT NULL AND "currentLongitude" IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop spatial indexes
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_locations_spatial"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_users_current_location_spatial"`);
    
    // Note: We don't drop the PostGIS extension as it might be used by other applications
    // await queryRunner.query(`DROP EXTENSION IF EXISTS "postgis"`);
  }
}
