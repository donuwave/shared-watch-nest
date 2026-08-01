import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropRoomVideoUrl20260801006000 implements MigrationInterface {
  name = 'DropRoomVideoUrl20260801006000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "rooms" DROP COLUMN "videoUrl"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "rooms" ADD "videoUrl" text`);
  }
}
