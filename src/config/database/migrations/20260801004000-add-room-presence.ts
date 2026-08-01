import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRoomPresence20260801004000 implements MigrationInterface {
  name = 'AddRoomPresence20260801004000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "rooms"
      ADD "closedAt" TIMESTAMP WITH TIME ZONE
    `);

    await queryRunner.query(`
      ALTER TABLE "rooms"
      ADD "closedReason" character varying(64)
    `);

    await queryRunner.query(`
      CREATE TABLE "room_presence" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "roomId" uuid NOT NULL,
        "userId" uuid NOT NULL,
        "connectionId" character varying(128) NOT NULL,
        "connectedAt" TIMESTAMP WITH TIME ZONE NOT NULL,
        "lastSeenAt" TIMESTAMP WITH TIME ZONE NOT NULL,
        "disconnectedAt" TIMESTAMP WITH TIME ZONE,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_room_presence_room_user_connection"
          UNIQUE ("roomId", "userId", "connectionId"),
        CONSTRAINT "PK_room_presence_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_room_presence_room_id" ON "room_presence" ("roomId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_room_presence_user_id" ON "room_presence" ("userId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_room_presence_connection_id"
      ON "room_presence" ("connectionId")
    `);

    await queryRunner.query(`
      ALTER TABLE "room_presence"
      ADD CONSTRAINT "FK_room_presence_room"
      FOREIGN KEY ("roomId") REFERENCES "rooms"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "room_presence"
      ADD CONSTRAINT "FK_room_presence_user"
      FOREIGN KEY ("userId") REFERENCES "users"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "room_presence" DROP CONSTRAINT "FK_room_presence_user"
    `);
    await queryRunner.query(`
      ALTER TABLE "room_presence" DROP CONSTRAINT "FK_room_presence_room"
    `);
    await queryRunner.query(`DROP INDEX "IDX_room_presence_connection_id"`);
    await queryRunner.query(`DROP INDEX "IDX_room_presence_user_id"`);
    await queryRunner.query(`DROP INDEX "IDX_room_presence_room_id"`);
    await queryRunner.query(`DROP TABLE "room_presence"`);
    await queryRunner.query(`ALTER TABLE "rooms" DROP COLUMN "closedReason"`);
    await queryRunner.query(`ALTER TABLE "rooms" DROP COLUMN "closedAt"`);
  }
}
