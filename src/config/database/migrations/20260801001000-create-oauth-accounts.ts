import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateOAuthAccounts20260801001000 implements MigrationInterface {
  name = 'CreateOAuthAccounts20260801001000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "oauth_accounts" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "provider" character varying(32) NOT NULL,
        "providerUserId" character varying(128) NOT NULL,
        "email" character varying,
        "username" character varying(64),
        "avatarUrl" text,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_oauth_accounts_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_oauth_accounts_userId" ON "oauth_accounts" ("userId")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_oauth_accounts_provider_providerUserId" ON "oauth_accounts" ("provider", "providerUserId")`,
    );
    await queryRunner.query(`
      ALTER TABLE "oauth_accounts"
      ADD CONSTRAINT "FK_oauth_accounts_userId_users_id"
      FOREIGN KEY ("userId") REFERENCES "users"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "oauth_accounts" DROP CONSTRAINT "FK_oauth_accounts_userId_users_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_oauth_accounts_provider_providerUserId"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_oauth_accounts_userId"`);
    await queryRunner.query(`DROP TABLE "oauth_accounts"`);
  }
}
