import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateEmailTokens1783361138546 implements MigrationInterface {
  name = 'CreateEmailTokens1783361138546';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "email_token" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "purpose" character varying(32) NOT NULL, "tokenHash" text NOT NULL, "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL, "usedAt" TIMESTAMP WITH TIME ZONE, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_7175dbe70853f76bcbcb1285f92" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_4b3b4942cfb0525a6157dc3f66" ON "email_token" ("userId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_edf4a4ace8fbe5fae2c423005b" ON "email_token" ("purpose") `,
    );
    await queryRunner.query(
      `ALTER TABLE "email_token" ADD CONSTRAINT "FK_4b3b4942cfb0525a6157dc3f661" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "email_token" DROP CONSTRAINT "FK_4b3b4942cfb0525a6157dc3f661"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_edf4a4ace8fbe5fae2c423005b"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_4b3b4942cfb0525a6157dc3f66"`,
    );
    await queryRunner.query(`DROP TABLE "email_token"`);
  }
}
