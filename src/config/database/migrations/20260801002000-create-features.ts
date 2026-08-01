import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateFeatures20260801002000 implements MigrationInterface {
  name = 'CreateFeatures20260801002000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "features" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "key" character varying NOT NULL,
        "displayName" character varying NOT NULL,
        "description" text,
        "isActive" boolean NOT NULL DEFAULT true,
        "requiresEmailVerified" boolean NOT NULL DEFAULT false,
        "requiresUnblocked" boolean NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_features_key" UNIQUE ("key"),
        CONSTRAINT "PK_features_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_features_key" ON "features" ("key")
    `);

    await queryRunner.query(`
      CREATE TABLE "feature_roles" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "featureId" uuid NOT NULL,
        "roleId" uuid NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_feature_roles_feature_role" UNIQUE ("featureId", "roleId"),
        CONSTRAINT "PK_feature_roles_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_feature_roles_feature_id" ON "feature_roles" ("featureId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_feature_roles_role_id" ON "feature_roles" ("roleId")
    `);

    await queryRunner.query(`
      ALTER TABLE "feature_roles"
      ADD CONSTRAINT "FK_feature_roles_feature"
      FOREIGN KEY ("featureId") REFERENCES "features"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "feature_roles"
      ADD CONSTRAINT "FK_feature_roles_role"
      FOREIGN KEY ("roleId") REFERENCES "roles"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "feature_roles" DROP CONSTRAINT "FK_feature_roles_role"
    `);
    await queryRunner.query(`
      ALTER TABLE "feature_roles" DROP CONSTRAINT "FK_feature_roles_feature"
    `);
    await queryRunner.query(`DROP INDEX "IDX_feature_roles_role_id"`);
    await queryRunner.query(`DROP INDEX "IDX_feature_roles_feature_id"`);
    await queryRunner.query(`DROP TABLE "feature_roles"`);
    await queryRunner.query(`DROP INDEX "IDX_features_key"`);
    await queryRunner.query(`DROP TABLE "features"`);
  }
}
