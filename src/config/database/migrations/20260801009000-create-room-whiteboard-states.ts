import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateRoomWhiteboardStates20260801009000 implements MigrationInterface {
  name = 'CreateRoomWhiteboardStates20260801009000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "room_whiteboard_states" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "roomId" uuid NOT NULL,
        "enabled" boolean NOT NULL DEFAULT false,
        "snapshot" jsonb NOT NULL DEFAULT '{"strokes":[]}'::jsonb,
        "updatedByUserId" uuid,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_room_whiteboard_states_room_id" UNIQUE ("roomId"),
        CONSTRAINT "PK_room_whiteboard_states_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_room_whiteboard_states_room_id"
      ON "room_whiteboard_states" ("roomId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_room_whiteboard_states_updated_by_user_id"
      ON "room_whiteboard_states" ("updatedByUserId")
    `);

    await queryRunner.query(`
      ALTER TABLE "room_whiteboard_states"
      ADD CONSTRAINT "FK_room_whiteboard_states_room"
      FOREIGN KEY ("roomId") REFERENCES "rooms"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "room_whiteboard_states"
      ADD CONSTRAINT "FK_room_whiteboard_states_updated_by_user"
      FOREIGN KEY ("updatedByUserId") REFERENCES "users"("id")
      ON DELETE SET NULL ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "room_whiteboard_states"
      DROP CONSTRAINT "FK_room_whiteboard_states_updated_by_user"
    `);
    await queryRunner.query(`
      ALTER TABLE "room_whiteboard_states"
      DROP CONSTRAINT "FK_room_whiteboard_states_room"
    `);
    await queryRunner.query(`
      DROP INDEX "IDX_room_whiteboard_states_updated_by_user_id"
    `);
    await queryRunner.query(`DROP INDEX "IDX_room_whiteboard_states_room_id"`);
    await queryRunner.query(`DROP TABLE "room_whiteboard_states"`);
  }
}
