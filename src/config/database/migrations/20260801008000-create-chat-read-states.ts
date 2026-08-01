import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateChatReadStates20260801008000 implements MigrationInterface {
  name = 'CreateChatReadStates20260801008000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "chat_read_states" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "roomId" uuid NOT NULL,
        "userId" uuid NOT NULL,
        "lastReadMessageId" uuid,
        "lastReadAt" TIMESTAMP WITH TIME ZONE,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_chat_read_states_room_user" UNIQUE ("roomId", "userId"),
        CONSTRAINT "PK_chat_read_states_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_chat_read_states_room_id"
      ON "chat_read_states" ("roomId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_chat_read_states_user_id"
      ON "chat_read_states" ("userId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_chat_read_states_last_read_message_id"
      ON "chat_read_states" ("lastReadMessageId")
    `);

    await queryRunner.query(`
      ALTER TABLE "chat_read_states"
      ADD CONSTRAINT "FK_chat_read_states_room"
      FOREIGN KEY ("roomId") REFERENCES "rooms"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "chat_read_states"
      ADD CONSTRAINT "FK_chat_read_states_user"
      FOREIGN KEY ("userId") REFERENCES "users"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "chat_read_states"
      ADD CONSTRAINT "FK_chat_read_states_last_read_message"
      FOREIGN KEY ("lastReadMessageId") REFERENCES "chat_messages"("id")
      ON DELETE SET NULL ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "chat_read_states"
      DROP CONSTRAINT "FK_chat_read_states_last_read_message"
    `);
    await queryRunner.query(`
      ALTER TABLE "chat_read_states"
      DROP CONSTRAINT "FK_chat_read_states_user"
    `);
    await queryRunner.query(`
      ALTER TABLE "chat_read_states"
      DROP CONSTRAINT "FK_chat_read_states_room"
    `);
    await queryRunner.query(`
      DROP INDEX "IDX_chat_read_states_last_read_message_id"
    `);
    await queryRunner.query(`DROP INDEX "IDX_chat_read_states_user_id"`);
    await queryRunner.query(`DROP INDEX "IDX_chat_read_states_room_id"`);
    await queryRunner.query(`DROP TABLE "chat_read_states"`);
  }
}
