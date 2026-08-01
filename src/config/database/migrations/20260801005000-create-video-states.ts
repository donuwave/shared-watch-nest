import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateVideoStates20260801005000 implements MigrationInterface {
  name = 'CreateVideoStates20260801005000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "video_states" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "roomId" uuid NOT NULL,
        "sourceUrl" text NOT NULL,
        "sourceType" character varying(32) NOT NULL,
        "providerVideoId" character varying(128),
        "playing" boolean NOT NULL DEFAULT false,
        "currentTime" double precision NOT NULL DEFAULT 0,
        "duration" double precision,
        "updatedByUserId" uuid,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_video_states_room_id" UNIQUE ("roomId"),
        CONSTRAINT "PK_video_states_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_video_states_room_id" ON "video_states" ("roomId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_video_states_updated_by_user_id"
      ON "video_states" ("updatedByUserId")
    `);

    await queryRunner.query(`
      ALTER TABLE "video_states"
      ADD CONSTRAINT "FK_video_states_room"
      FOREIGN KEY ("roomId") REFERENCES "rooms"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "video_states"
      ADD CONSTRAINT "FK_video_states_updated_by_user"
      FOREIGN KEY ("updatedByUserId") REFERENCES "users"("id")
      ON DELETE SET NULL ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "video_states"
      DROP CONSTRAINT "FK_video_states_updated_by_user"
    `);
    await queryRunner.query(`
      ALTER TABLE "video_states" DROP CONSTRAINT "FK_video_states_room"
    `);
    await queryRunner.query(`DROP INDEX "IDX_video_states_updated_by_user_id"`);
    await queryRunner.query(`DROP INDEX "IDX_video_states_room_id"`);
    await queryRunner.query(`DROP TABLE "video_states"`);
  }
}
