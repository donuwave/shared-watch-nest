import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserProfileFields20260801000000
  implements MigrationInterface
{
  name = 'AddUserProfileFields20260801000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" ADD "username" character varying(32)`);
    await queryRunner.query(`ALTER TABLE "users" ADD "discriminator" character varying(4)`);
    await queryRunner.query(`ALTER TABLE "users" ADD "avatarUrl" text`);

    await queryRunner.query(`
      WITH base_users AS (
        SELECT
          "id",
          LEFT(
            COALESCE(
              NULLIF(REGEXP_REPLACE(LOWER(SPLIT_PART("email", '@', 1)), '[^a-z0-9_.-]', '_', 'g'), ''),
              'user_' || LEFT("id"::text, 8)
            ),
            32
          ) AS "baseUsername"
        FROM "users"
      ),
      numbered_users AS (
        SELECT
          "id",
          "baseUsername",
          ROW_NUMBER() OVER (PARTITION BY "baseUsername" ORDER BY "id") - 1 AS "nameIndex"
        FROM base_users
      )
      UPDATE "users"
      SET
        "username" = numbered_users."baseUsername",
        "discriminator" = LPAD((numbered_users."nameIndex" % 10000)::text, 4, '0')
      FROM numbered_users
      WHERE "users"."id" = numbered_users."id"
    `);

    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "username" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "discriminator" SET NOT NULL`);
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_users_username_discriminator" ON "users" ("username", "discriminator")`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "firstName"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "lastName"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" ADD "lastName" character varying`);
    await queryRunner.query(`ALTER TABLE "users" ADD "firstName" character varying`);
    await queryRunner.query(`DROP INDEX "public"."IDX_users_username_discriminator"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "avatarUrl"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "discriminator"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "username"`);
  }
}
