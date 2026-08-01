import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateRooms20260801003000 implements MigrationInterface {
  name = 'CreateRooms20260801003000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "rooms" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "title" character varying(120) NOT NULL,
        "videoUrl" text NOT NULL,
        "createdByUserId" uuid NOT NULL,
        "isOpen" boolean NOT NULL DEFAULT true,
        "isTemporary" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_rooms_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_rooms_created_by_user_id" ON "rooms" ("createdByUserId")
    `);

    await queryRunner.query(`
      CREATE TABLE "room_participants" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "roomId" uuid NOT NULL,
        "userId" uuid NOT NULL,
        "role" character varying(24) NOT NULL,
        "displayNameSnapshot" character varying(80) NOT NULL,
        "joinedAt" TIMESTAMP WITH TIME ZONE NOT NULL,
        "leftAt" TIMESTAMP WITH TIME ZONE,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_room_participants_room_user" UNIQUE ("roomId", "userId"),
        CONSTRAINT "PK_room_participants_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_room_participants_room_id" ON "room_participants" ("roomId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_room_participants_user_id" ON "room_participants" ("userId")
    `);

    await queryRunner.query(`
      CREATE TABLE "room_invites" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "roomId" uuid NOT NULL,
        "code" character varying(64) NOT NULL,
        "expiresAt" TIMESTAMP WITH TIME ZONE,
        "maxUses" integer,
        "usedCount" integer NOT NULL DEFAULT 0,
        "isActive" boolean NOT NULL DEFAULT true,
        "createdByUserId" uuid NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_room_invites_code" UNIQUE ("code"),
        CONSTRAINT "PK_room_invites_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_room_invites_room_id" ON "room_invites" ("roomId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_room_invites_code" ON "room_invites" ("code")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_room_invites_created_by_user_id"
      ON "room_invites" ("createdByUserId")
    `);

    await queryRunner.query(`
      ALTER TABLE "rooms"
      ADD CONSTRAINT "FK_rooms_created_by_user"
      FOREIGN KEY ("createdByUserId") REFERENCES "users"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "room_participants"
      ADD CONSTRAINT "FK_room_participants_room"
      FOREIGN KEY ("roomId") REFERENCES "rooms"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "room_participants"
      ADD CONSTRAINT "FK_room_participants_user"
      FOREIGN KEY ("userId") REFERENCES "users"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "room_invites"
      ADD CONSTRAINT "FK_room_invites_room"
      FOREIGN KEY ("roomId") REFERENCES "rooms"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "room_invites"
      ADD CONSTRAINT "FK_room_invites_created_by_user"
      FOREIGN KEY ("createdByUserId") REFERENCES "users"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "room_invites" DROP CONSTRAINT "FK_room_invites_created_by_user"
    `);
    await queryRunner.query(`
      ALTER TABLE "room_invites" DROP CONSTRAINT "FK_room_invites_room"
    `);
    await queryRunner.query(`
      ALTER TABLE "room_participants" DROP CONSTRAINT "FK_room_participants_user"
    `);
    await queryRunner.query(`
      ALTER TABLE "room_participants" DROP CONSTRAINT "FK_room_participants_room"
    `);
    await queryRunner.query(`
      ALTER TABLE "rooms" DROP CONSTRAINT "FK_rooms_created_by_user"
    `);

    await queryRunner.query(`DROP INDEX "IDX_room_invites_created_by_user_id"`);
    await queryRunner.query(`DROP INDEX "IDX_room_invites_code"`);
    await queryRunner.query(`DROP INDEX "IDX_room_invites_room_id"`);
    await queryRunner.query(`DROP TABLE "room_invites"`);

    await queryRunner.query(`DROP INDEX "IDX_room_participants_user_id"`);
    await queryRunner.query(`DROP INDEX "IDX_room_participants_room_id"`);
    await queryRunner.query(`DROP TABLE "room_participants"`);

    await queryRunner.query(`DROP INDEX "IDX_rooms_created_by_user_id"`);
    await queryRunner.query(`DROP TABLE "rooms"`);
  }
}
