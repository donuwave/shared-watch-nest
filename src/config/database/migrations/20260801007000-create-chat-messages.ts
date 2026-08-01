import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateChatMessages20260801007000 implements MigrationInterface {
  name = 'CreateChatMessages20260801007000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "chat_messages" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "roomId" uuid NOT NULL,
        "userId" uuid NOT NULL,
        "text" character varying(2000),
        "editedAt" TIMESTAMP WITH TIME ZONE,
        "deletedAt" TIMESTAMP WITH TIME ZONE,
        "deletedByUserId" uuid,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_chat_messages_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_chat_messages_room_id" ON "chat_messages" ("roomId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_chat_messages_user_id" ON "chat_messages" ("userId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_chat_messages_deleted_by_user_id"
      ON "chat_messages" ("deletedByUserId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_chat_messages_room_id_created_at"
      ON "chat_messages" ("roomId", "createdAt")
    `);

    await queryRunner.query(`
      ALTER TABLE "chat_messages"
      ADD CONSTRAINT "FK_chat_messages_room"
      FOREIGN KEY ("roomId") REFERENCES "rooms"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "chat_messages"
      ADD CONSTRAINT "FK_chat_messages_user"
      FOREIGN KEY ("userId") REFERENCES "users"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "chat_messages"
      ADD CONSTRAINT "FK_chat_messages_deleted_by_user"
      FOREIGN KEY ("deletedByUserId") REFERENCES "users"("id")
      ON DELETE SET NULL ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "chat_messages"
      DROP CONSTRAINT "FK_chat_messages_deleted_by_user"
    `);
    await queryRunner.query(`
      ALTER TABLE "chat_messages" DROP CONSTRAINT "FK_chat_messages_user"
    `);
    await queryRunner.query(`
      ALTER TABLE "chat_messages" DROP CONSTRAINT "FK_chat_messages_room"
    `);
    await queryRunner.query(
      `DROP INDEX "IDX_chat_messages_room_id_created_at"`,
    );
    await queryRunner.query(
      `DROP INDEX "IDX_chat_messages_deleted_by_user_id"`,
    );
    await queryRunner.query(`DROP INDEX "IDX_chat_messages_user_id"`);
    await queryRunner.query(`DROP INDEX "IDX_chat_messages_room_id"`);
    await queryRunner.query(`DROP TABLE "chat_messages"`);
  }
}
